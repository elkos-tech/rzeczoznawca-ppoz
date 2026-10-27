# -*- coding: utf-8 -*-
"""Szuka przepisu po slowach kluczowych w indeksie aktow."""
import sys, re, json, glob, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
exec(open('build_quotes.py', encoding='utf-8').read().split('if __name__')[0])

IDX = {}
for f in glob.glob(os.path.join(AKTY, "*.pdf")):
    k = os.path.basename(f)[:-4]
    IDX[k] = build_index(load_text(k))

def find(act, *words, limit=4, width=600):
    hits = []
    for key, txt in IDX.get(act, {}).items():
        low = txt.lower()
        if all(w.lower() in low for w in words):
            pos = low.find(words[0].lower())
            hits.append((key, len(txt), txt[max(0, pos - 150):pos + width]))
    hits.sort(key=lambda h: h[1])
    print(f"--- {act}: {' + '.join(words)}  ({len(hits)} trafien) ---")
    for key, _, frag in hits[:limit]:
        print(f"[{key}] {frag}\n")

if __name__ == "__main__":
    a = sys.argv[1]
    find(a, *sys.argv[2:])
