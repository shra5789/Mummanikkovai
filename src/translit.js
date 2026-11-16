// Tamil script → Latin (ISO 15919 style) transliteration, e.g. மும்மணிக்கோவை → mummaṇikkōvai
(function () {
  const VOWELS = { 'அ': 'a', 'ஆ': 'ā', 'இ': 'i', 'ஈ': 'ī', 'உ': 'u', 'ஊ': 'ū', 'எ': 'e', 'ஏ': 'ē', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'ō', 'ஔ': 'au', 'ஃ': 'ḵ' };
  const CONS = {
    'க': 'k', 'ங': 'ṅ', 'ச': 'c', 'ஞ': 'ñ', 'ட': 'ṭ', 'ண': 'ṇ', 'த': 't', 'ந': 'n', 'ப': 'p', 'ம': 'm',
    'ய': 'y', 'ர': 'r', 'ல': 'l', 'வ': 'v', 'ழ': 'ḻ', 'ள': 'ḷ', 'ற': 'ṟ', 'ன': 'ṉ',
    'ஜ': 'j', 'ஶ': 'ś', 'ஷ': 'ṣ', 'ஸ': 's', 'ஹ': 'h',
  };
  const SIGNS = { 'ா': 'ā', 'ி': 'i', 'ீ': 'ī', 'ு': 'u', 'ூ': 'ū', 'ெ': 'e', 'ே': 'ē', 'ை': 'ai', 'ொ': 'o', 'ோ': 'ō', 'ௌ': 'au' };
  const VIRAMA = '்';

  window.toLatin = function (s) {
    let out = '';
    const chars = Array.from(s);
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (CONS[c]) {
        out += CONS[c];
        const n = chars[i + 1];
        if (n === VIRAMA) i++;
        else if (SIGNS[n]) { out += SIGNS[n]; i++; }
        else out += 'a';
      } else if (VOWELS[c]) out += VOWELS[c];
      else if (SIGNS[c] || c === VIRAMA) { /* stray sign: skip */ }
      else out += c;
    }
    return out;
  };
})();
