import pymupdf, re, sys
d = pymupdf.open(sys.argv[1])
lines = []
for p in d:
    for b in p.get_text('rawdict')['blocks']:
        for l in b.get('lines', []):
            chars = [c for s in l['spans'] for c in s['chars']]
            out = ''; prev = None
            for c in chars:
                if prev is not None and c['bbox'][0] - prev['bbox'][2] > 2.0 and c['c'] != ' ':
                    out += ' '
                out += c['c']; prev = c
            lines.append(out)
t = '\n'.join(lines)
t = re.sub('[¦¥§ȊȉȋȈ]', '\u0bbf', t)  # glyph variants of the ி vowel sign
C = '[க-ஹ]'
# pre-base vowel reorder
t = re.sub('([ெேை])(' + C + ')', r'\2\1', t)
t = t.replace('ொ', 'ொ').replace('ோ', 'ோ')
t = t.replace('ÁÁ', '॥').replace('Á', '॥')
t = re.sub(' +', ' ', t)
print(t)
