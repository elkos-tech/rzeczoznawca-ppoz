# -*- coding: utf-8 -*-
import json, glob, os, sys
sys.stdout.reconfigure(encoding='utf-8')
here = os.path.dirname(os.path.abspath(__file__))
proj = os.path.dirname(here)

merged = {}
for f in sorted(glob.glob(os.path.join(here, 'batch_*.json'))):
    data = json.load(open(f, encoding='utf-8'))
    for k, v in data.items():
        merged[int(k)] = v

# sanity: answers valid
bad = [k for k, v in merged.items() if v.get('answer') not in ('a', 'b', 'c')]
if bad:
    print('BAD answers at ids:', bad)

# build answers.js
lines = []
lines.append('/* ===== Klucz odpowiedzi + objaśnienia + przypisy prawne =====')
lines.append(' * Generowane z answers_data/batch_*.json (merge.py).')
lines.append(' * verified:true = potwierdzone wprost w treści aktu prawnego; false = do weryfikacji (△).')
lines.append(' * Skróty aktow: WT (warunki techniczne 2002), RPB (ochrona ppoz. budynkow 2010),')
lines.append(' *   RW (zaopatrzenie w wode i drogi pozarowe 2009), UOP (ustawa o ochronie ppoz. 1991). */')
lines.append('window.ANSWERS = {')
for k in sorted(merged):
    v = merged[k]
    obj = {
        'answer': v['answer'],
        'explanation': v.get('explanation', ''),
        'legal': v.get('legal', []),
        'verified': bool(v.get('verified', False)),
    }
    lines.append(f'  "{k}": ' + json.dumps(obj, ensure_ascii=False) + ('' if k == max(merged) else ','))
lines.append('};')
out = '\n'.join(lines) + '\n'
open(os.path.join(proj, 'answers.js'), 'w', encoding='utf-8').write(out)

ver = sum(1 for v in merged.values() if v.get('verified'))
print('Total answers:', len(merged))
print('  verified (✔):', ver)
print('  to-verify (△):', len(merged) - ver)
print('  coverage:', f'{len(merged)}/560')
