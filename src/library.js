// The slokam library shown in the ☰ menu.
// Numbers follow the user's key. Each work is shown in its original script (Tamil or
// Devanagari) with IAST underneath. An entry with `text` (a key into window.SLOKAM_TEXTS, from src/texts/)
// and a recording (`youtube`) is playable; the others are reserved places for later.
window.SLOKAM_LIBRARY = [
  {
    id: 'divya', iast: 'divya prabandaṅgaḷ', native: 'திவ்ய ப்ரபந்தங்கள்', lang: 'ta',
    items: [
      { n: 1, iast: 'tirupallāṇḍu', native: 'திருப்பல்லாண்டு' },
      { n: 2, iast: 'tiruppaḷḷiyezucci', native: 'திருப்பள்ளியெழுச்சி' },
      { n: 3, iast: 'tiruppāvai', native: 'திருப்பாவை' },
      { n: 4, iast: 'nīrāṭṭam', native: 'நீராட்டம்' },
      { n: 5, iast: 'pūccūṭṭal', native: 'பூச்சூட்டல்' },
      { n: 6, iast: 'kāppiḍal', native: 'காப்பிடல்' },
      { n: 7, iast: 'śenniyōṅgu', native: 'சென்னியோங்கு' },
      { n: 8, iast: 'amalanādipirān', native: 'அமலனாதிபிரான்' },
      { n: 9, iast: 'kaṇṇinuṇ śiṟuttāmbu', native: 'கண்ணிநுண் சிறுத்தாம்பு' },
      { n: 10, iast: 'irāmānuśa nūṟṟandādi', native: 'இராமாநுச நூற்றந்தாதி' },
      { n: 11, iast: 'vāraṇamāyiram', native: 'வாரணமாயிரம்' },
      { n: 12, iast: 'tiruvezukūṟṟirukkai', native: 'திருவெழுகூற்றிருக்கை' },
      { n: 13, iast: 'aṅgaṇ ñālam', native: 'அங்கண் ஞாலம்' },
      { n: 14, iast: 'kāśaiyāḍai', native: 'காசையாடை' },
      { n: 15, iast: 'vāṇilā muṟuval', native: 'வாணிலா முறுவல்' },
    ],
  },
  {
    id: 'desika-prabandham', iast: 'dēśika prabandaṅgaḷ', native: 'தேசிக ப்ரபந்தங்கள்', lang: 'ta',
    items: [
      { n: 16, iast: 'aḍaikkalappattu', native: 'அடைக்கலப்பத்து' },
      {
        n: 17, iast: 'mummaṇikkōvai', native: 'மும்மணிக்கோவை',
        text: 'mummanikkovai', youtube: '_S8ixInldNY', duration: 416,
      },
      { n: 18, iast: 'navamaṇimālai', native: 'நவமணிமாலை' },
      { n: 19, iast: 'adikārasaṅgraham', native: 'அதிகாரஸங்க்ரஹம்' },
      { n: 20, iast: 'śrī vaiṇavadinaśari', native: 'ஸ்ரீ வைணவ தினசரி' },
      { n: 21, iast: 'prabandasāram', native: 'ப்ரபந்தஸாரம்' },
      { n: 22, iast: 'piḷḷaiyandādi', native: 'பிள்ளையந்தாதி' },
      { n: 23, iast: 'meyviradamānmiyam', native: 'மெய்விரதமான்மியம்' },
    ],
  },
  {
    id: 'desika-stotramala', iast: 'dēśika stōtramālā', native: 'देशिकस्तोत्रमाला', lang: 'sa',
    items: [
      { n: 24, iast: 'śrīhayagrīvastōtram', native: 'श्रीहयग्रीवस्तोत्रम्' },
      { n: 25, iast: 'śrīdaśāvatārastōtram', native: 'श्रीदशावतारस्तोत्रम्' },
      { n: 26, iast: 'śrībhagavaddhyānasōpānam', native: 'श्रीभगवद्ध्यानसोपानम्' },
      { n: 27, iast: 'śrī abhītistavaḥ', native: 'श्री अभीतिस्तवः' },
      {
        n: 28, iast: 'śrīdayāśatakam', native: 'श्रीदयाशतकम्',
        text: 'dayasatakam', youtube: 'uFv0QOS2ROA',
      },
      { n: 29, iast: 'śrīvēgāsētustōtram', native: 'श्रीवेगासेतुस्तोत्रम्' },
      { n: 30, iast: 'śrī aṣṭabhujāṣṭakam', native: 'श्री अष्टभुजाष्टकम्' },
      { n: 31, iast: 'śrīkāmāsikāṣṭakam', native: 'श्रीकामासिकाष्टकम्' },
      { n: 32, iast: 'śrīparamārthastutiḥ', native: 'श्रीपरमार्थस्तुतिः' },
      { n: 33, iast: 'śrī accuasaaam', native: 'श्री अच्चुअसअअं' },
      { n: 34, iast: 'śrīmahāvīravaibhavam (raghuvīra gadyam)', native: 'श्रीमहावीरवैभवम् (रघुवीरगद्यम्)' },
      { n: 35, iast: 'śrīgōpālaviṃśatiḥ', native: 'श्रीगोपालविंशतिः' },
      { n: 36, iast: 'śrīstutiḥ', native: 'श्रीस्तुतिः' },
      { n: 37, iast: 'śrībhūstutiḥ', native: 'श्रीभूस्तुतिः' },
      { n: 38, iast: 'śrīgōdāstutiḥ', native: 'श्रीगोदास्तुतिः' },
      { n: 39, iast: 'śrīnyāsadaśakam', native: 'श्रीन्यासदशकम्' },
      { n: 40, iast: 'śrīsudarśanāṣṭakam', native: 'श्रीसुदर्शनाष्टकम्' },
      { n: 41, iast: 'śrī ṣōḍaśāyudhastōtram', native: 'श्री षोडशायुधस्तोत्रम्' },
      { n: 42, iast: 'śrīgaruḍadaṇḍakaḥ', native: 'श्रीगरुडदण्डकः' },
      { n: 43, iast: 'śrīdēśikamaṅgaḷam', native: 'श्रीदेशिकमङ्गळम्' },
    ],
  },
  {
    id: 'vedam', iast: 'vēdam', native: 'वेदम्', lang: 'sa',
    items: [
      { n: 44, iast: 'puruṣasūktam', native: 'पुरुषसूक्तम्' },
      { n: 45, iast: 'viṣṇusūktam', native: 'विष्णुसूक्तम्' },
      { n: 46, iast: 'nārāyaṇasūktam', native: 'नारायणसूक्तम्' },
      { n: 47, iast: 'śrīsūktam', native: 'श्रीसूक्तम्' },
      { n: 48, iast: 'bhūsūktam', native: 'भूसूक्तम्' },
      { n: 49, iast: 'nīḷāsūktam', native: 'नीळासूक्तम्' },
    ],
  },
];
