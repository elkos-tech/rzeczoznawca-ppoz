/* =====================================================================
   Rzeczoznawca PPOŻ – warstwa serwerowa (Supabase)
   ---------------------------------------------------------------------
   Udostępnia window.Cloud. Jeżeli cloud-config.js nie jest wypełniony
   albo biblioteka się nie wczytała, Cloud.configured === false i cała
   aplikacja działa dalej w trybie offline (jak przed dodaniem serwera).
   ===================================================================== */
(function () {
  "use strict";

  const CFG = window.CLOUD_CONFIG || {};
  const LIB = window.supabase;                       // vendor/supabase.js (UMD)
  const ok = !!(CFG.url && CFG.anonKey && LIB && LIB.createClient);

  const Cloud = window.Cloud = {
    configured: !!ok,
    ready: false,            // true po pierwszym sprawdzeniu sesji
    client: null,
    user: null,              // obiekt użytkownika Supabase albo null
    profile: null,           // { id, nick }
    isAdmin: false,
    lastError: null,
    myCategory: CFG.myCategory || "✍️ Moje pytania",
    publicCategory: CFG.publicCategory || "🌍 Pytania społeczności",
    googleEnabled: !!CFG.google
  };

  // ---------- powiadamianie aplikacji o zmianach ----------
  const listeners = [];
  Cloud.onChange = fn => { listeners.push(fn); return fn; };
  function emit(what) { listeners.forEach(fn => { try { fn(what); } catch (e) {} }); }

  if (!ok) {
    Cloud.ready = true;
    Cloud.init = () => Promise.resolve(false);
    Cloud.reason = !LIB ? "Nie wczytano biblioteki vendor/supabase.js."
      : "Pusty adres lub klucz w pliku cloud-config.js.";
    return;
  }

  Cloud.client = LIB.createClient(CFG.url, CFG.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  // ---------- tłumaczenie komunikatów błędów ----------
  const MSG = [
    [/invalid login credentials/i, "Nieprawidłowy e-mail lub hasło."],
    [/email not confirmed/i, "Konto nie zostało potwierdzone — sprawdź skrzynkę e-mail."],
    [/user already registered|already been registered/i, "Na ten e-mail jest już założone konto."],
    [/password should be at least (\d+)/i, "Hasło musi mieć co najmniej $1 znaków."],
    [/unable to validate email|invalid email/i, "Nieprawidłowy adres e-mail."],
    [/for security purposes.*(\d+) seconds/i, "Zbyt wiele prób — odczekaj $1 s."],
    [/duplicate key.*nick|profiles_nick_key/i, "Ten pseudonim jest już zajęty."],
    [/violates row-level security/i, "Brak uprawnień do tej operacji."],
    [/failed to fetch|networkerror|load failed/i, "Brak połączenia z serwerem."],
    [/signups? not allowed|disabled/i, "Rejestracja jest wyłączona w panelu Supabase."],
    [/provider is not enabled/i, "Logowanie Google nie jest włączone w panelu Supabase."]
  ];
  function human(err) {
    if (!err) return null;
    const raw = err.message || err.error_description || String(err);
    for (const [re, out] of MSG) {
      const m = raw.match(re);
      if (m) return out.replace("$1", m[1] || "");
    }
    return raw;
  }
  function fail(err) { Cloud.lastError = human(err); throw new Error(Cloud.lastError); }

  // ---------- sesja / profil ----------
  async function loadIdentity(session) {
    Cloud.user = (session && session.user) || null;
    Cloud.profile = null;
    Cloud.isAdmin = false;
    if (!Cloud.user) return;

    const { data: prof } = await Cloud.client
      .from("profiles").select("id, nick").eq("id", Cloud.user.id).maybeSingle();

    if (prof) Cloud.profile = prof;
    else {
      // awaryjnie: trigger w bazie nie zadziałał – zakładamy profil z aplikacji
      const base = (Cloud.user.email || "uzytkownik").split("@")[0].slice(0, 24) || "uzytkownik";
      const nick = base.length < 2 ? base + "_u" : base;
      const { data } = await Cloud.client.from("profiles")
        .insert({ id: Cloud.user.id, nick: nick + "_" + Math.floor(Math.random() * 900 + 100) })
        .select("id, nick").maybeSingle();
      Cloud.profile = data || { id: Cloud.user.id, nick: nick };
    }

    const { data: adm } = await Cloud.client
      .from("admins").select("user_id").eq("user_id", Cloud.user.id).maybeSingle();
    Cloud.isAdmin = !!adm;
  }

  Cloud.init = async function () {
    try {
      const { data } = await Cloud.client.auth.getSession();
      await loadIdentity(data && data.session);
    } catch (e) { Cloud.lastError = human(e); }
    Cloud.ready = true;
    emit("ready");

    // UWAGA: callback nie może czekać (await) na inne wywołania Supabase –
    // biblioteka trzyma wtedy blokadę sesji i wszystko się zawiesza
    // (m.in. przycisk „Wyloguj”). Dlatego właściwą pracę odkładamy przez setTimeout.
    Cloud.client.auth.onAuthStateChange((event, session) => {
      // sesję początkową obsłużyliśmy już wyżej; odświeżenie tokenu nic nie zmienia
      if (event === "INITIAL_SESSION") return;
      if (event === "TOKEN_REFRESHED" && Cloud.user) return;
      setTimeout(async () => {
        try { await loadIdentity(session); } catch (e) { Cloud.lastError = human(e); }
        emit(Cloud.user ? "login" : "logout");
      }, 0);
    });
    return !!Cloud.user;
  };

  // ---------- rejestracja / logowanie ----------
  Cloud.signUp = async function (email, password, nick) {
    const { data, error } = await Cloud.client.auth.signUp({
      email: String(email).trim(),
      password: password,
      options: {
        data: { nick: String(nick || "").trim() || undefined },
        emailRedirectTo: redirectUrl()
      }
    });
    if (error) fail(error);
    // gdy w panelu włączone potwierdzanie e-maila, sesji jeszcze nie ma
    return { needsConfirm: !(data && data.session), user: data && data.user };
  };

  Cloud.signIn = async function (email, password) {
    const { error } = await Cloud.client.auth
      .signInWithPassword({ email: String(email).trim(), password: password });
    if (error) fail(error);
    return true;
  };

  Cloud.signInGoogle = async function () {
    const { error } = await Cloud.client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl() }
    });
    if (error) fail(error);
    return true;
  };

  Cloud.signOut = async function () {
    Cloud.user = null; Cloud.profile = null; Cloud.isAdmin = false;
    // wylogowanie lokalne; nie czekamy na serwer dłużej niż 3 s
    await Promise.race([
      Cloud.client.auth.signOut({ scope: "local" }).catch(() => {}),
      new Promise(r => setTimeout(r, 3000))
    ]);
    // gdyby biblioteka nie zdążyła – usuwamy zapisaną sesję ręcznie
    try {
      Object.keys(localStorage)
        .filter(k => /^sb-.*-auth-token/.test(k))
        .forEach(k => localStorage.removeItem(k));
    } catch (e) {}
    emit("logout");
  };

  Cloud.resetPassword = async function (email) {
    const { error } = await Cloud.client.auth
      .resetPasswordForEmail(String(email).trim(), { redirectTo: redirectUrl() });
    if (error) fail(error);
    return true;
  };

  Cloud.changePassword = async function (password) {
    const { error } = await Cloud.client.auth.updateUser({ password: password });
    if (error) fail(error);
    return true;
  };

  Cloud.setNick = async function (nick) {
    nick = String(nick || "").trim();
    if (nick.length < 2 || nick.length > 32) throw new Error("Pseudonim: od 2 do 32 znaków.");
    const { data, error } = await Cloud.client.from("profiles")
      .update({ nick: nick }).eq("id", Cloud.user.id).select("id, nick").maybeSingle();
    if (error) fail(error);
    Cloud.profile = data; emit("profile");
    return data;
  };

  function redirectUrl() {
    // powrót na tę samą stronę (bez #hash, żeby nie wylądować w środku testu)
    return location.origin + location.pathname;
  }

  // ---------- postęp nauki ----------
  Cloud.pullProgress = async function () {
    const { data, error } = await Cloud.client
      .from("progress").select("data, updated_at").eq("user_id", Cloud.user.id).maybeSingle();
    if (error) fail(error);
    return data ? { data: data.data || {}, updated: data.updated_at } : null;
  };

  Cloud.pushProgress = async function (state) {
    const { error } = await Cloud.client.from("progress").upsert({
      user_id: Cloud.user.id,
      data: state,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    if (error) fail(error);
    return true;
  };

  /* Scalanie postępów z dwóch urządzeń. Liczniki rosną (bierzemy większy),
     oznaczenia „trudne” się sumują, harmonogram powtórek – ten dalszy. */
  Cloud.mergeProgress = function (local, remote) {
    const a = local || {}, b = remote || {};
    const out = Object.assign({}, b, a);
    const num = (x, y) => Math.max(Number(x) || 0, Number(y) || 0);

    out.seen = {};
    const ids = new Set([...Object.keys(a.seen || {}), ...Object.keys(b.seen || {})]);
    ids.forEach(id => {
      const x = (a.seen || {})[id] || {}, y = (b.seen || {})[id] || {};
      out.seen[id] = { correct: num(x.correct, y.correct), wrong: num(x.wrong, y.wrong), last: num(x.last, y.last) };
    });

    out.flagged = Object.assign({}, b.flagged || {}, a.flagged || {});
    Object.keys(out.flagged).forEach(k => { if (!out.flagged[k]) delete out.flagged[k]; });

    out.srs = {};
    const sids = new Set([...Object.keys(a.srs || {}), ...Object.keys(b.srs || {})]);
    sids.forEach(id => {
      const x = (a.srs || {})[id], y = (b.srs || {})[id];
      out.srs[id] = (!y || (x && (x.due || 0) >= (y.due || 0))) ? x : y;
    });

    out.examsTaken = num(a.examsTaken, b.examsTaken);
    out.examsPassed = num(a.examsPassed, b.examsPassed);
    out.bestScore = (a.bestScore == null && b.bestScore == null)
      ? null : num(a.bestScore, b.bestScore);
    out.theme = a.theme !== undefined ? a.theme : b.theme;   // motyw zawsze lokalny
    return out;
  };

  // ---------- pytania użytkowników ----------
  const SELECT = "id, author_id, question, opt_a, opt_b, opt_c, answer, explanation," +
                 " legal, category, status, review_note, created_at, updated_at," +
                 " profiles ( nick )";

  /* Wiersz z bazy -> obiekt pytania w formacie aplikacji */
  function toQuestion(row) {
    const mine = Cloud.user && row.author_id === Cloud.user.id;
    return {
      id: "c" + row.id,
      dbId: row.id,
      q: row.question,
      options: { a: row.opt_a, b: row.opt_b, c: row.opt_c },
      answer: row.answer,
      explanation: row.explanation || null,
      legal: row.legal || [],
      verified: false,
      category: mine ? Cloud.myCategory : Cloud.publicCategory,
      userCategory: row.category,
      isUser: true,
      isMine: !!mine,
      status: row.status,
      reviewNote: row.review_note || null,
      authorNick: (row.profiles && row.profiles.nick) || (mine && Cloud.profile ? Cloud.profile.nick : "—"),
      createdAt: row.created_at
    };
  }
  Cloud.toQuestion = toQuestion;

  /* Pytania do nauki: moje (dowolny status) + zatwierdzone cudze.
     RLS w bazie i tak nie wypuści prywatnych pytań innych osób. */
  Cloud.loadQuestions = async function () {
    const { data, error } = await Cloud.client.from("questions")
      .select(SELECT)
      .or("author_id.eq." + Cloud.user.id + ",status.eq.approved")
      .order("id", { ascending: true });
    if (error) fail(error);
    return (data || []).map(toQuestion);
  };

  Cloud.pendingQuestions = async function () {
    const { data, error } = await Cloud.client.from("questions")
      .select(SELECT).eq("status", "pending").order("created_at", { ascending: true });
    if (error) fail(error);
    return (data || []).map(toQuestion);
  };

  function payload(f) {
    const legal = (f.legal || []).map(s => String(s).trim()).filter(Boolean).slice(0, 10);
    return {
      question: String(f.q || "").trim(),
      opt_a: String(f.a || "").trim(),
      opt_b: String(f.b || "").trim(),
      opt_c: String(f.c || "").trim(),
      answer: f.answer,
      explanation: String(f.explanation || "").trim() || null,
      legal: legal,
      category: String(f.category || "").trim() || "Pytania użytkowników",
      status: f.wantPublic ? "pending" : "private"
    };
  }

  Cloud.validate = function (f) {
    const q = String(f.q || "").trim();
    if (q.length < 10) return "Treść pytania: co najmniej 10 znaków.";
    if (q.length > 2000) return "Treść pytania: maksymalnie 2000 znaków.";
    for (const k of ["a", "b", "c"]) {
      const v = String(f[k] || "").trim();
      if (!v) return "Uzupełnij odpowiedź " + k + ").";
      if (v.length > 600) return "Odpowiedź " + k + "): maksymalnie 600 znaków.";
    }
    if (!["a", "b", "c"].includes(f.answer)) return "Zaznacz, która odpowiedź jest poprawna.";
    if (String(f.explanation || "").length > 5000) return "Objaśnienie: maksymalnie 5000 znaków.";
    return null;
  };

  Cloud.createQuestion = async function (f) {
    const bad = Cloud.validate(f); if (bad) throw new Error(bad);
    const row = Object.assign(payload(f), { author_id: Cloud.user.id });
    const { data, error } = await Cloud.client.from("questions").insert(row).select(SELECT).maybeSingle();
    if (error) fail(error);
    return toQuestion(data);
  };

  Cloud.updateQuestion = async function (dbId, f) {
    const bad = Cloud.validate(f); if (bad) throw new Error(bad);
    const row = Object.assign(payload(f), { review_note: null });
    const { data, error } = await Cloud.client.from("questions")
      .update(row).eq("id", dbId).select(SELECT).maybeSingle();
    if (error) fail(error);
    return toQuestion(data);
  };

  Cloud.deleteQuestion = async function (dbId) {
    const { error } = await Cloud.client.from("questions").delete().eq("id", dbId);
    if (error) fail(error);
    return true;
  };

  /* Moderacja (tylko admin – RLS odrzuci próbę z innego konta) */
  Cloud.moderate = async function (dbId, status, note) {
    const { data, error } = await Cloud.client.from("questions")
      .update({ status: status, review_note: note || null })
      .eq("id", dbId).select(SELECT).maybeSingle();
    if (error) fail(error);
    return data ? toQuestion(data) : null;
  };
})();
