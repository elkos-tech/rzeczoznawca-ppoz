# -*- coding: utf-8 -*-
"""Buduje indeks paragrafow/artykulow z PDF-ow aktow i generuje quotes.js z cytatami."""
import fitz, re, os, json, sys, glob
sys.stdout.reconfigure(encoding='utf-8')

PROJ = r"C:/Users/kose9456/Documents/CLAUDE/RzeczoznawcaPPOZ"
AKTY = os.path.join(PROJ, "akty")

def norm(s):
    s = s.replace('\u00ad', '')
    s = re.sub(r'-\s*\n\s*', '', s)
    s = re.sub(r'Dziennik Ustaw\s*[–-]\s*\d+\s*[–-]\s*Poz\.\s*\d+', ' ', s)
    s = re.sub(r'(?m)^\s*–\s*\d+\s*–\s*$', ' ', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

# Stare PDF-y Dz.U. (sprzed 2012) uzywaja czcionki CE – polskie znaki trafiaja na inne kody.
LEGACY_MAP = {'à': 'ą', 'ç': 'ć', '´': 'ę', '∏': 'ł', 'ƒ': 'ń', 'Ê': 'ś', 'ê': 'ź', '˝': 'ż',
              'Ñ': 'Ą', '¡': 'Ń', '¢': 'Ę', '¸': 'Ł', 'Â': 'Ś', '˚': 'Ż'}

def fix_legacy(t):
    """Naprawia kodowanie, jesli tekst ma duzo artefaktow starej czcionki."""
    hits = sum(t.count(c) for c in '∏˝Ê´àç')
    if hits < 50: return t
    for bad, good in LEGACY_MAP.items():
        t = t.replace(bad, good)
    return t

def load_text(key):
    p = os.path.join(AKTY, key + ".pdf")
    if not os.path.exists(p): return None
    return fix_legacy("\n".join(pg.get_text() for pg in fitz.open(p)))

def build_index(txt):
    """Zwraca {'§237': tekst, 'art.6a': tekst, ...}"""
    if not txt: return {}
    idx = {}
    for prefix, pat in (("§", r'(?m)^[ \t]*§\s*(\d+[a-z]?)\s*\.'),
                        ("art.", r'(?m)^[ \t]*Art\.\s*(\d+[a-z]?)\s*\.')):
        marks = [(m.group(1), m.start()) for m in re.finditer(pat, txt)]
        for i, (num, s) in enumerate(marks):
            end = marks[i + 1][1] if i + 1 < len(marks) else len(txt)
            body = norm(txt[s:end])
            key = prefix + num
            if key not in idx or len(body) > len(idx[key]):
                idx[key] = body
    return idx

# --- dopasowanie przypisu -> akt (odpowiednik acts.js) ---
ACT_RULES = [
    ("wt-projekt", r'projekt\w*\s+WT|PROJEKT WT|projektu WT|nowych WT'),
    ("uzgadnianie", r'uzgadnian|uzgodnien|poz\. 1722|17\.09\.2021|scenariusz po'),
    ("odpady-rozp", r'poz\. 296|19\.02\.2020|magazynowani\w* odpad|odpad\w* stał'),
    ("odpady-ustawa", r'ustaw\w* o odpadach|operat przeciwpo'),
    ("paliwa", r'baz\w*.{0,20}stacj\w* paliw|stacj\w* paliw|21\.11\.2005|bazy paliw|stacj\w* gazu p|zbiornik\w* paliw|urządzeni\w* pianow|produkt\w* naftow'),
    ("gaz-sieci", r'sieci gazow|26\.04\.2013|tłoczni'),
    ("metro", r'metr[ao]\b|obiekt\w* metra'),
    ("drogi-inz", r'drogow\w* obiekt\w* in|tunel\w* drogow|drogowych obiekt'),
    ("rolnicze", r'budowl\w* rolnicz|budowli rolnicz|silos|biogaz'),
    ("men", r'\bMEN\b|przedszkol'),
    ("cyfryzacja", r'Cyfryzacji|cyberbezpiecze|poz\. 2479'),
    ("wyroby", r'wyrob\w* budowlan|jednostkow\w* zastosowan|krajow\w* ocen'),
    ("pb", r'Prawo budowlane|przebudow|art\. 36a|art\. 56|art\. 3 pkt'),
    ("rw", r'\bRW\b|zaopatrzeni\w* w wod|dróg po\w*|drog\w* po\w*|hydrant\w* zewn|zewnętrzn\w* gaszen'),
    ("rpb", r'\bRPB\b|ochron\w* przeciwpo\w* budynk|hydrant\w* wewn|zagrożon\w* wybuchem|świadectw\w* dopuszczen|instrukcj\w* bezpiecz|scenariusz\w* po'),
    ("uop", r'\bUOP\b|ustaw\w* o ochronie przeciwpo|art\. 6a|rzeczoznaw|art\. 4 ust'),
    ("wt", r'\bWT\b|warunk\w* technicznych, jakim'),
]

# jawne skroty maja najwyzszy priorytet (przed dopasowaniem tematycznym)
EXPLICIT = [("wt-projekt", r'projekt\w*\s+WT|nowych WT'), ("wt", r'\bWT\b'),
            ("rpb", r'\bRPB\b'), ("rw", r'\bRW\b'), ("uop", r'\bUOP\b')]

def candidates_for(legal):
    """Lista kandydatow (akt) w kolejnosci priorytetu."""
    if re.search(r'PN-|PKN|CEN|N SEP|Eurokod', legal, re.I): return ["__norma__"]
    if re.search(r'ATEX|dyrektyw', legal, re.I): return ["__ue__"]
    out = []
    for key, pat in EXPLICIT:
        if re.search(pat, legal, re.I) and key not in out: out.append(key)
    for key, pat in ACT_RULES:
        if re.search(pat, legal, re.I) and key not in out: out.append(key)
    return out

def act_for(legal):
    c = candidates_for(legal)
    return c[0] if c else None

def ref_for(legal):
    """Zwraca ('§','237') lub ('art.','6a') lub None"""
    m = re.search(r'§\s*(\d+[a-z]?)', legal)
    if m: return "§", m.group(1)
    m = re.search(r'art\.\s*(\d+[a-z]?)', legal, re.I)
    if m: return "art.", m.group(1)
    return None

def ustep_of(legal):
    m = re.search(r'ust\.\s*(\d+)', legal)
    return m.group(1) if m else None

def extract_ustep(par, ust):
    m = re.search(r'(?:^§\s*\d+[a-z]?\.\s*|(?<=\s))' + ust + r'\.\s', par)
    if not m: return None
    nxt = re.search(r'\s' + str(int(ust) + 1) + r'\.\s', par[m.end():])
    end = m.end() + nxt.start() if nxt else len(par)
    return par[m.start():end].strip()

MAX = 900
def trim(s):
    if len(s) <= MAX: return s
    cut = s[:MAX]
    p = max(cut.rfind('. '), cut.rfind('; '))
    return (cut[:p + 1] if p > MAX * 0.5 else cut) + " […]"

def key_tokens(expl):
    """Tokeny rozrozniajace z objasnienia: liczby (z jednostkami) i dlugie slowa."""
    nums = re.findall(r'\d+(?:[.,]\d+)?', expl or "")
    words = [w.lower() for w in re.findall(r'[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{7,}', expl or "")]
    return set(nums), set(words)

def best_fragment(par, expl):
    """Gdy paragraf jest dlugi, wybiera fragment najlepiej pasujacy do objasnienia."""
    if len(par) <= MAX or not expl:
        return trim(par)
    nums, words = key_tokens(expl)
    # podziel na zdania / punkty
    parts = re.split(r'(?<=[.;])\s+(?=\d+\)|\d+\.\s|[A-ZĄĆĘŁŃÓŚŹŻ])', par)
    if len(parts) < 2:
        return trim(par)
    scores = []
    for i, p in enumerate(parts):
        pl = p.lower()
        sc = sum(3 for n in nums if n in p) + sum(1 for w in words if w in pl)
        scores.append(sc)
    best = max(range(len(parts)), key=lambda i: scores[i])
    if scores[best] == 0:
        return trim(par)
    # rozszerzaj okno wokol najlepszego fragmentu
    lo = hi = best
    total = len(parts[best])
    while total < MAX:
        grew = False
        if hi + 1 < len(parts) and total + len(parts[hi + 1]) < MAX:
            hi += 1; total += len(parts[hi]); grew = True
        if lo - 1 >= 0 and total + len(parts[lo - 1]) < MAX:
            lo -= 1; total += len(parts[lo]); grew = True
        if not grew: break
    frag = " ".join(parts[lo:hi + 1])
    head = re.match(r'^(§\s*\d+[a-z]?\.|Art\.\s*\d+[a-z]?\.)', par)
    pre = "" if lo == 0 else ((head.group(1) + " […] ") if head else "[…] ")
    post = "" if hi == len(parts) - 1 else " […]"
    return pre + frag + post

if __name__ == "__main__":
    IDX = {}
    for f in glob.glob(os.path.join(AKTY, "*.pdf")):
        k = os.path.basename(f)[:-4]
        IDX[k] = build_index(load_text(k))
    print("indeks:", {k: len(v) for k, v in IDX.items()})

    # zbierz pytania: oficjalne (batch_*.json) + nowe (questions-new.js)
    legal_by_q, expl_by_q = {}, {}
    for f in sorted(glob.glob(os.path.join(PROJ, "answers_data", "batch_*.json"))):
        for qid, v in json.load(open(f, encoding="utf-8")).items():
            legal_by_q[int(qid)] = v.get("legal", [])
            expl_by_q[int(qid)] = v.get("explanation", "")
    js = open(os.path.join(PROJ, "questions-new.js"), encoding="utf-8").read()
    for m in re.finditer(r'id:\s*(\d+),.*?explanation:\s*"((?:[^"\\]|\\.)*)".*?legal:\s*\[(.*?)\]', js, re.S):
        qid = int(m.group(1))
        expl_by_q[qid] = m.group(2)
        legal_by_q[qid] = re.findall(r'"([^"]+)"', m.group(3))

    out, stats = {}, {"ok": 0, "norma": 0, "ue": 0, "brak_ref": 0, "nie_znaleziono": 0, "brak_aktu": 0}
    for qid, legals in sorted(legal_by_q.items()):
        quotes = []
        for lg in legals:
            cands = candidates_for(lg)
            if cands == ["__norma__"]:
                quotes.append({"ref": lg, "kind": "norma"}); stats["norma"] += 1; continue
            if cands == ["__ue__"]:
                quotes.append({"ref": lg, "kind": "ue"}); stats["ue"] += 1; continue
            if not cands:
                stats["brak_aktu"] += 1; continue
            r = ref_for(lg)
            if not r:
                stats["brak_ref"] += 1; continue
            key = r[0] + r[1]
            # wybierz akt, w ktorym ten paragraf faktycznie istnieje
            ak = next((c for c in cands if IDX.get(c, {}).get(key)), None)
            par = IDX.get(ak, {}).get(key) if ak else None
            if not par:
                stats["nie_znaleziono"] += 1; continue
            ust = ustep_of(lg)
            txt = (extract_ustep(par, ust) if ust else None)
            txt = trim(txt) if txt else best_fragment(par, expl_by_q.get(qid, ""))
            quotes.append({"ref": lg, "kind": "akt", "act": ak,
                           "label": key.replace("§", "§ ").replace("art.", "art. "),
                           "text": txt})
            stats["ok"] += 1
        if quotes:
            out[qid] = quotes

    with open(os.path.join(PROJ, "quotes.js"), "w", encoding="utf-8") as fh:
        fh.write("/* Cytaty z aktow prawnych – generowane automatycznie z PDF-ow w akty/ (build_quotes.py).\n")
        fh.write("   kind: 'akt' = doslowny cytat przepisu; 'norma'/'ue' = cytat niedostepny. */\n")
        fh.write("window.QUOTES = " + json.dumps(out, ensure_ascii=False) + ";\n")
    print("statystyki:", stats)
    print("pytan z cytatami:", len(out), "/", len(legal_by_q))
