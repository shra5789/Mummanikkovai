"""Build src/texts/<id>.js for a Tamil divya prabandham from a prapatti.com PDF.

First repair the PDF text with extract_pdf.py, then:

  # a whole work: its taniyans, then every pāsuram (e.g. tiruppaavai.pdf)
  python tools/build_tamil_prabandham.py tiruppaavai.txt tiruppavai > src/texts/tiruppavai.js

  # one decade out of a larger work (e.g. Periyāḻvār Tirumoḻi 2.7, pūccūṭṭal), optionally with
  # the work's taniyans in front
  python tools/build_tamil_prabandham.py periyaazvaartirumozi.txt puccuttal --section 2.7 > src/texts/puccuttal.js
  python tools/build_tamil_prabandham.py periyaazvaartirumozi.txt tirupallandu --section 1.1 --taniyans > ...

Verses are numbered 1, 2, 3 … in the output. Taniyans get negative numbers (-1, -2, …) and the
label தனியன். A pāsuram whose first line starts with ‡ is chanted twice, so it appears twice in
`order`. Grantha subscripts (₂ ₃ ₄) in the Sanskrit taniyans are kept as prapatti.com prints them.
"""
import argparse, json, re, sys

ap = argparse.ArgumentParser()
ap.add_argument('text'); ap.add_argument('id')
ap.add_argument('--section', help='decade number, e.g. 2.7, to take just that decade')
ap.add_argument('--taniyans', action='store_true', help='with --section: put the work\'s taniyans first')
ap.add_argument('--extra-taniyans', metavar='TEXT:FIRST-LAST',
                help='put numbered taniyans from another repaired text first, e.g. '
                     'naalaayirattaniyangal_vad.txt:1-5 (chanted before the work\'s own taniyans)')
ap.add_argument('--desika', action='store_true',
                help='a Dēśika prabandham PDF: no "தனியன்கள்" heading; everything before pāsuram 1 is taniyans')
ap.add_argument('--revision', type=int, default=1,
                help='bump when the lines change, so the app drops timings synced to the old lines')
args = ap.parse_args()

raw = [l.strip() for l in open(args.text, encoding='utf-8').read().splitlines()]

JUNK = re.compile(r'^(ஶ்ரீ:|ஶ்ரீமதே .*நம:|www\.prapatti\.com|\d+|Sunder Kidāmbi|This document has been prepared by|'
                  r'with the blessings of|His Holiness .*|ஶ்ரீ ரங்க₃ராமாநுஜ மஹாதே₃ஶிகன்|தனியன்கள்|.* அருளிச்செய்த.*|'
                  r'.*திருவடிகளே சரணம்.*|\d+(\.\d+)* – .*|.*\. \. \. .*)$')
SANSKRIT = re.compile(r'[₁₂₃₄ஶஸஷஜஹ]')
VERSE_END = re.compile(r'॥\s*॥\s*([\d.]+)\s*॥\s*॥\s*$')

def taniyans_after(start):
    """Taniyan blocks from the line after `start` up to the first line starting with ‡ (pāsuram 1)."""
    blocks, cur, k = [], [], start + 1
    while k < len(raw) and not raw[k].startswith('‡') and not raw[k].endswith('முற்றிற்று'):
        l = raw[k]; k += 1
        if not l or JUNK.match(l) or l in titles:
            continue
        cur.append(l)
        sanskrit = SANSKRIT.search(cur[0]) is not None
        # a Sanskrit taniyan ends with "॥ ॥"; a Tamil one at its first line without ⋆
        if (sanskrit and l.endswith('॥ ॥')) or (not sanskrit and not l.endswith('⋆') and not l.endswith('॥')):
            blocks.append(cur); cur = []
    if cur:
        blocks.append(cur)
    return blocks

# page headers repeat the work's title; collect lines that occur on many pages
from collections import Counter
counts = Counter(l for l in raw if l and '⋆' not in l and '॥' not in l)
titles = {l for l, n in counts.items() if n >= 3 and not JUNK.match(l)}

taniyan_blocks, verse_lines = [], []
if args.section:
    head = re.compile(r'^' + re.escape(args.section) + r' – ')
    start = next(k for k, l in enumerate(raw) if head.match(l) and '. .' not in l)
    any_head = re.compile(r'^\d+\.\d+ – ')
    end = next((k for k in range(start + 1, len(raw)) if any_head.match(raw[k]) and not head.match(raw[k])), len(raw))
    body = raw[start + 1:end]
    if args.taniyans:
        t = next(k for k, l in enumerate(raw) if l == 'தனியன்கள்')
        taniyan_blocks = taniyans_after(t)
