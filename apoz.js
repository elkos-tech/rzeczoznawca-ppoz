/* ============================================================================
   Studia APOŻ – zaliczenia (moduł niezależny od egzaminu KG PSP)
   ----------------------------------------------------------------------------
   Baza ~3233 pytań z 12 przedmiotów studiów podyplomowych (materiał kolegi
   Jarka, trenażer APoz_SKRZ_TEST). Treść NIE jest w publicznym repozytorium –
   leży w prywatnym buckecie Supabase „apoz" i jest widoczna wyłącznie po
   zalogowaniu. Po pobraniu bank jest trzymany w IndexedDB, więc działa offline.

   Zasady zaliczenia wg Jarka: próg 65%, 90 s na pytanie, do 4 wariantów.
   Moduł korzysta z mostu window.__APP (app.js) i z window.Cloud (cloud.js).
   ========================================================================== */
(function () {
  "use strict";
  const A = window.__APP;
  if (!A) return;                       // bez aplikacji głównej nie ma czego dokładać
  const { app, go, setTop, esc, shuffle, fmtTime, lsGet, lsSet } = A;

  const RULES = { passPct: 65, secPerQ: 90 };
  const SKEY = "apoz_study_v1", EKEY = "apoz_exam_v1";

  // ---------- Stan bazy ----------
  let BANK = [], BYID = {}, SUBJECTS = [], IMAGES = {}, VERSION = null;
  let status = "idle";                  // idle | loading | ready | empty | error | offline
  let statusMsg = "";
  let mode = "study";                   // wybór na ekranie APOŻ: study | exam
  let examTimer = null;

  const cloud = () => (window.Cloud && window.Cloud.user ? window.Cloud : null);

  // Rozpakowanie zwartego rekordu z bank.json do postaci używanej w aplikacji
  function expand(r) {
    return {
      id: r.id, subject: r.s, q: r.q, opts: r.o || [], answer: r.a || [],
      unscored: !!r.u, reason: r.r || "", basis: r.b || "", quote: r.qt || "",
      links: r.l || [], citation: r.c || "", images: r.img || [],
      conflict: !!r.cf, provenance: r.p || ""
    };
  }
  function setBank(bank) {
    SUBJECTS = bank.subjects || [];
    BANK = (bank.questions || []).map(expand);
    BYID = {}; BANK.forEach(q => BYID[q.id] = q);
    VERSION = bank.version || null;
  }
  const subjName = id => (SUBJECTS.find(s => s[0] === id) || [id, id])[1];
  const poolOf = sub => sub && sub !== "all" ? BANK.filter(q => q.subject === sub) : BANK.slice();
  const letter = i => "abcdefgh"[i] || String(i + 1);

  // ---------- Pamięć podręczna (IndexedDB – bank bywa > 10 MB) ----------
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open("apoz_db", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function idbGet(key) {
    try { const db = await idb(); return await new Promise((res, rej) => {
      const t = db.transaction("kv").objectStore("kv").get(key);
      t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error);
    }); } catch (e) { return undefined; }
  }
  async function idbSet(key, val) {
    try { const db = await idb(); return await new Promise((res, rej) => {
      const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(val, key);
      t.oncomplete = () => res(true); t.onerror = () => rej(t.error);
    }); } catch (e) { return false; }
  }

  // ---------- Ładowanie banku ----------
  // Z pamięci, jeśli jest; w tle sprawdzenie wersji i ewentualne dociągnięcie nowej.
  let loadingPromise = null;
  function ensureLoaded() {
    if (status === "ready") return Promise.resolve(true);
    if (loadingPromise) return loadingPromise;
    loadingPromise = doLoad().finally(() => { loadingPromise = null; });
    return loadingPromise;
  }
  async function doLoad() {
    const C = cloud();
    if (!C) { status = "idle"; return false; }
    status = "loading"; refreshHomeIfNeeded();

    const cachedVer = await idbGet("version");
    const cachedBank = cachedVer ? await idbGet("bank") : null;
    const cachedImgs = cachedVer ? await idbGet("images") : null;

    // 1) Jest kopia w pamięci – użyj od razu, wersję sprawdź w tle.
    if (cachedBank) {
      setBank(cachedBank); IMAGES = cachedImgs || {}; status = "ready";
      refreshHomeIfNeeded();
      C.apozMeta().then(async meta => {
        if (meta && meta.version && meta.version !== cachedVer) await downloadFresh(C);
      }).catch(() => {});
      return true;
    }

    // 2) Brak kopii – trzeba pobrać z sieci.
    try {
      await downloadFresh(C);
      return true;
    } catch (e) {
      if (e && e.message === "APOZ_BRAK") { status = "empty"; statusMsg = "Baza APOŻ nie została jeszcze wgrana do Supabase."; }
      else if (/połączenia|fetch|network/i.test(e.message || "")) { status = "offline"; statusMsg = "Brak połączenia — baza APOŻ pobierze się po połączeniu."; }
      else { status = "error"; statusMsg = e.message || "Nie udało się pobrać bazy APOŻ."; }
      refreshHomeIfNeeded();
      return false;
    }
  }
  async function downloadFresh(C) {
    const data = await C.apozFetch(true);
    setBank(data); IMAGES = data.images || {};
    status = "ready"; statusMsg = "";
    await idbSet("version", data.version);
    await idbSet("bank", { version: data.version, subjects: data.subjects, questions: data.questions });
    await idbSet("images", IMAGES);
    refreshHomeIfNeeded();
  }

  // Odśwież ekran główny, jeśli na nim jesteśmy (kafelek APOŻ zmienia stan).
  function refreshHomeIfNeeded() { if (A.isHome()) homeHook(); }

  // ---------- Reakcja na logowanie / wylogowanie ----------
  function onAuth(ev) {
    if (ev === "login") { status = "idle"; ensureLoaded(); }
    else { status = "idle"; BANK = []; BYID = {}; stopTimer(); if (A.isHome()) homeHook(); }
  }

  // ---------- Kafelek i pasek wznawiania na ekranie głównym ----------
  function homeHook() {
    const grid = A.cardGrid(); if (!grid) return;
    grid.querySelectorAll("[data-apoz-card]").forEach(n => n.remove());
    document.querySelectorAll("[data-apoz-resume]").forEach(n => n.remove());
    if (!cloud()) return;                          // sekcja tylko dla zalogowanych

    let sub, desc, go1 = "apoz";
    if (status === "ready") { sub = "Studia APOŻ — zaliczenia"; desc = `${BANK.length} pytań, 12 przedmiotów (materiał z wykładów). Nauka i zaliczenie (próg 65%).`; }
    else if (status === "loading") { sub = "Studia APOŻ — pobieranie…"; desc = "Trwa pobieranie bazy pytań z serwera. Chwila."; }
    else if (status === "empty") { sub = "Studia APOŻ — do wgrania"; desc = statusMsg; }
    else if (status === "offline") { sub = "Studia APOŻ — offline"; desc = statusMsg; }
    else if (status === "error") { sub = "Studia APOŻ — błąd"; desc = statusMsg; }
    else { sub = "Studia APOŻ — zaliczenia"; desc = "Baza pytań ze studiów podyplomowych (po pobraniu działa offline)."; }

    const el = document.createElement("div");
    el.className = "menu-card apoz-card"; el.setAttribute("data-apoz-card", "1");
    el.innerHTML = `<div class="ico">🎓</div><div><h3>${esc(sub)}</h3><p>${esc(desc)}</p></div>`;
    el.onclick = () => { if (status === "ready") go("apoz"); else ensureLoaded().then(() => { if (status === "ready") go("apoz"); }); };
    grid.appendChild(el);

    // pasek „Wznów" (nauka / zaliczenie APOŻ) nad siatką kafelków
    const bar = sessionBanner();
    if (bar) { const d = document.createElement("div"); d.setAttribute("data-apoz-resume", "1"); d.innerHTML = bar; grid.parentNode.insertBefore(d, grid); wireBanner(d); }
  }

  function sessionBanner() {
    const e = lsGet(EKEY), s = lsGet(SKEY), out = [];
    if (e && e.ids && e.ids.length) {
      if (e.finished && e.score) out.push(`<div class="resume"><div>🏁 <b>APOŻ – wynik zaliczenia:</b> ${e.score.pct}% (${e.score.correct}/${e.ids.length})</div><div class="btn-row"><button class="btn secondary" data-ar="exam">Zobacz</button><button class="btn ghost" data-ad="exam">Zamknij</button></div></div>`);
      else { const left = e.endsAt ? Math.max(0, Math.round((e.endsAt - Date.now()) / 1000)) : null;
        out.push(`<div class="resume exam"><div>🎓 <b>APOŻ – niedokończone zaliczenie:</b> ${esc(subjName(e.subject))} — pytanie ${(e.idx || 0) + 1}/${e.ids.length}${left != null ? (left > 0 ? `, pozostało <b>${fmtTime(left)}</b>` : ", <b>czas minął</b>") : ""}</div><div class="btn-row"><button class="btn" data-ar="exam">Wznów</button><button class="btn ghost" data-ad="exam">Porzuć</button></div></div>`); }
    }
    if (s && s.ids && s.ids.length) out.push(`<div class="resume"><div>📘 <b>APOŻ – niedokończona nauka:</b> ${esc(subjName(s.subject))} — pytanie ${(s.idx || 0) + 1}/${s.ids.length}</div><div class="btn-row"><button class="btn" data-ar="study">Wznów</button><button class="btn ghost" data-ad="study">Zakończ</button></div></div>`);
    return out.join("");
  }
  function wireBanner(root) {
    root.querySelectorAll("[data-ar]").forEach(b => b.onclick = () => resume(b.dataset.ar));
    root.querySelectorAll("[data-ad]").forEach(b => b.onclick = () => {
      if (b.dataset.ad === "exam") { const e = lsGet(EKEY); if (e && !e.finished && !confirm("Porzucić niedokończone zaliczenie APOŻ?")) return; lsSet(EKEY, null); }
      else lsSet(SKEY, null);
      homeHook();
    });
  }
  function resume(kind) {
    if (status !== "ready") return ensureLoaded().then(() => status === "ready" && resume(kind));
    if (kind === "exam") { const e = lsGet(EKEY); if (!e || !hydrate(e.ids)) return; return startExam(null, e); }
    const s = lsGet(SKEY); if (!s || !hydrate(s.ids)) return; startStudy(s.subject, s);
  }
  const hydrate = ids => (ids || []).every(id => BYID[id]);

  // ---------- Router modułu ----------
  function route(view, arg) {
    stopTimer();
    if (status !== "ready") { ensureLoaded().then(() => { if (status === "ready") route(view, arg); else renderNotReady(); }); if (status !== "loading") renderNotReady(); return; }
    if (view === "apoz") return renderHome();
    if (view === "apoz-study") return startStudy(arg);
    if (view === "apoz-exam") return startExam(arg);
    renderHome();
  }
  function renderNotReady() {
    setTop("Studia APOŻ", true);
    const map = { loading: "Pobieranie bazy pytań APOŻ…", empty: statusMsg, offline: statusMsg, error: statusMsg, idle: "Przygotowywanie bazy APOŻ…" };
    app.innerHTML = `<div class="intro"><h2>Studia APOŻ</h2><p>${esc(map[status] || "Baza niedostępna.")}</p></div>` +
      (status === "error" || status === "offline" ? `<button class="btn" id="apozRetry">Spróbuj ponownie</button>` : "");
    const r = document.getElementById("apozRetry"); if (r) r.onclick = () => { status = "idle"; route("apoz"); };
  }

  // ---------- Ekran APOŻ: wybór trybu i przedmiotu ----------
  function renderHome() {
    setTop("Studia APOŻ", true);
    const counts = {}; SUBJECTS.forEach(([id]) => counts[id] = poolOf(id).length);
    const bar = sessionBanner();
    app.innerHTML = `
      <div class="intro">
        <h2>Studia APOŻ — zaliczenia</h2>
        <p>Baza <b>${BANK.length}</b> pytań z <b>12 przedmiotów</b> studiów podyplomowych (materiał z wykładów, opracowanie kolegi). Zasady zaliczenia: próg <b>${RULES.passPct}%</b>, <b>${RULES.secPerQ} s</b> na pytanie.</p>
        <p class="note">Materiał pomocniczy spoza egzaminu KG PSP. Zawsze weryfikuj z aktualnym stanem prawnym.</p>
      </div>
      ${bar ? `<div style="margin-bottom:14px">${bar}</div>` : ""}
      <div class="tabs" id="apozMode">
        <button class="tab ${mode === "study" ? "active" : ""}" data-m="study">📘 Nauka</button>
        <button class="tab ${mode === "exam" ? "active" : ""}" data-m="exam">🎓 Zaliczenie</button>
      </div>
      <p class="note" id="apozModeInfo">${modeInfo()}</p>
      <div class="cat-list">
        <div class="cat-item" data-sub="all"><div style="flex:1"><div class="cname">★ Wszystkie przedmioty</div></div><span class="cnt">${BANK.length}</span></div>
        ${SUBJECTS.map(([id, name]) => `<div class="cat-item" data-sub="${esc(id)}"><div style="flex:1"><div class="cname">${esc(name)}</div></div><span class="cnt">${counts[id]}</span></div>`).join("")}
      </div>`;
    const tabs = app.querySelectorAll("#apozMode .tab");
    tabs.forEach(t => t.onclick = () => { mode = t.dataset.m; tabs.forEach(x => x.classList.toggle("active", x === t)); document.getElementById("apozModeInfo").textContent = modeInfo(); });
    app.querySelectorAll("[data-sub]").forEach(el => el.onclick = () => { mode === "exam" ? startExam(el.dataset.sub) : startStudy(el.dataset.sub); });
    if (bar) wireBanner(app);
  }
  function modeInfo() {
    return mode === "exam"
      ? `Zaliczenie: wszystkie pytania z wybranego przedmiotu, ${RULES.secPerQ} s na pytanie, próg ${RULES.passPct}%. Ocena i uzasadnienia po zakończeniu.`
      : "Nauka: przeglądasz pytania z poprawną odpowiedzią, uzasadnieniem i źródłem. Bez limitu czasu.";
  }

  // ---------- Karta pytania (obsługuje 3–4 warianty i klucz wieloskładnikowy) ----------
  function isCorrect(q, i) { return Number.isInteger(i) && !q.unscored && q.answer.includes(i); }
  function imgHTML(q) {
    if (!q.images || !q.images.length) return "";
    const figs = q.images.map(h => {
      const uri = IMAGES[h];
      return uri ? `<figure class="apoz-fig"><img loading="lazy" src="${uri}" alt="Rysunek do pytania"></figure>`
                 : `<div class="quote-na">Rysunek do pytania — dostępny po pobraniu bazy z obrazkami.</div>`;
    }).join("");
    return `<div class="apoz-figs">${figs}</div>`;
  }
  function questionCard(q, o) {
    const opts = q.opts.map((txt, i) => {
      let cls = "opt";
      if (o.revealed) { if (isCorrect(q, i)) cls += " correct"; else if (o.chosen === i) cls += " wrong"; cls += " disabled"; }
      else if (o.chosen === i) cls += " correct";
      return `<button class="${cls}" data-i="${i}"><span class="letter">${letter(i)})</span><span>${esc(txt)}</span></button>`;
    }).join("");
    const conflict = q.conflict ? `<span class="badge-unv" title="Ta sama treść pojawiała się z różnym kluczem – zweryfikuj">⚠ wariant sporny</span>` : "";
    const unsc = q.unscored ? `<span class="badge-unv">bez punktacji</span>` : "";
    let explain = "";
    if (o.revealed) explain = explainBlock(q);
    return `<div class="qwrap">
      <div class="qmeta">
        <span class="cat">${esc(subjName(q.subject))}</span>
        <span class="badge-apoz" title="Pytanie ze studiów podyplomowych – spoza zestawu KG PSP">🎓 APOŻ</span>
        ${conflict}${unsc}
        <span class="num">${o.index ? `${o.index} / ${o.total}` : ""} · ${esc(q.id)}</span>
      </div>
      <div class="qtext">${esc(q.q)}</div>
      ${imgHTML(q)}
      <div class="options">${opts}</div>
      ${explain}</div>`;
  }
  function explainBlock(q) {
    const correct = q.unscored ? "—" : q.answer.map(i => `${letter(i)}) ${esc(q.opts[i])}`).join(" lub ");
    const links = (q.links || []).filter(u => /^https?:\/\//.test(u))
      .map(u => `<div class="lg"><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a></div>`).join("");
    return `<div class="explain">
      <div class="ans">${q.unscored ? "Pytanie niepunktowane (brak jednoznacznego klucza)" : "Poprawna odpowiedź: <span class=\"lit\">" + correct + "</span>"}</div>
      ${q.reason ? `<h4>Uzasadnienie</h4><p>${esc(q.reason)}</p>` : ""}
      ${q.quote ? `<figure class="quote"><blockquote>${esc(q.quote)}</blockquote></figure>` : ""}
      ${q.basis ? `<p class="note"><b>Podstawa:</b> ${esc(q.basis)}</p>` : ""}
      ${q.citation ? `<p class="note"><b>Źródło:</b> ${esc(q.citation)}</p>` : ""}
      ${links ? `<div class="legal"><h4>Materiał źródłowy</h4>${links}</div>` : ""}
      ${q.conflict ? `<p class="note">⚠ Ta sama treść pojawiała się w materiałach z różnym kluczem. Przyjęto wariant najlepiej potwierdzony — sprawdź samodzielnie.</p>` : ""}
      <p class="note">🎓 Pytanie ze studiów podyplomowych (materiał z wykładów), spoza oficjalnego zestawu KG PSP.</p>
    </div>`;
  }

  // ---------- Tryb nauki ----------
  let study = null;
  function startStudy(sub, saved) {
    const list = saved ? saved.ids.map(id => BYID[id]).filter(Boolean) : shuffle(poolOf(sub));
    if (!list.length) { alert("Brak pytań w tym przedmiocie."); return go("apoz"); }
    study = { subject: sub, ids: list.map(q => q.id), list, idx: saved ? Math.min(saved.idx || 0, list.length - 1) : 0, revealed: !!(saved && saved.revealed), chosen: saved ? (saved.chosen != null ? saved.chosen : null) : null };
    renderStudy();
  }
  function saveStudy() { if (study) lsSet(SKEY, { subject: study.subject, ids: study.ids, idx: study.idx, revealed: study.revealed, chosen: study.chosen }); }
  function renderStudy() {
    setTop("APOŻ · " + subjName(study.subject === "all" ? "" : study.subject) || "APOŻ · nauka", true);
    const q = study.list[study.idx];
    app.innerHTML = questionCard(q, { revealed: study.revealed, chosen: study.chosen, index: study.idx + 1, total: study.list.length }) + studyNav();
    if (!study.revealed) app.querySelectorAll(".opt").forEach(b => b.onclick = () => { study.revealed = true; study.chosen = parseInt(b.dataset.i, 10); saveStudy(); renderStudy(); });
    wireStudyNav();
    saveStudy();
  }
  function studyNav() {
    return `<div class="nav-row"><div class="btn-row">
      <button class="btn secondary" id="aPrev" ${study.idx === 0 ? "disabled" : ""}>‹ Poprz.</button>
      <button class="btn secondary" id="aNext" ${study.idx === study.list.length - 1 ? "disabled" : ""}>Nast. ›</button>
      </div><div class="mark-btns">${!study.revealed ? `<button class="icon-toggle" id="aReveal">Pokaż odpowiedź</button>` : ""}<button class="icon-toggle" id="aHome">Przedmioty</button></div></div>`;
  }
  function wireStudyNav() {
    const p = document.getElementById("aPrev"), n = document.getElementById("aNext"), r = document.getElementById("aReveal"), h = document.getElementById("aHome");
    if (p) p.onclick = () => { if (study.idx > 0) { study.idx--; study.revealed = false; study.chosen = null; renderStudy(); } };
    if (n) n.onclick = () => { if (study.idx < study.list.length - 1) { study.idx++; study.revealed = false; study.chosen = null; renderStudy(); } };
    if (r) r.onclick = () => { study.revealed = true; renderStudy(); };
    if (h) h.onclick = () => go("apoz");
  }

  // ---------- Tryb zaliczenia ----------
  let exam = null;
  function startExam(sub, saved) {
    let list;
    if (saved) { list = saved.ids.map(id => BYID[id]).filter(Boolean); if (list.length < saved.ids.length) { lsSet(EKEY, null); } }
    else {
      const prev = lsGet(EKEY);
      if (prev && !prev.finished && !confirm("Masz niedokończone zaliczenie APOŻ. Rozpocząć nowe?")) return;
      list = shuffle(poolOf(sub).filter(q => !q.unscored && q.answer.length));
      if (!list.length) { alert("Brak pytań z kluczem w tym przedmiocie."); return go("apoz"); }
    }
    const n = list.length;
    exam = saved
      ? { subject: saved.subject, ids: saved.ids, list, idx: Math.min(saved.idx || 0, n - 1), answers: saved.answers || {}, endsAt: saved.endsAt, finished: !!saved.finished, score: saved.score || null }
      : { subject: sub, ids: list.map(q => q.id), list, idx: 0, answers: {}, endsAt: Date.now() + n * RULES.secPerQ * 1000, finished: false, score: null };
    if (!exam.finished && exam.endsAt && Date.now() >= exam.endsAt) return finishExam();
    renderExam();
  }
  function saveExam() { if (exam) lsSet(EKEY, { subject: exam.subject, ids: exam.ids, idx: exam.idx, answers: exam.answers, endsAt: exam.endsAt, finished: exam.finished, score: exam.score }); }
  const left = () => exam && exam.endsAt ? Math.max(0, Math.round((exam.endsAt - Date.now()) / 1000)) : 0;
  function stopTimer() { if (examTimer) { clearInterval(examTimer); examTimer = null; } }
  function renderExam() {
    if (exam.finished) return renderResult();
    if (left() <= 0) return finishExam();
    setTop("APOŻ zaliczenie " + (exam.idx + 1) + "/" + exam.list.length, true);
    const q = exam.list[exam.idx], chosen = exam.answers[q.id];
    app.innerHTML = `
      <div class="exam-top"><span class="timer ${left() <= 60 ? "warn" : ""}" id="aTimer">${fmtTime(left())}</span>
        <button class="btn ghost" id="aFinish" style="margin-left:auto">Zakończ i oceń</button></div>
      <div class="progress-dots">${exam.list.map((qq, i) => `<span class="dot ${Number.isInteger(exam.answers[qq.id]) ? "answered" : ""} ${i === exam.idx ? "current" : ""}" data-j="${i}">${i + 1}</span>`).join("")}</div>
      ${questionCard(q, { revealed: false, chosen: Number.isInteger(chosen) ? chosen : null, index: exam.idx + 1, total: exam.list.length })}
      <div class="nav-row"><div class="btn-row">
        <button class="btn secondary" id="aPrev" ${exam.idx === 0 ? "disabled" : ""}>‹ Poprz.</button>
        <button class="btn" id="aNext">${exam.idx === exam.list.length - 1 ? "Ostatnie" : "Nast. ›"}</button>
      </div></div>`;
    app.querySelectorAll(".opt").forEach(b => b.onclick = () => { exam.answers[q.id] = parseInt(b.dataset.i, 10); saveExam(); renderExam(); });
    app.querySelectorAll(".dot").forEach(d => d.onclick = () => { exam.idx = parseInt(d.dataset.j, 10); renderExam(); });
    document.getElementById("aPrev").onclick = () => { if (exam.idx > 0) { exam.idx--; renderExam(); } };
    document.getElementById("aNext").onclick = () => { if (exam.idx < exam.list.length - 1) { exam.idx++; renderExam(); } else finishExam(); };
    document.getElementById("aFinish").onclick = () => { if (confirm("Zakończyć i ocenić zaliczenie?")) finishExam(); };
    startTimer();
    saveExam();
  }
  function startTimer() {
    stopTimer();
    examTimer = setInterval(() => {
      if (!exam || exam.finished) return stopTimer();
      const l = left(), t = document.getElementById("aTimer");
      if (t) { t.textContent = fmtTime(l); t.classList.toggle("warn", l <= 60); }
      if (l <= 0) { stopTimer(); finishExam(); }
    }, 1000);
  }
  function finishExam() {
    stopTimer(); exam.finished = true;
    let correct = 0, wrong = 0, blank = 0;
    exam.list.forEach(q => { const c = exam.answers[q.id]; if (!Number.isInteger(c)) blank++; else if (isCorrect(q, c)) correct++; else wrong++; });
    const pct = exam.list.length ? Math.round(correct / exam.list.length * 100) : 0;
    exam.score = { correct, wrong, blank, pct };
    saveExam(); renderResult();
  }
  function renderResult() {
    stopTimer();
    setTop("APOŻ · wynik", true);
    const sc = exam.score, pass = sc.pct >= RULES.passPct;
    app.innerHTML = `
      <div class="result-hero ${pass ? "pass" : "fail"}">
        <div class="score">${sc.pct}%</div>
        <div class="verdict">${pass ? "Zaliczone ✔" : "Niezaliczone ✘"}</div>
        <div class="sub">Próg: ${RULES.passPct}% · ${esc(subjName(exam.subject === "all" ? "" : exam.subject)) || "wszystkie przedmioty"}</div>
      </div>
      <div class="qwrap" style="margin-top:14px">
        <div class="kv"><span>Poprawne</span><b style="color:var(--ok)">${sc.correct}/${exam.list.length}</b></div>
        <div class="kv"><span>Błędne</span><b style="color:var(--bad)">${sc.wrong}</b></div>
        <div class="kv"><span>Bez odpowiedzi</span><b>${sc.blank}</b></div>
      </div>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn" id="aReview">Przejrzyj odpowiedzi</button>
        <button class="btn secondary" id="aAgain">Nowe zaliczenie</button>
        <button class="btn ghost" id="aMenu">Przedmioty</button>
      </div>`;
    document.getElementById("aReview").onclick = () => { study = { subject: exam.subject, ids: exam.ids, list: exam.list, idx: 0, revealed: true, chosen: null, review: exam.answers }; renderReview(); };
    document.getElementById("aAgain").onclick = () => { lsSet(EKEY, null); go("apoz"); };
    document.getElementById("aMenu").onclick = () => go("apoz");
  }
  function renderReview() {
    setTop("APOŻ · przegląd " + (study.idx + 1) + "/" + study.list.length, true);
    const q = study.list[study.idx], chosen = study.review[q.id];
    app.innerHTML = questionCard(q, { revealed: true, chosen: Number.isInteger(chosen) ? chosen : null, index: study.idx + 1, total: study.list.length }) +
      `<div class="nav-row"><div class="btn-row">
        <button class="btn secondary" id="aPrev" ${study.idx === 0 ? "disabled" : ""}>‹ Poprz.</button>
        <button class="btn secondary" id="aNext" ${study.idx === study.list.length - 1 ? "disabled" : ""}>Nast. ›</button>
      </div><span class="note">${Number.isInteger(chosen) ? (isCorrect(q, chosen) ? "Twoja odpowiedź: poprawna ✔" : "Twoja odpowiedź: " + letter(chosen) + ") – błędna ✘") : "Bez odpowiedzi"}</span></div>`;
    const p = document.getElementById("aPrev"), n = document.getElementById("aNext");
    if (p) p.onclick = () => { if (study.idx > 0) { study.idx--; renderReview(); } };
    if (n) n.onclick = () => { if (study.idx < study.list.length - 1) { study.idx++; renderReview(); } };
  }

  // ---------- Eksport ----------
  window.Apoz = { route, homeHook, onAuth, ensureLoaded, _status: () => status };
})();
