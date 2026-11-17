# Slokam Player

A floating lyrics widget for Windows that plays slokam recitations from YouTube with the words in sync,
scrolling line by line the way Spotify's lyrics view does.

## Slokams

Press **☰** (or `L`) to choose a slokam. The menu has room for the full collection in four categories:
divya prabandaṅgaḷ, dēśika prabandaṅgaḷ, dēśika stōtramālā and vēdam. Each entry shows its original
script (Tamil or Devanagari) with IAST underneath. Entries marked *soon* are placeholders for now.

Available now:

| # | Slokam | Recording | Text (prapatti.com) |
| --- | --- | --- | --- |
| 1 | **திருப்பல்லாண்டு** · tirupallāṇḍu | [Nityānusandhānam playlist](https://www.youtube.com/playlist?list=PLCG9337skRtYbC7X1UWUuIqFklWipjLoj) | Periyāḻvār Tirumoḻi 1.1, with its taniyans |
| 2 | **திருப்பள்ளியெழுச்சி** · tiruppaḷḷiyezucci | 〃 | with taniyans |
| 3 | **திருப்பாவை** · tiruppāvai | 〃 | with taniyans |
| 5 | **பூச்சூட்டல்** · pūccūṭṭal | 〃 | Periyāḻvār Tirumoḻi 2.7 |
| 6 | **காப்பிடல்** · kāppiḍal | 〃 | Periyāḻvār Tirumoḻi 2.8 |
| 7 | **சென்னியோங்கு** · śenniyōṅgu | 〃 | Periyāḻvār Tirumoḻi 5.4 |
| 8 | **அமலனாதிபிரான்** · amalanādipirān | 〃 | with taniyans |
| 9 | **கண்ணிநுண் சிறுத்தாம்பு** · kaṇṇinuṇ śiṟuttāmbu | 〃 | with taniyans |
| 17 | **மும்மணிக்கோவை** · mummaṇikkōvai | [Thiruvayindhai K. Malolakannan & N. S. Ranganathan](https://youtu.be/_S8ixInldNY) | the ten pāsurams |
| 28 | **श्रीदयाशतकम्** · śrīdayāśatakam | [Tiruvaindai Dr. K. Malolakannan](https://youtu.be/uFv0QOS2ROA) | with the opening and closing taniyan |
| 36 | **श्रीस्तुतिः** · śrīstutiḥ | [YouTube](https://youtu.be/YagbUn2fZWw) | with the opening and closing taniyan |
| 37 | **श्रीभूस्तुतिः** · śrībhūstutiḥ | [YouTube](https://youtu.be/uQf4CMbF0SY) | with the opening and closing taniyan |
| 38 | **श्रीगोदास्तुतिः** · śrīgōdāstutiḥ | [YouTube](https://youtu.be/KVdQ-VPiSbY) | with the opening and closing taniyan |

Taniyans are included wherever prapatti.com prints them. If a recording leaves one out, press **S** for its lines while syncing.

## Features

- **Floats above other windows** and stays put. It's frameless and see-through, and you can drag it anywhere by its title bar.
- **Spotify-style lyrics:** the current line fills in with a white sweep (row by row when it wraps), past lines dim, and clicking any line jumps the recitation there.
- **Follows the repeats.** When a verse is chanted a second time, the highlight jumps back to it and the header
  shows *மீண்டும்* (Tamil) or *पुनः* (Sanskrit). See [Repeats](#repeats).
- **Full screen** (`⛶` or `F`) fills the screen with large, centred lyrics on a dark backdrop.
  Press `F` or `Esc` (or the `🗗` button) to go back to the small widget.
- **Minimize** (`–` or `M`) shrinks it to a slim pill that shows only the current line. Click `⤢` to expand it again.
- **×** hides it to the system tray. Bring it back from the tray icon or with **Ctrl + Alt + L**.
- **Loops** the recitation and starts again from the beginning when it ends. You can turn this off in ⚙.
- Settings for background transparency, text size, a timing offset, showing the video, and *Start with Windows* (in the tray menu).

## Get it

**Download a build:** open this repo's *Actions* tab, choose the latest **Build Slokam Player (Windows)**
run, and download the `SlokamPlayer-windows` artifact. It contains

- `SlokamPlayer-portable.exe`, which runs without installing
- `SlokamPlayer-setup.exe`, which installs it with a Start-menu entry

Windows SmartScreen may warn you because the app isn't code-signed. Click *More info → Run anyway*.

**Or run from source** (needs [Node.js](https://nodejs.org) 20+):

```bat
npm install
npm start          :: run the widget
npm run dist       :: build the .exe files into dist\
```

## Timing: sync each slokam once

The texts are complete, but the **start time of each line is estimated**: the app spreads the lines
over the recording's length by how many letters each has. They'll be close but will drift.

Sync a slokam once and its timings are exact from then on:

1. Choose the slokam, then ⚙ → **Sync timings…**. The recording restarts from 0:00.
2. Press **Space** (or click *Mark*) the moment each highlighted line **starts** being recited.
   Sync follows the order the verses are chanted in, repeats included, and the banner shows which verse is next.
   If a highlighted line isn't said at that point, press **S** (or *Skip*) and it's left out of the timeline.
   Press **Backspace** to undo a mark or skip, and **Esc** to stop early. Your marks are kept and the remaining lines shift to match.
3. Your timings are saved on your PC, separately for each slokam. *Reset timings* goes back to the estimates.

If everything is consistently a bit early or late, use **Timing offset** (±0.5 s steps) in ⚙ instead.

## Repeats

- **Tamil prabandhams:** a verse whose first line starts with **‡** in the prapatti.com text is chanted twice.
  For Mummanikkovai that's pāsurams 1, 9 and 10; for Tirupallāṇḍu 1, 2, 11 and 12.
- **Sanskrit Dēśika stōtras:** the first and last ślōkas are chanted twice. For Dayāśatakam that's ślōkas 1 and 108.

The text generators in `tools/` apply these rules when they build each slokam's playback order.

## Keyboard

| Key | Action |
| --- | --- |
| Space | Play / pause (in Sync mode: mark line) |
| S | In Sync mode: skip a line that isn't recited there |
| ↑ / ↓ | Previous / next line |
| ⏮ / ⏭ buttons | Back to the start (press again within 3 s for the previous slokam) / next slokam |
| ← / → | Back / forward 5 s |
| L | Open the slokam menu |
| F | Full screen on / off (Esc also leaves full screen) |
| M | Minimize / expand |
| Ctrl + Alt + L | Show / hide from anywhere |

## How it works

- `main.js` (Electron) creates the frameless, transparent, always-on-top window plus the tray icon, and stores
  settings in `%APPDATA%\Slokam Player\settings.json`. It serves `src/` from `127.0.0.1` because
  YouTube's embedded player won't run from a `file://` page.
- `src/player.js` plays the recording and reports the exact playback position:
  - Most videos play in YouTube's **embedded player** inside the widget.
  - Some uploaders turn embedding off; the Dayāśatakam video is one of them. For those, the app opens the
    **normal YouTube page in a separate window**, kept hidden unless *Show video* is on, and controls it from
    the widget. If YouTube shows a cookie or sign-in page first, that window appears so you can click through it.
    Ads on that page pause the lyrics until they finish.
  - If YouTube can't be reached at all, the widget falls back to a **stopwatch**: press ▶ at the moment you start the video elsewhere.
- `src/library.js` lists every slokam in the menu. A playable entry names its text and YouTube video.
- `src/texts/` holds one file per slokam: its lines, each tagged with its verse number (taniyans are negative,
  or 0 and last + 1 for the Sanskrit stōtras), and the `order` the verses are chanted in.
  - Tamil: `tools/extract_pdf.py` repairs a prapatti.com PDF's scrambled vowel-sign order, then
    `tools/build_tamil_prabandham.py` builds the file, either for a whole work or for one decade of a
    larger one (`--section 2.7`), optionally with the work's taniyans (`--taniyans`).
    `tools/build_mummanikkovai.py` builds Mummanikkovai, whose taniyan and closing *சீரார் தூப்புல் …* aren't in its recording.
  - Sanskrit: `tools/build_sanskrit_stotra.py` builds a Dēśika stōtra. prapatti.com's Devanagari PDFs use a broken
    font encoding, so the script reads the romanised edition and converts it to Devanagari.

### Adding a slokam

1. Build `src/texts/<name>.js` with `tools/build_tamil_prabandham.py` or `tools/build_sanskrit_stotra.py`
   (or a new script that produces the same shape, applying the repeat rule for its kind).
2. Add `<script src="texts/<name>.js">` to `src/index.html`.
3. In `src/library.js`, give the entry `text: '<name>'` and `youtube: '<video id>'`.