elif args.desika:
    doc_title = next(l for l in raw if l and not JUNK.match(l))
    clean_raw = [l for l in raw if l and not JUNK.match(l) and l not in titles and l != doc_title]
    k1 = next(k for k, l in enumerate(clean_raw) if (m := VERSE_END.search(l)) and m.group(1) == '1')
    blocks, cur = [], []
    for l in clean_raw[:k1 + 1]:
        cur.append(l)
        sanskrit = SANSKRIT.search(cur[0]) is not None
        # a Sanskrit taniyan ends with "॥ ॥"; a Tamil one (four lines) at a line without ⋆
        if VERSE_END.search(l) or (sanskrit and l.endswith('॥ ॥')) or \
                (not sanskrit and len(cur) >= 4 and not l.endswith('⋆') and not l.endswith('॥')):
            blocks.append(cur); cur = []
    taniyan_blocks, verse1 = blocks[:-1], blocks[-1]
    rest = clean_raw[k1 + 1:]
    end = next((k for k, l in enumerate(rest) if l.endswith('முற்றிற்று') or l.startswith('அடிவரவு')), len(rest))
    body = verse1 + rest[:end]
else:
    t = next(k for k, l in enumerate(raw) if l == 'தனியன்கள்')
    taniyan_blocks = taniyans_after(t)
    first = next(k for k in range(t, len(raw)) if raw[k].startswith('‡'))
    end = next(k for k in range(first, len(raw)) if raw[k].endswith('முற்றிற்று') or raw[k].startswith('அடிவரவு'))
    body = raw[first:end]

out, repeated, verse, buf = [], set(), 1, []
for l in body:
    if not l or JUNK.match(l) or l in titles or l.startswith('அடிவரவு') or l.endswith('முற்றிற்று'):
        continue
    if not buf and l.startswith('‡'):
        repeated.add(verse)
    buf.append(l)
    if VERSE_END.search(l):
        for b in buf:
            text = re.sub(r'॥.*$', '', b)
            text = re.sub(r'[⋆‡]', '', text)
            out.append({'v': verse, 'text': re.sub(r'\s+', ' ', text).strip()})
        verse += 1; buf = []

if args.extra_taniyans:
    path, rng = args.extra_taniyans.rsplit(':', 1)
    first_n, last_n = map(int, rng.split('-'))
    extra, cur = {}, []
    for l in (x.strip() for x in open(path, encoding='utf-8').read().splitlines()):
        if not l or JUNK.match(l) or 'தனியன்கள்' in l or 'ஸம்ப்ரதாய' in l:
            continue
        cur.append(l)
        m = VERSE_END.search(l)
        if m:
            extra[int(m.group(1))] = [re.sub(r'\s*॥.*$', '', x) for x in cur]; cur = []
    taniyan_blocks = [extra[k] for k in range(first_n, last_n + 1)] + taniyan_blocks

lines = []
for n, block in enumerate(taniyan_blocks, 1):
    for l in block:
        text = re.sub(r'\s+', ' ', re.sub(r'[⋆‡॥]', '', l)).strip()
        text = re.sub(r'\s+-$', '-', text)  # a compound running on into the next line keeps its hyphen attached
        for a, b in {'பாரொன்ற ச்சொன்ன': 'பாரொன்றச் சொன்ன', 'வானேற ப்போமளவும்': 'வானேறப் போமளவும்'}.items():
            text = text.replace(a, b)  # glyph-gap glitches in Swami Dēśikan's taniyan
        lines.append({'v': -n, 'text': text})
lines += out

verses = sorted({o['v'] for o in out})
order = [-n for n in range(1, len(taniyan_blocks) + 1)] + [v for v in verses for _ in range(2 if v in repeated else 1)]
labels = {str(-n): 'தனியன்' for n in range(1, len(taniyan_blocks) + 1)}

src = args.text.rsplit('/', 1)[-1]
print(f'// Generated by tools/build_tamil_prabandham.py from prapatti.com\'s {src.replace(".txt", ".pdf")}'
      + (f' (decade {args.section})' if args.section else '') + '.')
print('// v = pāsuram number (negative = taniyan). order: verses in the order they are chanted;')
print('// pāsurams marked ‡ in the PDF are said twice.')
print('window.SLOKAM_TEXTS = window.SLOKAM_TEXTS || {};')
print(f'window.SLOKAM_TEXTS[{json.dumps(args.id)}] = {{')
print(f'  revision: {args.revision},')
print(f'  verseWord: "பாசுரம்", verseCount: {len(verses)}, labels: {json.dumps(labels, ensure_ascii=False)},')
print(f'  order: {json.dumps(order)},')
print('  lines: [')
for o in lines:
    print('    ' + json.dumps(o, ensure_ascii=False) + ',')
print('  ],')
print('};')
