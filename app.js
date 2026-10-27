/* ===== Rzeczoznawca PPOŻ – logika aplikacji ===== */
(function () {
  "use strict";

  // ---------- Dane ----------
  const RAW = (window.QUESTIONS || []).slice();
  const ANS = window.ANSWERS || {};
  // Scal pytania z odpowiedziami/objaśnieniami
  const BASE = RAW.map(q => {
    const a = ANS[q.id] || {};
    return {
      id: q.id, q: q.q, options: q.options, category: q.category,
      answer: a.answer || null,
      explanation: a.explanation || null,
      legal: a.legal || [],
      verified: !!a.verified
    };
  });
  // Nowe pytania autorskie (poza oficjalnym zestawem) – klucz i objaśnienie są w nich zawarte
  (window.QUESTIONS_NEW || []).forEach(n => {
    BASE.push({
      id: n.id, q: n.q, options: n.options, category: n.category,
      answer: n.answer || null, explanation: n.explanation || null,
      legal: n.legal || [], verified: !!n.verified,
      isNew: true, source: n.source || ""
    });
  });

  // Pytania z serwera (własne + zatwierdzone społeczności) – dociągane po zalogowaniu
  let CLOUDQ = [];
  let Q = [], BY_ID = {}, ANSWERED = [], NEWQ = [], MINEQ = [], PUBQ = [], CATEGORIES = [];
  function rebuild() {
    Q = BASE.concat(CLOUDQ);
    BY_ID = {}; Q.forEach(q => BY_ID[q.id] = q);
    ANSWERED = Q.filter(q => q.answer);            // pytania z kluczem odpowiedzi
    NEWQ = Q.filter(q => q.isNew);                 // pytania autorskie (★ NOWE)
    MINEQ = CLOUDQ.filter(q => q.isMine);          // moje własne pytania
    PUBQ = CLOUDQ.filter(q => !q.isMine);          // zatwierdzone pytania innych osób
    CATEGORIES = [...new Set(Q.map(q => q.category))];
  }
  rebuild();

  // Oficjalne zasady egzaminu (część pisemna)
  const EXAM = { count: 40, minutes: 40, pass: 21, pointCorrect: 1, pointWrong: -1, pointBlank: 0 };

  // ---------- Trwały stan (localStorage) ----------
  const LS_KEY = "rzppoz_state_v1";
  const defaultState = () => ({
    seen: {},          // id -> {correct:int, wrong:int, last:ts}
    flagged: {},       // id -> true (trudne / do powtórki)
    srs: {},           // id -> {box:1..5, due:ts}  (Leitner)
    examsTaken: 0, examsPassed: 0, bestScore: null,
    theme: null,       // 'light' | 'dark' | null(auto)
    owner: null        // id konta, do którego należy ten postęp (null = nauka bez logowania)
  });
  let S = load();
  function load() {
    try { const s = JSON.parse(localStorage.getItem(LS_KEY)); return s ? Object.assign(defaultState(), s) : defaultState(); }
    catch (e) { return defaultState(); }
  }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {} schedulePush(); }

  // ---------- Synchronizacja postępu z serwerem ----------
  // Zapis lokalny jest natychmiastowy; na serwer wysyłamy z opóźnieniem,
  // żeby seria kliknięć w teście nie generowała dziesiątek żądań.
  let pushTimer = null;
  let syncState = "off";                    // off | pending | ok | error
  function cloudUser() { return window.Cloud && window.Cloud.user ? window.Cloud : null; }
  function schedulePush() {
    const C = cloudUser(); if (!C) return;
    syncState = "pending";
    clearTimeout(pushTimer);
    pushTimer = setTimeout(flushPush, 2500);
  }
  function flushPush() {
    const C = cloudUser(); if (!C) return Promise.resolve();
    clearTimeout(pushTimer);
    return C.pushProgress(S).then(() => { syncState = "ok"; })
      .catch(() => { syncState = "error"; });
  }
  // wyjście ze strony / przejście w tło – domknij wysyłkę
  window.addEventListener("visibilitychange", () => { if (document.hidden) flushPush(); });
  window.addEventListener("pagehide", flushPush);

  // Pobranie postępu z serwera i scalenie z lokalnym (nauka na dwóch urządzeniach)
  async function syncDown() {
    const C = cloudUser(); if (!C) return;
    try {
      const remote = await C.pullProgress();
      const rdata = (remote && remote.data && Object.keys(remote.data).length) ? remote.data : null;
      const theme = S.theme;

      if (!S.owner || S.owner === C.user.id) {
        // ten sam użytkownik (albo postęp z nauki bez logowania) – scalamy
        if (rdata) S = Object.assign(defaultState(), C.mergeProgress(S, rdata));
      } else {
        // na tym urządzeniu uczył się ktoś inny – nie mieszamy postępów obu osób
        S = Object.assign(defaultState(), rdata || {});
      }
      S.theme = theme;                 // motyw zawsze pozostaje ustawieniem urządzenia
      S.owner = C.user.id;
      try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
      applyTheme();

      await C.pushProgress(S);
      syncState = "ok";
    } catch (e) { syncState = "error"; }
  }

  // Pobranie pytań użytkownika z serwera
  async function syncQuestions() {
    const C = cloudUser();
    if (!C) { CLOUDQ = []; rebuild(); return; }
    try { CLOUDQ = await C.loadQuestions(); }
    catch (e) { CLOUDQ = []; }
    rebuild();
  }

  // ---------- Motyw ----------
  const themeBtn = document.getElementById("themeBtn");
  function applyTheme() {
    if (S.theme) document.documentElement.setAttribute("data-theme", S.theme);
    else document.documentElement.removeAttribute("data-theme");
    themeBtn.textContent = S.theme === "dark" ? "☀" : (S.theme === "light" ? "☾" : "◐");
  }
  themeBtn.onclick = () => { S.theme = S.theme === "dark" ? "light" : (S.theme === "light" ? null : "dark"); save(); applyTheme(); };
  applyTheme();

  // ---------- Pomocnicze ----------
  const app = document.getElementById("app");
  const homeBtn = document.getElementById("homeBtn");
  const topTitle = document.getElementById("topTitle");
  homeBtn.onclick = () => go("home");
  const esc = s => (s == null ? "" : String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
  function setTop(title, showHome) { topTitle.textContent = title; homeBtn.classList.toggle("show", !!showHome); }

  // stan przeglądania (tryb nauki)
  let study = { list: [], idx: 0, revealed: false, title: "" };
  let exam = null;

  // ---------- Router ----------
  let VIEW = "home", VIEW_ARG = null;
  function go(view, arg) {
    VIEW = view; VIEW_ARG = arg;
    window.scrollTo(0, 0);
    if (view === "home") renderHome();
    else if (view === "study-setup") renderStudySetup();
    else if (view === "study") startStudy(arg);
    else if (view === "categories") renderCategories();
    else if (view === "exam-setup") renderExamSetup();
    else if (view === "exam") renderExam();
    else if (view === "stats") renderStats();
    else if (view === "srs") startSrs();
    else if (view === "acts") renderActs();
    else if (view === "about") renderAbout();
    else if (view === "account") renderAccount();
    else if (view === "myq") renderMyQuestions();
    else if (view === "qedit") renderQEdit(arg);
    else if (view === "moderate") renderModerate();
  }

  // ---------- Ekran główny ----------
  function renderHome() {
    setTop("Rzeczoznawca PPOŻ", false);
    exam = null;
    const doneIds = Object.keys(S.seen).filter(id => BY_ID[id]).length;
    const flagged = Object.keys(S.flagged).filter(id => S.flagged[id] && BY_ID[id]).length;
    const dueCount = srsDue().length;
    const C = window.Cloud || {};
    const logged = !!C.user;
    app.innerHTML = `
      <div class="intro">
        <h2>Nauka do egzaminu na rzeczoznawcę ds. zabezpieczeń ppoż.</h2>
        <p>Baza <b>${Q.length}</b> pytań z części pisemnych egzaminów (KG PSP, lata 2015–2026). Część pytań ma już opracowane objaśnienia i przypisy prawne — pozostałe uzupełniane są partiami.</p>
        <div class="stat-row">
          <span class="chip">Objaśnione: <b>${ANSWERED.length}</b>/${Q.length}</span>
          <span class="chip">Przerobione: <b>${doneIds}</b></span>
          <span class="chip">Do powtórki: <b>${dueCount}</b></span>
          <span class="chip">Trudne: <b>${flagged}</b></span>
          ${CLOUDQ.length ? `<span class="chip">Pytania użytkowników: <b>${CLOUDQ.length}</b></span>` : ""}
        </div>
      </div>
      <div class="grid">
        ${card("📚", "Nauka", "Wybierz dział, kolejność (po kolei / losowo) i przeglądaj pytania.", "study-setup")}
        ${card("📝", "Egzamin próbny", `Test ${EXAM.count} pytań, ${EXAM.minutes} min, próg zaliczenia ${EXAM.pass} pkt.`, "exam-setup")}
        ${card("🗂️", "Kategorie / działy", "Ucz się tematami: ewakuacja, odporność ogniowa, instalacje…", "categories")}
        ${card("🔁", "Powtórki", `Powtórz błędne i trudne pytania (${dueCount} zaplanowanych).`, "srs")}
        ${card("📊", "Statystyki", "Twoje postępy i skuteczność w podziale na działy.", "stats")}
        ${card("✍️", "Moje pytania", logged
            ? `Dodawaj własne pytania (${MINEQ.length}) — prywatne albo udostępnione innym.`
            : "Twórz własne pytania — wymaga zalogowania.", "myq")}
        ${card("👤", logged ? "Konto: " + esc((C.profile && C.profile.nick) || "") : "Konto / logowanie",
            logged ? "Profil, synchronizacja postępu między urządzeniami, hasło."
                   : "Zaloguj się, aby mieć postęp na telefonie i komputerze.", "account")}
        ${C.isAdmin ? card("🛡️", "Do zatwierdzenia", "Moderacja pytań zgłoszonych jako publiczne.", "moderate") : ""}
        ${card("⚖️", "Akty prawne", "Wykaz aktów, z których pochodzą odpowiedzi — z linkami do ISAP.", "acts")}
        ${card("ℹ️", "O aplikacji i egzaminie", "Zasady egzaminu, źródła, zastrzeżenia.", "about")}
      </div>
      <p class="footer-note">Materiał pomocniczy do nauki. Zawsze weryfikuj odpowiedzi z aktualnym stanem prawnym.</p>`;
    app.querySelectorAll("[data-go]").forEach(el => el.onclick = () => go(el.dataset.go, el.dataset.arg));
  }
  const card = (ico, h, p, view, arg) =>
    `<div class="menu-card" data-go="${view}" ${arg ? `data-arg="${arg}"` : ""}>
      <div class="ico">${ico}</div><div><h3>${h}</h3><p>${p}</p></div></div>`;

  // ---------- Ekran startowy nauki ----------
  function renderStudySetup() {
    setTop("Nauka", true);
    const counts = {};
    CATEGORIES.forEach(c => counts[c] = Q.filter(q => q.category === c).length);
    app.innerHTML = `
      <div class="intro">
        <h2>Nauka – ustawienia</h2>
        <p>Wybierz dział tematyczny i kolejność pytań. W trybie nauki widzisz poprawną odpowiedź, objaśnienie i przypis prawny.</p>
      </div>
      <div class="field">
        <label>Dział</label>
        <select id="stCat">
          <option value="">Wszystkie działy (${Q.length})</option>
          <option value="__new__">★ Tylko nowe pytania (${NEWQ.length})</option>
          ${CATEGORIES.map(c => `<option value="${esc(c)}">${esc(c)} (${counts[c]})</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Kolejność</label>
        <select id="stOrder">
          <option value="seq">Po kolei (wg numeru)</option>
          <option value="rnd" selected>Losowa kolejność</option>
        </select>
      </div>
      <div class="field">
        <label><input type="checkbox" id="stLimitOn"> Ogranicz liczbę pytań</label>
        <input type="number" id="stLimit" min="1" max="${Q.length}" value="20" disabled>
      </div>
      <button class="btn" id="stStart">Rozpocznij naukę</button>`;
    const limitOn = document.getElementById("stLimitOn");
    const limitInput = document.getElementById("stLimit");
    limitOn.onchange = () => { limitInput.disabled = !limitOn.checked; };
    document.getElementById("stStart").onclick = () => {
      startStudy({
        category: document.getElementById("stCat").value || null,
        random: document.getElementById("stOrder").value === "rnd",
        limit: limitOn.checked ? parseInt(limitInput.value, 10) || null : null
      });
    };
  }

  // ---------- Tryb nauki ----------
  function startStudy(scope) {
    let list, title, random = false;
    if (scope && typeof scope === "object") {
      // z ekranu ustawień nauki
      const cat = scope.category;
      if (cat === "__new__") { list = NEWQ.slice(); title = "★ Nowe pytania"; }
      else { list = cat ? Q.filter(q => q.category === cat) : Q.slice(); title = cat || "Nauka – wszystkie"; }
      random = !!scope.random;
      if (random) list = shuffle(list);
      if (scope.limit && scope.limit < list.length) list = list.slice(0, scope.limit);
      const tags = [];
      if (random) tags.push("losowo");
      if (scope.limit) tags.push(list.length + " pyt.");
      if (tags.length) title += " (" + tags.join(", ") + ")";
    }
    else if (scope === "all") { list = Q; title = "Nauka – wszystkie"; }
    else if (scope === "flagged") { list = Q.filter(q => S.flagged[q.id]); title = "Trudne pytania"; }
    else if (scope && scope.indexOf("cat:") === 0) {
      const c = scope.slice(4); list = Q.filter(q => q.category === c); title = c;
    } else { list = Q; title = "Nauka"; }
    if (!list.length) { alert("Brak pytań w tym zestawie."); return go("home"); }
    study = { list, idx: 0, revealed: false, title };
    renderStudy();
  }
  function renderStudy() {
    setTop(study.title, true);
    const q = study.list[study.idx];
    app.innerHTML = questionCard(q, {
      mode: "study", revealed: study.revealed, chosen: null,
      index: study.idx + 1, total: study.list.length
    }) + studyNav(q);
    wireQuestion(q, choice => {
      study.revealed = true; study.chosen = choice;
      recordSeen(q, choice === q.answer);
      renderStudyReveal(q, choice);
    });
    wireStudyNav(q);
  }
  function renderStudyReveal(q, choice) {
    // przerysuj z odsłoniętą odpowiedzią, zachowując wybór
    setTop(study.title, true);
    app.innerHTML = questionCard(q, { mode: "study", revealed: true, chosen: choice, index: study.idx + 1, total: study.list.length }) + studyNav(q);
    wireStudyNav(q);
  }
  function studyNav(q) {
    const flagged = !!S.flagged[q.id];
    return `<div class="nav-row">
      <div class="btn-row">
        <button class="btn secondary" id="prevBtn" ${study.idx === 0 ? "disabled" : ""}>‹ Poprz.</button>
        <button class="btn secondary" id="nextBtn" ${study.idx === study.list.length - 1 ? "disabled" : ""}>Nast. ›</button>
      </div>
      <div class="mark-btns">
        <button class="icon-toggle ${flagged ? "active" : ""}" id="flagBtn">${flagged ? "★ Trudne" : "☆ Oznacz"}</button>
        ${!study.revealed ? `<button class="icon-toggle" id="revealBtn">Pokaż odpowiedź</button>` : ""}
      </div>
    </div>`;
  }
  function wireStudyNav(q) {
    const prev = document.getElementById("prevBtn"), next = document.getElementById("nextBtn");
    if (prev) prev.onclick = () => { if (study.idx > 0) { study.idx--; study.revealed = false; study.chosen = null; renderStudy(); } };
    if (next) next.onclick = () => { if (study.idx < study.list.length - 1) { study.idx++; study.revealed = false; study.chosen = null; renderStudy(); } };
    const flag = document.getElementById("flagBtn");
    if (flag) flag.onclick = () => { S.flagged[q.id] = !S.flagged[q.id]; if (!S.flagged[q.id]) delete S.flagged[q.id]; save(); flag.classList.toggle("active"); flag.textContent = S.flagged[q.id] ? "★ Trudne" : "☆ Oznacz"; };
    const rev = document.getElementById("revealBtn");
    if (rev) rev.onclick = () => { study.revealed = true; renderStudyReveal(q, study.chosen || null); };
  }

  // ---------- Render pojedynczego pytania ----------
  function questionCard(q, o) {
    const opts = ["a", "b", "c"].map(k => {
      let cls = "opt";
      if (o.revealed) {
        if (q.answer === k) cls += " correct";
        else if (o.chosen === k) cls += " wrong";
        cls += " disabled";
      } else if (o.mode === "exam" && o.chosen === k) { cls += " correct"; }
      return `<button class="${cls}" data-k="${k}"><span class="letter">${k})</span><span>${esc(q.options[k])}</span></button>`;
    }).join("");

    let explain = "";
    if (o.revealed) explain = explainBlock(q);

    const verBadge = (q.answer && !q.isUser) ? (q.verified
      ? `<span class="badge-ver">✔ zweryfikowane</span>`
      : `<span class="badge-unv">△ do weryfikacji</span>`) : "";
    const newBadge = q.isNew
      ? `<span class="badge-new" title="Pytanie autorskie – spoza oficjalnego zestawu KG PSP">★ NOWE${q.source ? " · " + esc(q.source) : ""}</span>`
      : "";
    const userBadge = q.isUser ? userQBadge(q) : "";
    const num = q.isUser ? "własne #" + q.dbId : "id " + q.id;

    return `<div class="qwrap">
      <div class="qmeta">
        <span class="cat">${esc(q.category)}</span>
        ${newBadge}
        ${userBadge}
        ${verBadge}
        <span class="num">${o.index ? `${o.index} / ${o.total}` : "#" + q.id} · ${num}</span>
      </div>
      <div class="qtext">${esc(q.q)}</div>
      <div class="options">${opts}</div>
      ${explain}
    </div>`;
  }
  // Oznaczenia pytań użytkowników
  const STATUS_LABEL = {
    private:  { t: "🔒 prywatne", c: "badge-priv" },
    pending:  { t: "⏳ czeka na akceptację", c: "badge-unv" },
    approved: { t: "🌍 publiczne", c: "badge-pub" },
    rejected: { t: "✘ odrzucone", c: "badge-rej" }
  };
  function userQBadge(q) {
    const s = STATUS_LABEL[q.status] || STATUS_LABEL.private;
    const who = q.isMine ? "" : " · aut. " + esc(q.authorNick);
    return `<span class="badge-user" title="Pytanie użytkownika – spoza oficjalnego zestawu KG PSP">✍️ UŻYTKOWNIKA${who}</span>`
      + (q.isMine ? `<span class="${s.c}">${s.t}</span>` : "");
  }

  function explainBlock(q) {
    if (!q.answer) {
      return `<div class="pending">⏳ Objaśnienie i przypis prawny dla tego pytania są w przygotowaniu. Skorzystaj z trybu przeglądania, aby zapoznać się z treścią.</div>`;
    }
    const legal = (q.legal || []).map(l => {
      const a = (window.actLink && window.actLink(l)) || null;
      const txt = esc(l);
      if (a) {
        const href = a.local || a.url;
        const src = a.local ? esc(a.short) + " — PDF ↓" : esc(a.short) + " ↗";
        return `<div class="lg"><a href="${href}" target="_blank" rel="noopener noreferrer">${txt}</a><span class="lg-src">${src}</span></div>`;
      }
      return `<div class="lg">${txt}</div>`;
    }).join("");
    return `<div class="explain">
      <div class="ans">Poprawna odpowiedź: <span class="lit">${q.answer}) ${esc(q.options[q.answer])}</span></div>
      ${q.explanation ? `<h4>Objaśnienie</h4><p>${esc(q.explanation)}</p>` : ""}
      ${quoteBlock(q)}
      ${legal ? `<div class="legal"><h4>Podstawa prawna</h4>${legal}</div>` : ""}
      ${q.isUser
        ? `<p class="note">✍️ Pytanie dodane przez użytkownika${q.isMine ? " (Ciebie)" : " " + esc(q.authorNick)} — nie pochodzi z oficjalnego zestawu KG PSP. Odpowiada za nie autor pytania.</p>`
          + (q.isMine && q.status === "rejected" && q.reviewNote
              ? `<p class="pending">Zgłoszenie do publikacji odrzucone. Uwaga moderatora: ${esc(q.reviewNote)}</p>` : "")
        : (!q.verified ? `<p class="note">△ Odpowiedź wstępna – zweryfikuj z aktualnym aktem prawnym.</p>` : "")}
    </div>`;
  }
  // Dosłowne cytaty z aktów prawnych (quotes.js – generowane z PDF-ów w akty/)
  function quoteBlock(q) {
    const qs = (window.QUOTES && window.QUOTES[q.id]) || [];
    if (!qs.length) return "";
    const items = qs.map(qt => {
      if (qt.kind === "akt") {
        const a = (window.ACT_BY_KEY || {})[qt.act];
        const src = a ? esc(a.short) : esc(qt.act);
        const href = a ? (a.local || a.url) : null;
        const cap = href
          ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${esc(qt.label)} — ${src}</a>`
          : `${esc(qt.label)} — ${src}`;
        return `<figure class="quote"><blockquote>${esc(qt.text)}</blockquote><figcaption>${cap}</figcaption></figure>`;
      }
      if (qt.kind === "norma")
        return `<div class="quote-na">Cytat niedostępny: <b>${esc(qt.ref)}</b> — Polska Norma jest dokumentem płatnym (prawa PKN), treści nie wolno tu przytaczać.</div>`;
      return `<div class="quote-na">Cytat niedostępny w aplikacji: <b>${esc(qt.ref)}</b> — akt prawa UE.</div>`;
    }).join("");
    return `<div class="quotes"><h4>Cytat z przepisu</h4>${items}</div>`;
  }

  function wireQuestion(q, onChoose) {
    app.querySelectorAll(".opt").forEach(btn => {
      btn.onclick = () => { if (!q.answer && study && study.mode !== "exam") { /* still allow reveal */ } onChoose(btn.dataset.k); };
    });
  }

  function recordSeen(q, correct) {
    const s = S.seen[q.id] || { correct: 0, wrong: 0, last: 0 };
    if (correct) s.correct++; else s.wrong++;
    s.last = Date.now(); S.seen[q.id] = s;
    // aktualizacja SRS (Leitner) tylko dla pytań z kluczem
    if (q.answer) {
      const box = (S.srs[q.id] && S.srs[q.id].box) || 1;
      const nb = correct ? Math.min(5, box + 1) : 1;
      S.srs[q.id] = { box: nb, due: Date.now() + boxDelay(nb) };
    }
    save();
  }
  function boxDelay(box) { return [0, 1, 3, 7, 16, 40][box] * 24 * 3600 * 1000; }
  function srsDue() {
    const now = Date.now();
    return ANSWERED.filter(q => {
      const r = S.srs[q.id];
      if (r) return r.due <= now && r.box < 5;
      return S.flagged[q.id] || (S.seen[q.id] && S.seen[q.id].wrong > 0);
    });
  }

  // ---------- Powtórki (SRS) ----------
  function startSrs() {
    const due = srsDue();
    if (!due.length) {
      setTop("Powtórki", true);
      app.innerHTML = `<div class="intro"><h2>Brak zaplanowanych powtórek 🎉</h2>
        <p>Powtórki pojawią się tu po błędnych odpowiedziach lub po oznaczeniu pytań jako trudne. Wróć później albo poucz się w trybie nauki.</p></div>
        <button class="btn" id="b">Do menu</button>`;
      document.getElementById("b").onclick = () => go("home"); return;
    }
    study = { list: shuffle(due), idx: 0, revealed: false, title: "Powtórki (" + due.length + ")" };
    renderStudy();
  }

  // ---------- Kategorie ----------
  function renderCategories() {
    setTop("Kategorie / działy", true);
    const rows = CATEGORIES.map(c => {
      const all = Q.filter(q => q.category === c);
      const seen = all.filter(q => S.seen[q.id]).length;
      const pct = Math.round(seen / all.length * 100);
      return `<div class="cat-item" data-cat="${esc(c)}">
        <div style="flex:1">
          <div class="cname">${esc(c)}</div>
          <div class="bar"><span style="width:${pct}%"></span></div>
        </div>
        <span class="cnt">${seen}/${all.length}</span>
      </div>`;
    }).join("");
    app.innerHTML = `<p class="note" style="margin-bottom:12px">Wybierz dział, aby uczyć się tematycznie. Pasek pokazuje, ile pytań już przerobiłeś.</p><div class="cat-list">${rows}</div>`;
    app.querySelectorAll(".cat-item").forEach(el => el.onclick = () => startStudy("cat:" + el.dataset.cat));
  }

  // ---------- Egzamin ----------
  function renderExamSetup() {
    setTop("Egzamin próbny", true);
    const pool = ANSWERED.length;
    const canFull = pool >= EXAM.count;
    app.innerHTML = `
      <div class="intro">
        <h2>Egzamin próbny</h2>
        <p>Część pisemna egzaminu: <b>${EXAM.count} pytań</b>, czas <b>${EXAM.minutes} min</b>, próg zaliczenia <b>${EXAM.pass} pkt</b>. Punktacja: poprawna +1, błędna −1, brak 0 (zgodnie z zasadą sumowania punktów ujemnych).</p>
        <p class="note">Losowane są wyłącznie pytania z opracowanym kluczem odpowiedzi (obecnie ${pool}).</p>
      </div>
      <div class="field">
        <label>Liczba pytań</label>
        <select id="cnt">
          ${[10, 20, 40].filter(n => n <= Math.max(10, pool)).map(n => `<option value="${n}" ${n === Math.min(EXAM.count, pool) ? "selected" : ""}>${n}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Dział</label>
        <select id="cat"><option value="">Wszystkie działy</option><option value="__new__">★ Tylko nowe pytania (${NEWQ.length})</option>${CATEGORIES.map(c => `<option>${esc(c)}</option>`).join("")}</select>
      </div>
      <div class="field">
        <label><input type="checkbox" id="timed" checked> Z limitem czasu (${EXAM.minutes} min)</label>
      </div>
      <button class="btn" id="startExam" ${pool === 0 ? "disabled" : ""}>Rozpocznij egzamin</button>
      ${pool === 0 ? `<p class="pending" style="margin-top:14px">Brak pytań z kluczem odpowiedzi. Uzupełnij plik answers.js.</p>` : ""}
      ${!canFull && pool > 0 ? `<p class="note" style="margin-top:12px">Uwaga: w bazie jest ${pool} objaśnionych pytań — pełny 40-pytaniowy test będzie dostępny po uzupełnieniu klucza.</p>` : ""}`;
    document.getElementById("startExam").onclick = () => {
      const cnt = parseInt(document.getElementById("cnt").value, 10);
      const cat = document.getElementById("cat").value;
      const timed = document.getElementById("timed").checked;
      let pool2 = cat === "__new__"
        ? ANSWERED.filter(q => q.isNew)
        : ANSWERED.filter(q => !cat || q.category === cat);
      if (!pool2.length) return alert("Brak objaśnionych pytań w tym dziale.");
      const list = shuffle(pool2).slice(0, Math.min(cnt, pool2.length));
      exam = { list, idx: 0, answers: {}, timed, timeLeft: EXAM.minutes * 60, finished: false, tId: null };
      go("exam");
    };
  }

  function renderExam() {
    if (!exam) return go("exam-setup");
    if (exam.finished) return renderExamResult();
    setTop("Egzamin " + (exam.idx + 1) + "/" + exam.list.length, true);
    const q = exam.list[exam.idx];
    const chosen = exam.answers[q.id] || null;
    app.innerHTML = `
      <div class="exam-top">
        ${exam.timed ? `<span class="timer" id="timer">${fmtTime(exam.timeLeft)}</span>` : ""}
        <button class="btn ghost" id="finishBtn" style="margin-left:auto">Zakończ i sprawdź</button>
      </div>
      <div class="progress-dots">${exam.list.map((qq, i) =>
        `<span class="dot ${exam.answers[qq.id] ? "answered" : ""} ${i === exam.idx ? "current" : ""}" data-i="${i}">${i + 1}</span>`).join("")}</div>
      ${questionCard(q, { mode: "exam", revealed: false, chosen, index: exam.idx + 1, total: exam.list.length })}
      <div class="nav-row">
        <div class="btn-row">
          <button class="btn secondary" id="prevBtn" ${exam.idx === 0 ? "disabled" : ""}>‹ Poprz.</button>
          <button class="btn" id="nextBtn">${exam.idx === exam.list.length - 1 ? "Ostatnie" : "Nast. ›"}</button>
        </div>
      </div>`;
    // wybór odpowiedzi (bez odsłaniania poprawnej)
    app.querySelectorAll(".opt").forEach(btn => btn.onclick = () => {
      exam.answers[q.id] = btn.dataset.k; renderExam();
    });
    app.querySelectorAll(".dot").forEach(d => d.onclick = () => { exam.idx = parseInt(d.dataset.i, 10); renderExam(); });
    const prev = document.getElementById("prevBtn"), next = document.getElementById("nextBtn");
    prev.onclick = () => { if (exam.idx > 0) { exam.idx--; renderExam(); } };
    next.onclick = () => { if (exam.idx < exam.list.length - 1) { exam.idx++; renderExam(); } else finishExam(); };
    document.getElementById("finishBtn").onclick = () => { if (confirm("Zakończyć egzamin i sprawdzić wynik?")) finishExam(); };
    if (exam.timed) startTimer();
  }
  function startTimer() {
    if (exam.tId) clearInterval(exam.tId);
    exam.tId = setInterval(() => {
      exam.timeLeft--;
      const t = document.getElementById("timer");
      if (t) { t.textContent = fmtTime(exam.timeLeft); t.classList.toggle("warn", exam.timeLeft <= 60); }
      if (exam.timeLeft <= 0) { clearInterval(exam.tId); finishExam(); }
    }, 1000);
  }
  const fmtTime = s => { const m = Math.floor(s / 60), r = s % 60; return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`; };

  function finishExam() {
    if (exam.tId) clearInterval(exam.tId);
    exam.finished = true;
    // punktacja + zapis SRS
    let pts = 0, correct = 0, wrong = 0, blank = 0;
    exam.list.forEach(q => {
      const ch = exam.answers[q.id];
      if (!ch) { blank++; pts += EXAM.pointBlank; }
      else if (ch === q.answer) { correct++; pts += EXAM.pointCorrect; recordSeen(q, true); }
      else { wrong++; pts += EXAM.pointWrong; recordSeen(q, false); }
    });
    exam.score = { pts, correct, wrong, blank };
    const passed = pts >= EXAM.pass && exam.list.length >= EXAM.count;
    S.examsTaken++; if (pts >= EXAM.pass) S.examsPassed++;
    if (S.bestScore == null || pts > S.bestScore) S.bestScore = pts;
    save();
    renderExamResult();
  }
  function renderExamResult() {
    setTop("Wynik egzaminu", true);
    const sc = exam.score;
    const pass = sc.pts >= EXAM.pass;
    const full = exam.list.length >= EXAM.count;
    app.innerHTML = `
      <div class="result-hero ${pass ? "pass" : "fail"}">
        <div class="score">${sc.pts} pkt</div>
        <div class="verdict">${pass ? "Wynik pozytywny ✔" : "Wynik negatywny ✘"}</div>
        <div class="sub">${full ? `Próg zaliczenia: ${EXAM.pass} pkt` : `Test skrócony (${exam.list.length} pyt.) – tylko trening`}</div>
      </div>
      <div class="qwrap" style="margin-top:14px">
        <div class="kv"><span>Poprawne</span><b style="color:var(--ok)">${sc.correct} × +1</b></div>
        <div class="kv"><span>Błędne</span><b style="color:var(--bad)">${sc.wrong} × −1</b></div>
        <div class="kv"><span>Bez odpowiedzi</span><b>${sc.blank}</b></div>
        <div class="kv"><span>Skuteczność</span><b>${Math.round(sc.correct / exam.list.length * 100)}%</b></div>
      </div>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn" id="review">Przejrzyj odpowiedzi</button>
        <button class="btn secondary" id="again">Nowy egzamin</button>
        <button class="btn ghost" id="home2">Menu</button>
      </div>`;
    document.getElementById("review").onclick = () => {
      study = { list: exam.list, idx: 0, revealed: true, title: "Przegląd egzaminu" };
      // pokaż z zaznaczeniem wyboru użytkownika
      study.examAnswers = exam.answers;
      renderReview();
    };
    document.getElementById("again").onclick = () => go("exam-setup");
    document.getElementById("home2").onclick = () => go("home");
  }
  function renderReview() {
    setTop(study.title + " " + (study.idx + 1) + "/" + study.list.length, true);
    const q = study.list[study.idx];
    const chosen = study.examAnswers[q.id] || null;
    app.innerHTML = questionCard(q, { mode: "study", revealed: true, chosen, index: study.idx + 1, total: study.list.length }) +
      `<div class="nav-row"><div class="btn-row">
        <button class="btn secondary" id="prevBtn" ${study.idx === 0 ? "disabled" : ""}>‹ Poprz.</button>
        <button class="btn secondary" id="nextBtn" ${study.idx === study.list.length - 1 ? "disabled" : ""}>Nast. ›</button>
      </div><span class="note">${chosen ? (chosen === q.answer ? "Twoja odpowiedź: poprawna ✔" : "Twoja odpowiedź: " + chosen + ") – błędna ✘") : "Bez odpowiedzi"}</span></div>`;
    const prev = document.getElementById("prevBtn"), next = document.getElementById("nextBtn");
    if (prev) prev.onclick = () => { if (study.idx > 0) { study.idx--; renderReview(); } };
    if (next) next.onclick = () => { if (study.idx < study.list.length - 1) { study.idx++; renderReview(); } };
  }

  // ---------- Statystyki ----------
  function renderStats() {
    setTop("Statystyki", true);
    const seenIds = Object.keys(S.seen).filter(id => BY_ID[id]);
    let tc = 0, tw = 0; seenIds.forEach(id => { tc += S.seen[id].correct; tw += S.seen[id].wrong; });
    const acc = (tc + tw) ? Math.round(tc / (tc + tw) * 100) : 0;
    const perCat = CATEGORIES.map(c => {
      const all = Q.filter(q => q.category === c);
      let cc = 0, cw = 0, seen = 0;
      all.forEach(q => { const s = S.seen[q.id]; if (s) { seen++; cc += s.correct; cw += s.wrong; } });
      const a = (cc + cw) ? Math.round(cc / (cc + cw) * 100) : 0;
      return { c, total: all.length, seen, acc: a };
    }).sort((x, y) => y.seen - x.seen);
    app.innerHTML = `
      <div class="qwrap">
        <div class="kv"><span>Egzaminy próbne</span><b>${S.examsTaken} (zaliczone: ${S.examsPassed})</b></div>
        <div class="kv"><span>Najlepszy wynik</span><b>${S.bestScore == null ? "–" : S.bestScore + " pkt"}</b></div>
        <div class="kv"><span>Przerobione pytania</span><b>${seenIds.length}/${Q.length}</b></div>
        <div class="kv"><span>Skuteczność ogólna</span><b>${acc}%</b></div>
        <div class="kv"><span>Trudne (oznaczone)</span><b>${Object.keys(S.flagged).length}</b></div>
      </div>
      <h3 class="section-title" style="margin-top:20px">Skuteczność wg działów</h3>
      <div class="cat-list">
        ${perCat.map(p => `<div class="cat-item" data-cat="${esc(p.c)}">
          <div style="flex:1"><div class="cname">${esc(p.c)}</div>
          <div class="bar"><span style="width:${p.acc}%; background:${p.acc >= 60 ? "var(--ok)" : "var(--warn)"}"></span></div></div>
          <span class="cnt">${p.seen ? p.acc + "%" : "–"} · ${p.seen}/${p.total}</span></div>`).join("")}
      </div>
      <div class="btn-row" style="margin-top:20px">
        <button class="btn secondary" id="reset">Wyczyść postępy</button>
      </div>`;
    app.querySelectorAll(".cat-item").forEach(el => el.onclick = () => startStudy("cat:" + el.dataset.cat));
    document.getElementById("reset").onclick = () => { if (confirm("Na pewno wyczyścić cały postęp nauki?")) { S = defaultState(); save(); go("stats"); } };
  }

  // ---------- Akty prawne ----------
  function renderActs() {
    setTop("Akty prawne", true);
    const actCount = {}, normSet = {};
    let euCount = 0;
    Q.forEach(q => {
      const seen = new Set();
      (q.legal || []).forEach(l => {
        const a = window.actLink && window.actLink(l);
        if (!a) return;
        if (a.kind === "norma") { normSet[a.code] = (normSet[a.code] || 0) + 1; }
        else if (a.kind === "ue") { euCount++; }
        else if (!seen.has(a.key)) { seen.add(a.key); actCount[a.key] = (actCount[a.key] || 0) + 1; }
      });
    });
    const list = (window.ACTS_LIST || []);
    const row = a => {
      const href = a.local || a.url;
      const primary = a.local
        ? `<a class="act-link" href="${a.local}" target="_blank" rel="noopener noreferrer">Pobrany PDF (offline) ↓</a> · <a class="act-link" href="${a.url}" target="_blank" rel="noopener noreferrer">ISAP ↗</a>`
        : `<a class="act-link" href="${a.url}" target="_blank" rel="noopener noreferrer">ISAP ↗</a>`;
      return `<div class="act-item">
        <div class="act-main"><a href="${href}" target="_blank" rel="noopener noreferrer">${esc(a.name)}</a>
          <div class="act-meta">${esc(a.short)} · odwołań w bazie: <b>${actCount[a.key] || 0}</b><br>${primary}</div>
        </div></div>`;
    };
    const ustawy = list.filter(a => a.kind === "ustawa" && actCount[a.key]).map(row).join("");
    const rozp = list.filter(a => a.kind === "rozp" && actCount[a.key]).map(row).join("");
    const norms = Object.keys(normSet).sort((x, y) => normSet[y] - normSet[x]);
    const normRows = norms.map(code => {
      const nl = window.normLink(code);
      return `<div class="act-item"><div class="act-main">
        <a href="${nl.url}" target="_blank" rel="noopener noreferrer">${esc(code)}</a>
        <div class="act-meta">Polska Norma (płatna, katalog PKN) · odwołań: <b>${normSet[code]}</b> · <span class="act-link">PKN ↗</span></div>
      </div></div>`;
    }).join("");

    app.innerHTML = `
      <div class="intro">
        <h2>Akty prawne, z których pochodzą odpowiedzi</h2>
        <p>Ustawy i rozporządzenia są <b>dołączone do aplikacji jako pliki PDF</b> (teksty jednolite/oficjalne) — działają <b>offline</b>. Kliknij nazwę lub „Pobrany PDF". Dodatkowo podano link do <b>ISAP</b> (zawsze aktualny tekst online). W objaśnieniach każdy przypis prawny też otwiera dołączony dokument.</p>
        <p class="note">Polskie Normy (PN/PKN, PN-EN, CEN/TS) są dokumentami <b>płatnymi</b> — nie można ich dołączyć; linki prowadzą do katalogu PKN.</p>
      </div>
      ${ustawy ? `<h3 class="section-title">Ustawy</h3><div class="act-list">${ustawy}</div>` : ""}
      ${rozp ? `<h3 class="section-title" style="margin-top:20px">Rozporządzenia</h3><div class="act-list">${rozp}</div>` : ""}
      ${euCount ? `<h3 class="section-title" style="margin-top:20px">Prawo Unii Europejskiej</h3><div class="act-list"><div class="act-item"><div class="act-main"><a href="https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX:32014L0034" target="_blank" rel="noopener noreferrer">Dyrektywa ATEX 2014/34/UE</a><div class="act-meta">urządzenia w atmosferze wybuchowej · odwołań: <b>${euCount}</b> · EUR-Lex ↗</div></div></div></div>` : ""}
      ${norms ? `<h3 class="section-title" style="margin-top:20px">Polskie Normy i specyfikacje (PKN)</h3><div class="act-list">${normRows}</div>` : ""}
      <p class="footer-note">Przy odpowiedziach „△ do weryfikacji" sprawdź wartość bezpośrednio w powołanym akcie.</p>`;
  }

  // ---------- O aplikacji ----------
  function renderAbout() {
    setTop("O aplikacji", true);
    app.innerHTML = `
      <div class="intro">
        <h2>O egzaminie</h2>
        <p>Egzamin dla osób ubiegających się o przyznanie prawa do wykonywania zawodu rzeczoznawcy do spraw zabezpieczeń przeciwpożarowych przeprowadza Komendant Główny PSP. Część pisemna to test <b>40 pytań</b> (jedna z trzech odpowiedzi), czas <b>40 min</b>, wynik pozytywny od <b>21 pkt</b> (suma punktów za poprawne odpowiedzi pomniejszona o punkty ujemne za błędne).</p>
      </div>
      <div class="intro">
        <h2>Źródło pytań</h2>
        <p>Treści pytań pochodzą z oficjalnego dokumentu KG PSP „Treści pytań egzaminacyjnych z części pisemnych egzaminów… 2015–2026” (${Q.length} pytań). Dokument zawiera wyłącznie treści pytań — <b>bez klucza odpowiedzi</b>. Odpowiedzi i objaśnienia są opracowaniem pomocniczym.</p>
      </div>
      <div class="intro">
        <h2>Podstawowe akty prawne</h2>
        <p class="note">• Ustawa z 24.08.1991 r. o ochronie przeciwpożarowej (t.j. Dz.U. 2025 poz. 188)<br>
        • Ustawa z 7.07.1994 r. – Prawo budowlane<br>
        • Rozp. MI z 12.04.2002 r. w sprawie warunków technicznych, jakim powinny odpowiadać budynki i ich usytuowanie (WT)<br>
        • Rozp. MSWiA z 7.06.2010 r. w sprawie ochrony przeciwpożarowej budynków, innych obiektów budowlanych i terenów<br>
        • Rozp. MSWiA z 24.07.2009 r. w sprawie przeciwpożarowego zaopatrzenia w wodę oraz dróg pożarowych<br>
        • Rozp. MSWiA z 2.12.2015 r. w sprawie egzaminu na rzeczoznawcę (Dz.U. 2015 poz. 2083)</p>
      </div>
      <div class="intro" style="border-color:var(--warn)">
        <h2>⚠ Zastrzeżenie</h2>
        <p>To materiał pomocniczy do nauki, a nie oficjalny klucz odpowiedzi. Odpowiedzi oznaczone „△ do weryfikacji" wymagają sprawdzenia z aktualnym stanem prawnym. Przepisy się zmieniają — zawsze korzystaj z aktualnych tekstów aktów prawnych.</p>
      </div>
      <p class="footer-note">Wersja offline (PWA). Postępy zapisywane lokalnie na urządzeniu.</p>`;
  }

  // ====================================================================
  //  KONTO UŻYTKOWNIKA
  // ====================================================================
  function msgBox(id) { return `<div class="msg" id="${id}"></div>`; }
  function showMsg(id, text, kind) {
    const el = document.getElementById(id); if (!el) return;
    el.className = "msg " + (kind || "info") + (text ? " show" : "");
    el.textContent = text || "";
  }
  const busy = (btn, on, label) => {
    if (!btn) return;
    btn.disabled = !!on;
    if (on) { btn.dataset.lbl = btn.textContent; btn.textContent = label || "Chwilę…"; }
    else if (btn.dataset.lbl) btn.textContent = btn.dataset.lbl;
  };

  function renderAccount() {
    setTop("Konto", true);
    const C = window.Cloud;

    // --- serwer nieskonfigurowany ---
    if (!C || !C.configured) {
      app.innerHTML = `
        <div class="intro">
          <h2>Tryb offline — bez konta</h2>
          <p>Aplikacja działa w pełni lokalnie: postęp nauki zapisany jest na tym urządzeniu
             (w przeglądarce) i nigdzie nie jest wysyłany.</p>
          <p class="note">${C && C.reason ? esc(C.reason) : "Brak konfiguracji serwera."}</p>
        </div>
        <div class="intro">
          <h2>Jak włączyć konta</h2>
          <p>Konta, synchronizacja postępu między telefonem i komputerem oraz własne pytania
             wymagają darmowego projektu <b>Supabase</b>. Konfiguracja to jednorazowe
             wklejenie dwóch wartości do pliku <b>cloud-config.js</b>.</p>
          <p class="note">Instrukcja krok po kroku: plik <b>README-SERWER.md</b> w folderze aplikacji.</p>
        </div>`;
      return;
    }

    if (!C.ready) {
      app.innerHTML = `<div class="intro"><h2>Łączenie z serwerem…</h2></div>`;
      return;
    }

    // --- zalogowany: profil ---
    if (C.user) {
      const sync = { ok: "✔ zsynchronizowany", pending: "⏳ wysyłanie…", error: "✘ błąd synchronizacji", off: "—" }[syncState] || "—";
      app.innerHTML = `
        <div class="intro">
          <h2>Twój profil</h2>
          <div class="kv"><span>Pseudonim</span><b>${esc((C.profile && C.profile.nick) || "—")}</b></div>
          <div class="kv"><span>E-mail</span><b>${esc(C.user.email || "—")}</b></div>
          <div class="kv"><span>Postęp nauki</span><b>${sync}</b></div>
          <div class="kv"><span>Moje pytania</span><b>${MINEQ.length}</b></div>
          ${C.isAdmin ? `<div class="kv"><span>Uprawnienia</span><b>🛡️ administrator (moderacja)</b></div>` : ""}
        </div>
        ${msgBox("accMsg")}
        <div class="field">
          <label for="nick">Zmień pseudonim <span class="hint">widoczny pod pytaniami publicznymi</span></label>
          <input id="nick" type="text" maxlength="32" value="${esc((C.profile && C.profile.nick) || "")}">
        </div>
        <div class="btn-row">
          <button class="btn secondary" id="saveNick">Zapisz pseudonim</button>
          <button class="btn secondary" id="syncNow">Synchronizuj postęp teraz</button>
        </div>
        <h3 class="section-title" style="margin-top:22px">Hasło</h3>
        <div class="field">
          <label for="pw1">Nowe hasło <span class="hint">min. 8 znaków</span></label>
          <input id="pw1" type="password" autocomplete="new-password">
        </div>
        <div class="btn-row">
          <button class="btn secondary" id="chPw">Zmień hasło</button>
        </div>
        <div class="btn-row" style="margin-top:26px">
          <button class="btn ghost" id="logout">Wyloguj się</button>
        </div>
        <p class="footer-note">Postęp nauki jest zapisywany też lokalnie — po wylogowaniu zostaje na tym urządzeniu.</p>`;

      document.getElementById("saveNick").onclick = async (e) => {
        const b = e.currentTarget, v = document.getElementById("nick").value;
        busy(b, true);
        try { await C.setNick(v); showMsg("accMsg", "Pseudonim zapisany.", "ok"); renderAccount(); }
        catch (err) { busy(b, false); showMsg("accMsg", err.message, "bad"); }
      };
      document.getElementById("syncNow").onclick = async (e) => {
        const b = e.currentTarget; busy(b, true, "Synchronizuję…");
        await syncDown(); await syncQuestions(); busy(b, false);
        showMsg("accMsg", syncState === "ok" ? "Postęp zsynchronizowany." : "Nie udało się połączyć z serwerem.",
          syncState === "ok" ? "ok" : "bad");
        renderAccount();
      };
      document.getElementById("chPw").onclick = async (e) => {
        const b = e.currentTarget, v = document.getElementById("pw1").value;
        if (v.length < 8) return showMsg("accMsg", "Hasło musi mieć co najmniej 8 znaków.", "bad");
        busy(b, true);
        try { await C.changePassword(v); document.getElementById("pw1").value = ""; showMsg("accMsg", "Hasło zmienione.", "ok"); }
        catch (err) { showMsg("accMsg", err.message, "bad"); }
        busy(b, false);
      };
      document.getElementById("logout").onclick = async () => {
        if (!confirm("Wylogować się? Postęp zostanie na tym urządzeniu.")) return;
        await flushPush();
        await C.signOut();
      };
      return;
    }

    // --- niezalogowany: logowanie / rejestracja ---
    app.innerHTML = `
      <div class="intro">
        <h2>Zaloguj się</h2>
        <p>Konto daje <b>jeden postęp nauki na wszystkich urządzeniach</b> (telefon + komputer)
           oraz możliwość dodawania <b>własnych pytań</b>.</p>
        <p class="note">Bez logowania aplikacja działa normalnie — postęp zostaje tylko na tym urządzeniu.</p>
      </div>
      <div class="tabs" id="authTabs">
        <button class="tab active" data-t="in">Logowanie</button>
        <button class="tab" data-t="up">Rejestracja</button>
      </div>
      ${msgBox("authMsg")}
      <div id="paneIn">
        <div class="field"><label for="e1">E-mail</label>
          <input id="e1" type="email" autocomplete="username" inputmode="email"></div>
        <div class="field"><label for="p1">Hasło</label>
          <input id="p1" type="password" autocomplete="current-password"></div>
        <button class="btn" id="doIn">Zaloguj się</button>
        <div class="btn-row" style="margin-top:10px">
          <button class="btn ghost" id="doReset">Nie pamiętam hasła</button>
        </div>
      </div>
      <div id="paneUp" class="hidden">
        <div class="field"><label for="n2">Pseudonim <span class="hint">widoczny pod pytaniami publicznymi</span></label>
          <input id="n2" type="text" maxlength="32"></div>
        <div class="field"><label for="e2">E-mail</label>
          <input id="e2" type="email" autocomplete="username" inputmode="email"></div>
        <div class="field"><label for="p2">Hasło <span class="hint">min. 8 znaków</span></label>
          <input id="p2" type="password" autocomplete="new-password"></div>
        <button class="btn" id="doUp">Utwórz konto</button>
      </div>
      ${C.googleEnabled ? `
      <div class="or"><span>albo</span></div>
      <button class="btn secondary wide" id="doGoogle">Zaloguj przez Google</button>` : ""}
      <p class="footer-note">Przechowujemy wyłącznie e-mail, pseudonim, postęp nauki i dodane przez Ciebie pytania.</p>`;

    const tabs = app.querySelectorAll("#authTabs .tab");
    tabs.forEach(t => t.onclick = () => {
      tabs.forEach(x => x.classList.toggle("active", x === t));
      document.getElementById("paneIn").classList.toggle("hidden", t.dataset.t !== "in");
      document.getElementById("paneUp").classList.toggle("hidden", t.dataset.t !== "up");
      showMsg("authMsg", "");
    });

    document.getElementById("doIn").onclick = async (e) => {
      const b = e.currentTarget; busy(b, true, "Logowanie…");
      try { await C.signIn(document.getElementById("e1").value, document.getElementById("p1").value); }
      catch (err) { busy(b, false); showMsg("authMsg", err.message, "bad"); }
    };
    document.getElementById("doUp").onclick = async (e) => {
      const b = e.currentTarget;
      const pw = document.getElementById("p2").value;
      if (pw.length < 8) return showMsg("authMsg", "Hasło musi mieć co najmniej 8 znaków.", "bad");
      busy(b, true, "Tworzę konto…");
      try {
        const r = await C.signUp(document.getElementById("e2").value, pw, document.getElementById("n2").value);
        busy(b, false);
        if (r.needsConfirm) showMsg("authMsg",
          "Konto utworzone. Potwierdź adres, klikając link w wiadomości e-mail, a potem zaloguj się.", "ok");
      } catch (err) { busy(b, false); showMsg("authMsg", err.message, "bad"); }
    };
    document.getElementById("doReset").onclick = async () => {
      const mail = document.getElementById("e1").value.trim();
      if (!mail) return showMsg("authMsg", "Podaj najpierw adres e-mail w polu powyżej.", "bad");
      try { await C.resetPassword(mail); showMsg("authMsg", "Wysłaliśmy link do ustawienia nowego hasła na " + mail + ".", "ok"); }
      catch (err) { showMsg("authMsg", err.message, "bad"); }
    };
    const g = document.getElementById("doGoogle");
    if (g) g.onclick = async () => {
      try { await C.signInGoogle(); } catch (err) { showMsg("authMsg", err.message, "bad"); }
    };
  }

  // ====================================================================
  //  MOJE PYTANIA
  // ====================================================================
  function needLogin(what) {
    app.innerHTML = `
      <div class="intro">
        <h2>Wymagane zalogowanie</h2>
        <p>${what}</p>
      </div>
      <button class="btn" id="toAcc">Przejdź do logowania</button>`;
    document.getElementById("toAcc").onclick = () => go("account");
  }

  function renderMyQuestions() {
    setTop("Moje pytania", true);
    const C = window.Cloud;
    if (!C || !C.configured)
      return app.innerHTML = `<div class="intro"><h2>Funkcja wymaga serwera</h2>
        <p>Dodawanie własnych pytań działa po skonfigurowaniu darmowego projektu Supabase —
        patrz plik <b>README-SERWER.md</b>. Bez tego aplikacja pracuje w trybie offline.</p></div>`;
    if (!C.user) return needLogin("Własne pytania są przypisane do konta, dlatego trzeba się zalogować.");

    const byStatus = s => MINEQ.filter(q => q.status === s).length;
    const rows = MINEQ.length ? MINEQ.map(q => {
      const s = STATUS_LABEL[q.status] || STATUS_LABEL.private;
      return `<div class="myq">
        <div class="myq-main">
          <div class="myq-q">${esc(q.q.length > 160 ? q.q.slice(0, 160) + "…" : q.q)}</div>
          <div class="myq-meta">
            <span class="${s.c}">${s.t}</span>
            <span>odp. <b>${q.answer})</b></span>
            <span>${esc(q.userCategory)}</span>
            <span>#${q.dbId}</span>
          </div>
          ${q.status === "rejected" && q.reviewNote
            ? `<div class="myq-note">Uwaga moderatora: ${esc(q.reviewNote)}</div>` : ""}
        </div>
        <div class="myq-btns">
          <button class="icon-toggle" data-edit="${q.dbId}">Edytuj</button>
          <button class="icon-toggle danger" data-del="${q.dbId}">Usuń</button>
        </div>
      </div>`;
    }).join("") : `<div class="intro"><p>Nie dodałeś jeszcze żadnego pytania.</p></div>`;

    app.innerHTML = `
      <div class="intro">
        <h2>Własne pytania</h2>
        <p>Pytanie <b>prywatne</b> widzisz tylko Ty. Pytanie zgłoszone jako <b>publiczne</b>
           pojawi się u innych użytkowników po zatwierdzeniu przez moderatora.</p>
        <div class="stat-row">
          <span class="chip">Razem: <b>${MINEQ.length}</b></span>
          <span class="chip">Prywatne: <b>${byStatus("private")}</b></span>
          <span class="chip">Czeka: <b>${byStatus("pending")}</b></span>
          <span class="chip">Publiczne: <b>${byStatus("approved")}</b></span>
          ${byStatus("rejected") ? `<span class="chip">Odrzucone: <b>${byStatus("rejected")}</b></span>` : ""}
        </div>
      </div>
      ${msgBox("myqMsg")}
      <div class="btn-row" style="margin-bottom:14px">
        <button class="btn" id="addQ">➕ Dodaj pytanie</button>
        ${MINEQ.length ? `<button class="btn secondary" id="learnMine">Ucz się moich pytań</button>` : ""}
      </div>
      <div class="myq-list">${rows}</div>
      ${PUBQ.length ? `<p class="footer-note">Z serwera pobrano też <b>${PUBQ.length}</b> zatwierdzonych pytań innych użytkowników — znajdziesz je w dziale „${esc(C.publicCategory)}".</p>` : ""}`;

    document.getElementById("addQ").onclick = () => go("qedit", null);
    const lm = document.getElementById("learnMine");
    if (lm) lm.onclick = () => startStudy({ category: C.myCategory, random: false });
    app.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => go("qedit", parseInt(b.dataset.edit, 10)));
    app.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
      const id = parseInt(b.dataset.del, 10);
      if (!confirm("Usunąć to pytanie? Operacji nie można cofnąć.")) return;
      busy(b, true, "Usuwam…");
      try { await C.deleteQuestion(id); await syncQuestions(); renderMyQuestions(); showMsg("myqMsg", "Pytanie usunięte.", "ok"); }
      catch (err) { busy(b, false); showMsg("myqMsg", err.message, "bad"); }
    });
  }

  // ---------- Edytor pytania ----------
  function renderQEdit(dbId) {
    const C = window.Cloud;
    if (!C || !C.user) return needLogin("Aby dodać pytanie, zaloguj się.");
    const q = dbId ? MINEQ.find(x => x.dbId === dbId) : null;
    if (dbId && !q) return go("myq");
    setTop(q ? "Edycja pytania #" + q.dbId : "Nowe pytanie", true);

    const v = {
      q: q ? q.q : "", a: q ? q.options.a : "", b: q ? q.options.b : "", c: q ? q.options.c : "",
      answer: q ? q.answer : "", explanation: q ? (q.explanation || "") : "",
      legal: q ? (q.legal || []).join("\n") : "",
      category: q ? q.userCategory : "Pytania użytkowników",
      wantPublic: q ? (q.status === "pending" || q.status === "approved") : false
    };

    app.innerHTML = `
      <div class="intro">
        <h2>${q ? "Edytuj pytanie" : "Dodaj własne pytanie"}</h2>
        <p>Format jak na egzaminie: treść pytania i <b>trzy</b> odpowiedzi, z których jedna jest poprawna.</p>
        ${q && q.status === "approved" ? `<p class="note">To pytanie jest już publiczne. Po zapisaniu zmian wróci do kolejki moderacji.</p>` : ""}
      </div>
      ${msgBox("edMsg")}
      <div class="field">
        <label for="fq">Treść pytania <span class="hint">min. 10 znaków</span></label>
        <textarea id="fq" rows="4" maxlength="2000">${esc(v.q)}</textarea>
      </div>
      <div class="field"><label for="fa">Odpowiedź a)</label><input id="fa" maxlength="600" value="${esc(v.a)}"></div>
      <div class="field"><label for="fb">Odpowiedź b)</label><input id="fb" maxlength="600" value="${esc(v.b)}"></div>
      <div class="field"><label for="fc">Odpowiedź c)</label><input id="fc" maxlength="600" value="${esc(v.c)}"></div>
      <div class="field">
        <label>Poprawna odpowiedź</label>
        <div class="radio-row">
          ${["a", "b", "c"].map(k => `<label class="radio"><input type="radio" name="corr" value="${k}" ${v.answer === k ? "checked" : ""}> ${k})</label>`).join("")}
        </div>
      </div>
      <div class="field">
        <label for="fe">Objaśnienie <span class="hint">nieobowiązkowe — dlaczego ta odpowiedź jest poprawna</span></label>
        <textarea id="fe" rows="4" maxlength="5000">${esc(v.explanation)}</textarea>
      </div>
      <div class="field">
        <label for="fl">Podstawa prawna <span class="hint">po jednej w wierszu, np. „§ 237 ust. 6 WT – przejścia ewakuacyjne”</span></label>
        <textarea id="fl" rows="3">${esc(v.legal)}</textarea>
      </div>
      <div class="field">
        <label for="fcat">Dział / temat</label>
        <input id="fcat" maxlength="80" value="${esc(v.category)}" list="catList">
        <datalist id="catList">${[...new Set(BASE.map(x => x.category))].map(c => `<option value="${esc(c)}">`).join("")}</datalist>
      </div>
      <div class="field">
        <label class="check"><input type="checkbox" id="fpub" ${v.wantPublic ? "checked" : ""}>
          Udostępnij innym użytkownikom <span class="hint">pytanie trafi do moderatora i po zatwierdzeniu będzie widoczne dla wszystkich, z Twoim pseudonimem</span></label>
      </div>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn" id="fsave">${q ? "Zapisz zmiany" : "Dodaj pytanie"}</button>
        <button class="btn ghost" id="fcancel">Anuluj</button>
      </div>`;

    document.getElementById("fcancel").onclick = () => go("myq");
    document.getElementById("fsave").onclick = async (e) => {
      const btn = e.currentTarget;
      const corr = app.querySelector('input[name="corr"]:checked');
      const form = {
        q: document.getElementById("fq").value,
        a: document.getElementById("fa").value,
        b: document.getElementById("fb").value,
        c: document.getElementById("fc").value,
        answer: corr ? corr.value : "",
        explanation: document.getElementById("fe").value,
        legal: document.getElementById("fl").value.split("\n"),
        category: document.getElementById("fcat").value,
        wantPublic: document.getElementById("fpub").checked
      };
      const bad = C.validate(form);
      if (bad) { showMsg("edMsg", bad, "bad"); window.scrollTo(0, 0); return; }
      busy(btn, true, "Zapisuję…");
      try {
        if (q) await C.updateQuestion(q.dbId, form); else await C.createQuestion(form);
        await syncQuestions();
        go("myq");
        showMsg("myqMsg", form.wantPublic
          ? "Zapisano. Pytanie czeka na zatwierdzenie przez moderatora."
          : "Zapisano jako pytanie prywatne.", "ok");
      } catch (err) { busy(btn, false); showMsg("edMsg", err.message, "bad"); window.scrollTo(0, 0); }
    };
  }

  // ====================================================================
  //  MODERACJA (tylko administrator)
  // ====================================================================
  function renderModerate() {
    setTop("Do zatwierdzenia", true);
    const C = window.Cloud;
    if (!C || !C.user) return needLogin("Moderacja wymaga konta administratora.");
    if (!C.isAdmin) return app.innerHTML = `<div class="intro"><h2>Brak uprawnień</h2>
      <p>Ten ekran jest dostępny tylko dla administratora. Uprawnienia nadaje się w panelu Supabase
      (patrz koniec pliku <b>schema.sql</b>).</p></div>`;

    app.innerHTML = `<div class="intro"><h2>Pytania zgłoszone do publikacji</h2><p>Wczytywanie…</p></div>`;
    C.pendingQuestions().then(list => {
      if (!list.length) {
        app.innerHTML = `<div class="intro"><h2>Kolejka pusta 🎉</h2>
          <p>Żadne pytanie nie czeka na zatwierdzenie.</p></div>`;
        return;
      }
      app.innerHTML = `
        <div class="intro">
          <h2>Pytania zgłoszone do publikacji (${list.length})</h2>
          <p>Po zatwierdzeniu pytanie będzie widoczne dla wszystkich zalogowanych, z pseudonimem autora.</p>
        </div>
        ${msgBox("modMsg")}
        ${list.map(q => `
          <div class="mod-item" data-id="${q.dbId}">
            <div class="qmeta">
              <span class="cat">${esc(q.userCategory)}</span>
              <span class="badge-user">aut. ${esc(q.authorNick)}</span>
              <span class="num">#${q.dbId}</span>
            </div>
            <div class="qtext">${esc(q.q)}</div>
            <div class="mod-opts">
              ${["a", "b", "c"].map(k => `<div class="mod-opt ${q.answer === k ? "ok" : ""}">
                <b>${k})</b> ${esc(q.options[k])}${q.answer === k ? " ✔" : ""}</div>`).join("")}
            </div>
            ${q.explanation ? `<div class="mod-exp"><b>Objaśnienie:</b> ${esc(q.explanation)}</div>` : ""}
            ${(q.legal || []).length ? `<div class="mod-exp"><b>Podstawa prawna:</b> ${q.legal.map(esc).join(" · ")}</div>` : ""}
            <div class="field" style="margin-top:10px">
              <input class="modNote" placeholder="Uwaga dla autora (wymagana przy odrzuceniu)" maxlength="500">
            </div>
            <div class="btn-row">
              <button class="btn" data-ok="${q.dbId}">✔ Zatwierdź</button>
              <button class="btn secondary" data-no="${q.dbId}">✘ Odrzuć</button>
            </div>
          </div>`).join("")}`;

      const act = async (btn, id, status) => {
        const box = btn.closest(".mod-item");
        const note = box.querySelector(".modNote").value.trim();
        if (status === "rejected" && !note)
          return showMsg("modMsg", "Przy odrzuceniu podaj uwagę dla autora.", "bad");
        busy(btn, true, "…");
        try {
          await C.moderate(id, status, note);
          box.remove();
          await syncQuestions();
          showMsg("modMsg", status === "approved" ? "Pytanie zatwierdzone." : "Pytanie odrzucone.", "ok");
          if (!app.querySelector(".mod-item")) renderModerate();
        } catch (err) { busy(btn, false); showMsg("modMsg", err.message, "bad"); }
      };
      app.querySelectorAll("[data-ok]").forEach(b => b.onclick = () => act(b, parseInt(b.dataset.ok, 10), "approved"));
      app.querySelectorAll("[data-no]").forEach(b => b.onclick = () => act(b, parseInt(b.dataset.no, 10), "rejected"));
    }).catch(err => {
      app.innerHTML = `<div class="intro"><h2>Nie udało się wczytać kolejki</h2>
        <p class="note">${esc(err.message)}</p></div>`;
    });
  }

  // ---------- Start (obsługa skrótów z adresu: #egzamin, #nauka, #nowe, #akty) ----------
  function fromHash() {
    const h = (location.hash || "").replace("#", "").toLowerCase();
    if (h === "egzamin" || h === "test") { go("exam-setup"); return true; }
    if (h === "nauka") { go("study-setup"); return true; }
    if (h === "nowe") { startStudy({ category: "__new__", random: false }); return true; }
    if (h === "akty") { go("acts"); return true; }
    if (h === "konto") { go("account"); return true; }
    if (h === "moje") { go("myq"); return true; }
    if (h === "" && VIEW !== "home") { go("home"); return true; }
    return false;
  }

  // ---------- Przycisk konta w nagłówku ----------
  const acctBtn = document.getElementById("acctBtn");
  function paintAcctBtn() {
    if (!acctBtn) return;
    const C = window.Cloud || {};
    if (!C.configured) { acctBtn.classList.add("hidden"); return; }
    acctBtn.classList.remove("hidden");
    acctBtn.textContent = C.user ? (C.isAdmin ? "🛡" : "👤") : "👤";
    acctBtn.classList.toggle("logged", !!C.user);
    acctBtn.title = C.user
      ? "Konto: " + ((C.profile && C.profile.nick) || "") + (C.isAdmin ? " (administrator)" : "")
      : "Zaloguj się";
  }
  if (acctBtn) acctBtn.onclick = () => go("account");

  if (!fromHash()) go("home");
  window.addEventListener("hashchange", fromHash);

  // ---------- Warstwa serwerowa (konta, synchronizacja, własne pytania) ----------
  (function bootCloud() {
    const C = window.Cloud;
    paintAcctBtn();
    if (!C || !C.configured) return;
    // ekrany, które warto odświeżyć po zalogowaniu/wylogowaniu
    const LIVE = ["home", "account", "myq", "moderate", "stats", "categories", "study-setup", "exam-setup"];
    C.onChange(async what => {
      paintAcctBtn();
      if (C.user) { await syncQuestions(); await syncDown(); }
      else { CLOUDQ = []; rebuild(); }
      paintAcctBtn();
      if (LIVE.indexOf(VIEW) >= 0) go(VIEW, VIEW_ARG);
    });
    C.init();
  })();
})();
