/* ===== Rejestr aktów prawnych + linkowanie przypisów =====
 * Linki do oficjalnego ISAP (isap.sejm.gov.pl) – strona aktu (DocDetails),
 * skąd dostępny jest zawsze aktualny tekst ujednolicony.
 * Normy PN/PKN są płatne – linki prowadzą do katalogu PKN (sklep.pkn.pl).
 */
(function () {
  const ISAP = id => "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=" + id;

  // Rejestr aktów (kolejność = priorytet dopasowania; bardziej szczegółowe wyżej)
  const ACTS = [
    { key: "wt-projekt", short: "PROJEKT nowych WT (9.06.2025) – akt nieobowiązujący", kind: "projekt",
      name: "PROJEKT rozporządzenia Ministra Rozwoju i Technologii w sprawie warunków technicznych, jakim powinny odpowiadać budynki i ich usytuowanie (projekt z 9.06.2025 r.)",
      url: "https://legislacja.rcl.gov.pl/", re: /projekt\w*\s+WT|PROJEKT WT|projektu WT|nowych WT|projekt rozporządzenia.*warunk\w* technicznych/i },

    { key: "uzgadnianie", short: "rozp. o uzgadnianiu projektu (2021)", kind: "rozp",
      name: "Rozporządzenie MSWiA z 17.09.2021 r. w sprawie uzgadniania projektu … pod względem ochrony przeciwpożarowej (Dz.U. 2021 poz. 1722)",
      url: ISAP("WDU20210001722"), re: /uzgadnian|uzgodnien|poz\. 1722|17\.09\.2021|scenariusz po/i },

    { key: "odpady-rozp", short: "rozp. o ochronie ppoż. miejsc magazynowania odpadów (2020)", kind: "rozp",
      name: "Rozporządzenie MSWiA z 19.02.2020 r. w sprawie wymagań ochrony ppoż. dla miejsc zbierania, magazynowania i przetwarzania odpadów (Dz.U. 2020 poz. 296)",
      url: ISAP("WDU20200000296"), re: /poz\. 296|19\.02\.2020|magazynowani\w* odpad|odpad\w* stał/i },

    { key: "odpady-ustawa", short: "ustawa o odpadach", kind: "ustawa",
      name: "Ustawa z 14.12.2012 r. o odpadach",
      url: ISAP("WDU20130000021"), re: /ustaw\w* o odpadach|operat przeciwpo/i },

    { key: "paliwa", short: "rozp. o bazach i stacjach paliw (2005)", kind: "rozp",
      name: "Rozporządzenie MG z 21.11.2005 r. w sprawie warunków technicznych baz i stacji paliw płynnych … (Dz.U. 2005 nr 243 poz. 2063)",
      url: ISAP("WDU20052432063"), re: /baz\w*.{0,20}stacj\w* paliw|stacj\w* paliw|21\.11\.2005|bazy paliw|stacj\w* gazu p|zbiornik\w* paliw|urządzeni\w* pianow|produkt\w* naftow/i },

    { key: "gaz-sieci", short: "rozp. o sieciach gazowych (2013)", kind: "rozp",
      name: "Rozporządzenie MG z 26.04.2013 r. w sprawie warunków technicznych sieci gazowych (Dz.U. 2013 poz. 640)",
      url: ISAP("WDU20130000640"), re: /sieci gazow|26\.04\.2013|tłoczni/i },

    { key: "metro", short: "rozp. o obiektach metra (2011)", kind: "rozp",
      name: "Rozporządzenie MI z 17.06.2011 r. w sprawie warunków technicznych obiektów budowlanych metra (Dz.U. 2011 nr 144 poz. 859)",
      url: ISAP("WDU20111440859"), re: /metr[ao]\b|obiekt\w* metra/i },

    { key: "drogi-inz", short: "rozp. o drogowych obiektach inżynierskich", kind: "rozp",
      name: "Rozporządzenie MTiGM z 30.05.2000 r. w sprawie warunków technicznych drogowych obiektów inżynierskich (Dz.U. 2000 nr 63 poz. 735)",
      url: ISAP("WDU20000630735"), re: /drogow\w* obiekt\w* in|tunel\w* drogow|drogowych obiekt/i },

    { key: "rolnicze", short: "rozp. o budowlach rolniczych", kind: "rozp",
      name: "Rozporządzenie w sprawie warunków technicznych budowli rolniczych i ich usytuowania",
      url: ISAP("WDU20230000297"), re: /budowl\w* rolnicz|budowli rolnicz|silos|biogaz/i },

    { key: "men", short: "rozp. MEN o lokalu przedszkola", kind: "rozp",
      name: "Rozporządzenie MEN w sprawie wymagań ochrony ppoż. lokalu przedszkola (Dz.U. 2015 poz. 20 / 2017 / 2020)",
      url: ISAP("WDU20150000020"), re: /\bMEN\b|przedszkol/i },

    { key: "cyfryzacja", short: "rozp. Ministra Cyfryzacji (2019)", kind: "rozp",
      name: "Rozporządzenie Ministra Cyfryzacji z 4.12.2019 r. (usługi cyberbezpieczeństwa) (Dz.U. 2019 poz. 2479)",
      url: ISAP("WDU20190002479"), re: /Cyfryzacji|cyberbezpiecze|poz\. 2479/i },

    { key: "wyroby", short: "ustawa o wyrobach budowlanych", kind: "ustawa",
      name: "Ustawa z 16.04.2004 r. o wyrobach budowlanych",
      url: ISAP("WDU20040920881"), re: /wyrob\w* budowlan|jednostkow\w* zastosowan|krajow\w* ocen/i },

    { key: "pb", short: "ustawa – Prawo budowlane", kind: "ustawa",
      name: "Ustawa z 7.07.1994 r. – Prawo budowlane",
      url: ISAP("WDU19940890414"), re: /Prawo budowlane|przebudow|art\. 36a|art\. 56|art\. 3 pkt/i },

    { key: "rw", short: "rozp. o zaopatrzeniu w wodę i drogach pożarowych (2009)", kind: "rozp",
      name: "Rozporządzenie MSWiA z 24.07.2009 r. w sprawie przeciwpożarowego zaopatrzenia w wodę oraz dróg pożarowych (Dz.U. 2009 nr 124 poz. 1030)",
      url: ISAP("WDU20091241030"), re: /\bRW\b|zaopatrzeni\w* w wod|dróg po\w*|drog\w* po\w*|hydrant\w* zewn|zewnętrzn\w* gaszen/i },

    { key: "rpb", short: "rozp. o ochronie ppoż. budynków (2010)", kind: "rozp",
      name: "Rozporządzenie MSWiA z 7.06.2010 r. w sprawie ochrony ppoż. budynków, innych obiektów budowlanych i terenów (Dz.U. 2010 nr 109 poz. 719)",
      url: ISAP("WDU20101090719"), re: /\bRPB\b|ochron\w* przeciwpo\w* budynk|hydrant\w* wewn|zagrożon\w* wybuchem|świadectw\w* dopuszczen|instrukcj\w* bezpiecz|scenariusz\w* po/i },

    { key: "uop", short: "ustawa o ochronie przeciwpożarowej", kind: "ustawa",
      name: "Ustawa z 24.08.1991 r. o ochronie przeciwpożarowej (t.j. Dz.U. 2025 poz. 188)",
      url: ISAP("WDU19910810351"), re: /\bUOP\b|ustaw\w* o ochronie przeciwpo|art\. 6a|rzeczoznaw|art\. 4 ust/i },

    { key: "wt", short: "rozp. – warunki techniczne budynków (WT)", kind: "rozp",
      name: "Rozporządzenie MI z 12.04.2002 r. w sprawie warunków technicznych, jakim powinny odpowiadać budynki i ich usytuowanie (WT) (Dz.U. 2002 nr 75 poz. 690)",
      url: ISAP("WDU20020750690"), re: /\bWT\b|warunk\w* technicznych, jakim|§\s*\d+\s*WT/i },

    { key: "hotel", short: "ustawa o usługach hotelarskich", kind: "ustawa",
      name: "Ustawa o usługach hotelarskich oraz usługach pilotów wycieczek i przewodników turystycznych",
      url: "https://isap.sejm.gov.pl/isap.nsf/search.xsp?status=O&title=" + encodeURIComponent("usługach hotelarskich"), re: /usług\w* hotelar|hotelar/i },
  ];

  // Normy PN/PKN/CEN/SEP i akty UE
  function normLink(s) {
    const m = s.match(/(PN-EN ISO|PN-EN IEC|PKN-CEN\/TS|PN-EN|PN-B|PN-HD|PN-N|N SEP-E|Eurokod)\s*[\w\.\-\/:+]*/i);
    const code = m ? m[0].trim() : null;
    if (!code) return null;
    return {
      short: "Polska Norma (PKN)",
      name: "Polska Norma " + code + " – dokument płatny (katalog PKN)",
      url: "https://sklep.pkn.pl/catalogsearch/result/?q=" + encodeURIComponent(code.replace(/Eurokod\s*/i, "").trim() || code),
      kind: "norma", code: code
    };
  }
  function euLink(s) {
    return { short: "prawo UE (ATEX)", name: "Dyrektywa ATEX 2014/34/UE",
      url: "https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX:32014L0034", kind: "ue" };
  }

  // Akty pobrane lokalnie (PDF w folderze akty/) — dostępne offline
  const LOCAL = new Set(["wt", "uop", "rpb", "rw", "uzgadnianie", "odpady-rozp",
    "odpady-ustawa", "paliwa", "gaz-sieci", "metro", "drogi-inz", "rolnicze",
    "men", "cyfryzacja", "wyroby", "pb", "wt-projekt"]);
  ACTS.forEach(a => { if (LOCAL.has(a.key)) a.local = "akty/" + a.key + ".pdf"; });

  // Zwraca {url, local?, short, name, kind} dla pojedynczego przypisu prawnego lub null
  function actLink(legalStr) {
    if (!legalStr) return null;
    if (/PN-|PKN|CEN|N SEP|Eurokod/i.test(legalStr)) return normLink(legalStr);
    if (/ATEX|dyrektyw/i.test(legalStr)) return euLink(legalStr);
    for (const a of ACTS) { if (a.re.test(legalStr)) return a; }
    return null;
  }

  const BY_KEY = {};
  ACTS.forEach(a => BY_KEY[a.key] = a);

  window.ACTS_LIST = ACTS;
  window.ACT_BY_KEY = BY_KEY;
  window.actLink = actLink;
  window.normLink = normLink;
})();
