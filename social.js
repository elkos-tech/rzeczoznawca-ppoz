/* =====================================================================
   Rzeczoznawca PPOŻ – zgłoszenia błędów w pytaniach + czat użytkowników
   ---------------------------------------------------------------------
   Udostępnia window.Social. Ładowany PRZED app.js, żeby pierwsza karta
   pytania (np. wznowiona sesja) miała już przycisk „Zgłoś błąd".
   Z aplikacją rozmawia przez window.__APP (go, setTop), z serwerem przez
   window.Cloud. Bez skonfigurowanego serwera moduł niczego nie pokazuje.
   ===================================================================== */
(function () {
  "use strict";

  const app = document.getElementById("app");
  const A = () => window.__APP || {};
  const C = () => window.Cloud || {};
  const HTML = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => HTML[c]);
  const logged = () => !!(C().configured && C().user);
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  function showMsg(el, text, kind) {
    if (!el) return;
    el.className = "msg " + (kind || "info") + (text ? " show" : "");
    el.textContent = text || "";
  }
  function fmtWhen(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const p = n => String(n).padStart(2, "0");
    const hm = p(d.getHours()) + ":" + p(d.getMinutes());
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return hm;
    return p(d.getDate()) + "." + p(d.getMonth() + 1) + (d.getFullYear() !== now.getFullYear() ? "." + d.getFullYear() : "") + " " + hm;
  }
  function needLogin(what) {
    app.innerHTML = `
      <div class="intro"><h2>Wymagane zalogowanie</h2><p>${what}</p></div>
      <button class="btn" id="socToAcc">Przejdź do logowania</button>`;
    document.getElementById("socToAcc").onclick = () => A().go("account");
  }

  // ====================================================================
  //  ZGŁOSZENIA BŁĘDÓW
  // ====================================================================
  const SOURCE = { kgpsp: "Egzamin KG PSP", apoz: "Studia APOŻ", user: "Pytanie użytkownika" };
  const KIND = {
    answer: "Błędna odpowiedź w kluczu",
    content: "Błąd w treści pytania lub wariantach",
    explanation: "Błędne objaśnienie lub podstawa prawna",
    law: "Przepis się zmienił (pytanie nieaktualne)",
    other: "Inne"
  };
  const STATUS = {
    open: ["badge-priv", "⏳ czeka na rozpatrzenie"],
    accepted: ["badge-pub", "✔ zasadne"],
    rejected: ["badge-rej", "✘ niezasadne"]
  };

  let counts = {};                 // "kgpsp|12" -> liczba otwartych zgłoszeń
  const REG = new Map();           // dane pytania pod przyciskiem „Zgłoś błąd"
  const keyOf = (source, ref) => source + "|" + ref;

  /* Znaczek przy pytaniu, które ktoś już zgłosił. */
  function badge(source, ref) {
    const n = counts[keyOf(source, ref)] || 0;
    if (!n) return "";
    return `<span class="badge-rep" title="Do tego pytania wpłynęło zgłoszenie błędu – traktuj odpowiedź ostrożnie">⚑ zgłoszone${n > 1 ? " (" + n + ")" : ""}</span>`;
  }

  /* Pasek pod objaśnieniem. info = { source, ref, q, opts:[[litera, tekst]…], key:"b", cat } */
  function reportBar(info) {
    if (!C().configured) return "";
    const k = keyOf(info.source, info.ref);
    REG.set(k, info);
    return `<div class="report-bar" data-rkey="${esc(k)}">
      <button class="icon-toggle" data-report="${esc(k)}">⚑ Zgłoś błąd w pytaniu</button>
    </div>`;
  }

  function snapshotOf(info) {
    const snap = {
      q: String(info.q || "").slice(0, 1500),
      opts: (info.opts || []).slice(0, 8).map(o => [o[0], String(o[1] || "").slice(0, 400)]),
      key: info.key || "",
      cat: String(info.cat || "").slice(0, 160)
    };
    while (JSON.stringify(snap).length > 7000 && snap.opts.some(o => o[1].length > 120))
      snap.opts = snap.opts.map(o => [o[0], o[1].slice(0, Math.max(120, Math.floor(o[1].length * 0.7)))]);
    return snap;
  }

  function openForm(bar) {
    const info = REG.get(bar.dataset.rkey);
    if (!info) return;
    if (!logged()) {
      bar.innerHTML = `<div class="report-form">
        <p class="note">Zgłaszanie pytań do weryfikacji wymaga zalogowania — dzięki temu dostaniesz odpowiedź, czy zgłoszenie było zasadne.</p>
        <div class="btn-row"><button class="btn secondary" data-rep-login>Zaloguj się</button>
        <button class="btn ghost" data-rep-cancel>Anuluj</button></div></div>`;
      return;
    }
    bar.innerHTML = `<div class="report-form">
      <h4>Zgłoszenie pytania do weryfikacji</h4>
      <div class="field"><label>Co jest nie tak?</label>
        <select class="rep-kind">${Object.keys(KIND).map(k => `<option value="${k}">${esc(KIND[k])}</option>`).join("")}</select></div>
      <div class="field"><label>Poprawna odpowiedź Twoim zdaniem <span class="hint">opcjonalnie</span></label>
        <select class="rep-sug"><option value="">— nie wskazuję —</option>
          ${(info.opts || []).map(o => `<option value="${esc(o[0])}">${esc(o[0])}) ${esc(String(o[1]).slice(0, 70))}${String(o[1]).length > 70 ? "…" : ""}</option>`).join("")}
        </select></div>
      <div class="field"><label>Uzasadnienie <span class="hint">przepis, norma albo inne źródło</span></label>
        <textarea class="rep-comment" rows="4" maxlength="2000" placeholder="Np. § 256 ust. 3 WT podaje 40 m, a klucz wskazuje 60 m."></textarea></div>
      <div class="msg rep-msg"></div>
      <div class="btn-row">
        <button class="btn" data-rep-send>Wyślij zgłoszenie</button>
        <button class="btn ghost" data-rep-cancel>Anuluj</button>
      </div></div>`;
    const ta = bar.querySelector(".rep-comment");
    if (ta) ta.focus();
  }

  function closeForm(bar) {
    const k = bar.dataset.rkey;
    bar.innerHTML = `<button class="icon-toggle" data-report="${esc(k)}">⚑ Zgłoś błąd w pytaniu</button>`;
  }

  async function sendForm(bar, btn) {
    const info = REG.get(bar.dataset.rkey);
    const msg = bar.querySelector(".report-form .msg");   // showMsg podmienia klasy, więc nie szukamy po .rep-msg
    const comment = bar.querySelector(".rep-comment").value.trim();
    if (comment.length < 5) return showMsg(msg, "Opisz krótko, co jest nie tak (min. 5 znaków).", "bad");
    btn.disabled = true; btn.textContent = "Wysyłam…";
    try {
      await C().reportCreate({
        source: info.source, ref: info.ref,
        kind: bar.querySelector(".rep-kind").value,
        suggested: bar.querySelector(".rep-sug").value,
        comment: comment, snapshot: snapshotOf(info)
      });
      const k = bar.dataset.rkey;
      counts[k] = (counts[k] || 0) + 1;
      adminOpen = null;
      bar.innerHTML = `<div class="msg ok show">Dziękujemy — zgłoszenie wysłane. Jego status znajdziesz w „Zgłoszenia błędów” na ekranie głównym.</div>`;
    } catch (err) {
      btn.disabled = false; btn.textContent = "Wyślij zgłoszenie";
      showMsg(msg, err.message, "bad");
    }
  }

  // jeden nasłuch dla wszystkich kart pytań (KG PSP i APOŻ)
  app.addEventListener("click", e => {
    const t = e.target.closest ? e.target.closest("[data-report],[data-rep-send],[data-rep-cancel],[data-rep-login]") : null;
    if (!t) return;
    const bar = t.closest(".report-bar");
    if (!bar) return;
    if (t.hasAttribute("data-report")) openForm(bar);
    else if (t.hasAttribute("data-rep-cancel")) closeForm(bar);
    else if (t.hasAttribute("data-rep-login")) A().go("account");
    else if (t.hasAttribute("data-rep-send")) sendForm(bar, t);
  });

  async function loadCounts() {
    if (!logged() || !C().reportCounts) { counts = {}; return; }
    try { counts = await C().reportCounts(); } catch (e) { /* tabela może jeszcze nie istnieć */ }
  }

  // ---------- ekran „Zgłoszenia błędów" ----------
  let repTab = null;
  function reportItem(r, admin) {
    const s = r.snapshot || {};
    const st = STATUS[r.status] || STATUS.open;
    const opts = (s.opts || []).map(o => {
      const isKey = String(s.key || "").split(/[,\s]+/).indexOf(o[0]) >= 0;
      const isSug = r.suggested && r.suggested === o[0];
      return `<div class="mod-opt ${isKey ? "ok" : ""} ${isSug ? "sug" : ""}"><b>${esc(o[0])})</b> ${esc(o[1])}${isKey ? " ✔ klucz" : ""}${isSug ? " ◀ propozycja zgłaszającego" : ""}</div>`;
    }).join("");
    let actions = "";
    if (admin && r.status === "open") {
      actions = `<div class="field" style="margin-top:10px">
          <input class="repNote" placeholder="Odpowiedź dla zgłaszającego (opcjonalnie)" maxlength="1000"></div>
        <div class="btn-row">
          <button class="btn" data-rep-ok="${r.id}">✔ Zasadne</button>
          <button class="btn secondary" data-rep-no="${r.id}">✘ Niezasadne</button>
        </div>`;
    } else if (admin) {
      actions = `<div class="btn-row"><button class="icon-toggle danger" data-rep-del="${r.id}">Usuń zgłoszenie</button></div>`;
    } else if (r.isMine && r.status === "open") {
      actions = `<div class="btn-row"><button class="icon-toggle danger" data-rep-del="${r.id}">Wycofaj zgłoszenie</button></div>`;
    }
    return `<div class="mod-item" data-id="${r.id}">
      <div class="qmeta">
        <span class="cat">${esc(SOURCE[r.source] || r.source)}</span>
        <span class="${st[0]}">${st[1]}</span>
        <span class="num">${esc(fmtWhen(r.createdAt))}${admin ? " · " + esc(r.nick) : ""} · ${esc(r.ref)}</span>
      </div>
      ${s.cat ? `<div class="mod-exp">${esc(s.cat)}</div>` : ""}
      <div class="qtext">${esc(s.q || "(brak treści pytania)")}</div>
      <div class="mod-opts">${opts}</div>
      <div class="mod-exp"><b>Rodzaj:</b> ${esc(KIND[r.kind] || r.kind)}</div>
      <div class="mod-exp"><b>Uzasadnienie:</b> ${esc(r.comment)}</div>
      ${r.adminNote ? `<div class="mod-exp rep-answer"><b>Odpowiedź administratora:</b> ${esc(r.adminNote)}</div>` : ""}
      ${actions}
    </div>`;
  }

  function renderReports(tab) {
    const Cl = C();
    A().setTop("Zgłoszenia błędów", true);
    if (!Cl.configured) return app.innerHTML = `<div class="intro"><h2>Niedostępne w trybie offline</h2><p>Zgłoszenia wymagają konta.</p></div>`;
    if (!Cl.user) return needLogin("Zgłoszenia pytań do weryfikacji są przypisane do konta.");
    const admin = !!Cl.isAdmin;
    repTab = tab || repTab || (admin ? "open" : "mine");
    if (!admin) repTab = "mine";

    const tabs = admin ? `<div class="tabs" id="repTabs">
        <button class="tab ${repTab === "open" ? "active" : ""}" data-t="open">Do rozpatrzenia</button>
        <button class="tab ${repTab === "done" ? "active" : ""}" data-t="done">Rozpatrzone</button>
        <button class="tab ${repTab === "mine" ? "active" : ""}" data-t="mine">Moje</button>
      </div>` : "";
    app.innerHTML = `
      <div class="intro">
        <h2>Zgłoszenia pytań do weryfikacji</h2>
        <p>${admin
          ? "Zgłoszenia od użytkowników. Po rozpatrzeniu zgłaszający zobaczy status i Twoją odpowiedź. Sam klucz poprawia się w plikach bazy."
          : "Tu widzisz swoje zgłoszenia i decyzję administratora. Nowe zgłoszenie wyślesz przyciskiem „⚑ Zgłoś błąd w pytaniu” pod objaśnieniem dowolnego pytania."}</p>
      </div>
      ${tabs}
      <div class="msg" id="repListMsg"></div>
      <div id="repList"><p class="note">Wczytywanie…</p></div>`;
    app.querySelectorAll("#repTabs .tab").forEach(t => t.onclick = () => renderReports(t.dataset.t));

    const box = document.getElementById("repList"), msg = document.getElementById("repListMsg");
    const mode = repTab, asAdmin = admin && mode !== "mine";
    const load = mode === "mine" ? Cl.reportsMine() : Cl.reportsAll(mode === "open");
    load.then(list => {
      if (!document.getElementById("repList") || repTab !== mode) return;
      if (mode === "open") adminOpen = { n: list.length, at: Date.now() };
      if (!list.length) {
        box.innerHTML = `<p class="note">${mode === "open" ? "Brak zgłoszeń do rozpatrzenia 🎉" : mode === "done" ? "Brak rozpatrzonych zgłoszeń." : "Nie masz jeszcze żadnych zgłoszeń."}</p>`;
        return;
      }
      box.innerHTML = list.map(r => reportItem(r, asAdmin)).join("");
      const resolve = async (btn, id, status) => {
        const item = btn.closest(".mod-item");
        const note = (item.querySelector(".repNote") || {}).value || "";
        btn.disabled = true;
        try {
          await Cl.reportResolve(id, status, note.trim());
          item.remove(); adminOpen = null; loadCounts();
          showMsg(msg, status === "accepted" ? "Zgłoszenie uznane za zasadne." : "Zgłoszenie oznaczone jako niezasadne.", "ok");
          if (!box.querySelector(".mod-item")) renderReports(mode);
        } catch (err) { btn.disabled = false; showMsg(msg, err.message, "bad"); }
      };
      box.querySelectorAll("[data-rep-ok]").forEach(b => b.onclick = () => resolve(b, parseInt(b.dataset.repOk, 10), "accepted"));
      box.querySelectorAll("[data-rep-no]").forEach(b => b.onclick = () => resolve(b, parseInt(b.dataset.repNo, 10), "rejected"));
      box.querySelectorAll("[data-rep-del]").forEach(b => b.onclick = async () => {
        if (!confirm(asAdmin ? "Usunąć to zgłoszenie na stałe?" : "Wycofać to zgłoszenie?")) return;
        b.disabled = true;
        try {
          await Cl.reportDelete(parseInt(b.dataset.repDel, 10));
          b.closest(".mod-item").remove(); adminOpen = null; loadCounts();
          if (!box.querySelector(".mod-item")) renderReports(mode);
        } catch (err) { b.disabled = false; showMsg(msg, err.message, "bad"); }
      });
    }).catch(err => {
      if (document.getElementById("repList")) box.innerHTML = `<p class="pending">${esc(err.message)}</p>`;
    });
  }

  // ====================================================================
  //  CZAT
  // ====================================================================
  const SEEN_KEY = "rzppoz_chat_seen";
  let chat = null;                 // { ids:Set, lastId, oldestId, unsub, timer }

  function linkify(text) {
    return esc(text).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]]/g,
      u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
  }
  function msgHTML(m) {
    const canDel = m.isMine || C().isAdmin;
    return `<div class="chat-msg ${m.isMine ? "mine" : ""}" data-mid="${m.id}">
      <div class="chat-head"><b>${esc(m.nick)}</b><span>${esc(fmtWhen(m.createdAt))}</span>
        ${canDel ? `<button class="chat-del" data-del="${m.id}" title="Usuń wiadomość" aria-label="Usuń wiadomość">×</button>` : ""}</div>
      <div class="chat-body">${linkify(m.body)}</div>
    </div>`;
  }
  function chatList() { return document.getElementById("chatList"); }
  function nearBottom(el) { return el.scrollHeight - el.scrollTop - el.clientHeight < 120; }

  function addMessages(list, where) {
    const el = chatList();
    if (!chat || !el) return;
    const fresh = list.filter(m => m && !chat.ids.has(m.id));
    if (!fresh.length) return;
    fresh.forEach(m => chat.ids.add(m.id));
    const empty = el.querySelector(".chat-empty");
    if (empty) empty.remove();
    const html = fresh.map(msgHTML).join("");
    if (where === "top") {
      const before = el.scrollHeight;
      const more = el.querySelector(".chat-more");
      if (more) more.insertAdjacentHTML("afterend", html); else el.insertAdjacentHTML("afterbegin", html);
      el.scrollTop += el.scrollHeight - before;          // nie przeskakuj przy dociąganiu starszych
      chat.oldestId = Math.min(chat.oldestId || Infinity, ...fresh.map(m => m.id));
    } else {
      const stick = nearBottom(el) || fresh.some(m => m.isMine);
      el.insertAdjacentHTML("beforeend", html);
      if (stick) el.scrollTop = el.scrollHeight;
      chat.lastId = Math.max(chat.lastId || 0, ...fresh.map(m => m.id));
      if (!chat.oldestId) chat.oldestId = Math.min(...fresh.map(m => m.id));
      lsSet(SEEN_KEY, chat.lastId);
      unread = { n: 0, at: Date.now() };
    }
  }
  function removeMessage(id) {
    const el = chatList();
    if (!el) return;
    const node = el.querySelector(`[data-mid="${id}"]`);
    if (node) node.remove();
  }

  function leaveChat() {
    if (!chat) return;
    try { if (chat.unsub) chat.unsub(); } catch (e) {}
    if (chat.timer) clearInterval(chat.timer);
    chat = null;
  }

  function renderChat() {
    const Cl = C();
    leaveChat();
    A().setTop("Czat", true);
    if (!Cl.configured) return app.innerHTML = `<div class="intro"><h2>Niedostępne w trybie offline</h2><p>Czat wymaga konta.</p></div>`;
    if (!Cl.user) return needLogin("Czat jest dostępny dla zalogowanych użytkowników.");

    app.innerHTML = `
      <div class="chat">
        <p class="note chat-rules">Wspólna rozmowa wszystkich zalogowanych. Wiadomości są podpisane pseudonimem.
          Nie wklejaj danych osobowych. Błąd w konkretnym pytaniu zgłaszaj przyciskiem „⚑ Zgłoś błąd” przy pytaniu.</p>
        <div class="chat-list" id="chatList"><p class="note chat-empty">Wczytywanie…</p></div>
        <div class="msg" id="chatMsg"></div>
        <form class="chat-form" id="chatForm">
          <textarea id="chatInput" rows="2" maxlength="1000" placeholder="Napisz wiadomość… (Enter wysyła, Shift+Enter nowa linia)"></textarea>
          <button class="btn" id="chatSend" type="submit">Wyślij</button>
        </form>
      </div>`;
    const me = chat = { ids: new Set(), lastId: 0, oldestId: 0, unsub: null, timer: null };
    const el = chatList(), msg = document.getElementById("chatMsg");
    const input = document.getElementById("chatInput"), sendBtn = document.getElementById("chatSend");

    Cl.chatLoad({ limit: 50 }).then(list => {
      if (chat !== me || !chatList()) return;
      el.innerHTML = list.length >= 50 ? `<button class="icon-toggle chat-more" id="chatMore">Wczytaj starsze</button>` : "";
      if (!list.length) el.innerHTML = `<p class="note chat-empty">Nikt jeszcze nic nie napisał. Zacznij rozmowę.</p>`;
      addMessages(list);
      el.scrollTop = el.scrollHeight;
      const more = document.getElementById("chatMore");
      if (more) more.onclick = async () => {
        more.disabled = true;
        try {
          const older = await Cl.chatLoad({ before: me.oldestId, limit: 50 });
          if (chat !== me) return;
          addMessages(older, "top");
          if (older.length < 50) more.remove(); else more.disabled = false;
        } catch (err) { more.disabled = false; showMsg(msg, err.message, "bad"); }
      };
      // na żywo + zapas: dociąganie co 15 s (gdy Realtime jest wyłączony albo zerwie połączenie)
      me.unsub = Cl.chatSubscribe(m => { if (chat === me) addMessages([m]); }, id => { if (chat === me) removeMessage(id); });
      me.timer = setInterval(async () => {
        if (chat !== me || !chatList()) return leaveChat();
        if (document.hidden) return;
        try { addMessages(await Cl.chatLoad({ after: me.lastId, limit: 50 })); } catch (e) {}
      }, 15000);
    }).catch(err => {
      if (chat === me && chatList()) el.innerHTML = `<p class="pending">${esc(err.message)}</p>`;
    });

    const send = async () => {
      const text = input.value.trim();
      if (!text) return;
      sendBtn.disabled = true;
      try {
        const m = await Cl.chatSend(text);
        if (chat !== me) return;
        input.value = ""; showMsg(msg, "");
        if (m) addMessages([m]);
      } catch (err) { showMsg(msg, err.message, "bad"); }
      sendBtn.disabled = false;
      input.focus();
    };
    document.getElementById("chatForm").onsubmit = e => { e.preventDefault(); send(); };
    input.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
    el.onclick = async e => {
      const b = e.target.closest ? e.target.closest("[data-del]") : null;
      if (!b) return;
      if (!confirm("Usunąć tę wiadomość?")) return;
      const id = parseInt(b.dataset.del, 10);
      try { await Cl.chatDelete(id); removeMessage(id); }
      catch (err) { showMsg(msg, err.message, "bad"); }
    };
  }

  // ====================================================================
  //  EKRAN GŁÓWNY – liczniki na kafelkach
  // ====================================================================
  let unread = null, adminOpen = null;       // { n, at } – pamiętane przez minutę
  const FRESH = 60000;
  function paintHome() {
    const c = document.getElementById("chatNew"), r = document.getElementById("repNew");
    const n = unread ? unread.n : 0, d = n % 10, h = n % 100;
    const word = n === 1 ? "nowa" : (d >= 2 && d <= 4 && !(h >= 12 && h <= 14)) ? "nowe" : "nowych";
    if (c) c.innerHTML = n ? ` <span class="pill">${n > 99 ? "99+ nowych" : n + " " + word}</span>` : "";
    if (r) r.innerHTML = adminOpen && adminOpen.n ? ` <span class="pill">${adminOpen.n} do rozpatrzenia</span>` : "";
  }
  function homeHook() {
    if (!logged()) return;
    paintHome();
    const Cl = C(), now = Date.now();
    if (!unread || now - unread.at > FRESH) {
      unread = { n: unread ? unread.n : 0, at: now };
      Cl.chatUnread(lsGet(SEEN_KEY) || 0).then(n => { unread = { n, at: Date.now() }; paintHome(); }).catch(() => {});
    }
    if (Cl.isAdmin && (!adminOpen || now - adminOpen.at > FRESH)) {
      adminOpen = { n: adminOpen ? adminOpen.n : 0, at: now };
      Cl.reportsAll(true).then(l => { adminOpen = { n: l.length, at: Date.now() }; paintHome(); }).catch(() => {});
    }
  }

  // ====================================================================
  //  Spięcie z aplikacją
  // ====================================================================
  function route(view, arg) {
    if (view === "chat") renderChat();
    else renderReports(arg);
  }
  function leave(nextView) { if (nextView !== "chat") leaveChat(); }
  function onAuth(ev) {
    unread = null; adminOpen = null; repTab = null;   // inne konto = inne uprawnienia i zakładka
    if (ev === "logout") { counts = {}; leaveChat(); return; }
    loadCounts();
  }

  window.Social = { route, leave, onAuth, homeHook, reportBar, badge, _counts: () => counts };
})();
