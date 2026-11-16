/* Slokam Player — renderer */
(function () {
  const $ = (id) => document.getElementById(id);
  const L = window.LYRICS;

  // Playback follows a *timeline*: every recited line in the order the recording says it,
  // so repeated pāsurams appear more than once. seq[e] is the line shown for timeline entry e,
  // times[e] is when that entry starts.
  const DEFAULT_SEQ = L.timeline.map((x) => x[0]);
  const DEFAULT_TIMES = L.timeline.map((x) => x[1]);

  // settings live in the Electron main process; fall back to localStorage when opened in a plain browser
  const store = window.widget || {
    getSettings: async () => { try { return JSON.parse(localStorage.getItem('mmk') || '{}'); } catch { return {}; } },
    setSettings: (p) => { try { const s = JSON.parse(localStorage.getItem('mmk') || '{}'); localStorage.setItem('mmk', JSON.stringify({ ...s, ...p })); } catch {} },
    setCompact: (on) => applyCompact(on), hide: () => {}, quit: () => window.close(),
    onCompactChanged: () => {}, onCommand: () => {},
  };

  const S = { opacity: 0.55, font: 1, offset: 0, video: false, loop: true, timings: null, seq: null };
  let seq = DEFAULT_SEQ.slice();
  let times = DEFAULT_TIMES.slice();
  let player = null;
  let entry = -2;       // current timeline entry
  let activeLine = -2;  // line currently highlighted
  let userScrollUntil = 0;
  let sync = null;      // { next, marks: [time | null (skipped)] } while in sync mode

  // ---------- helpers ----------
  const fmt = (s) => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const t0 = (e) => times[e] + S.offset;
  function entryAt(t) {
    let lo = 0, hi = times.length - 1, ans = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (t0(m) <= t) { ans = m; lo = m + 1; } else hi = m - 1; }
    return ans;
  }
  // true if timeline entry e is a repeat of a line already recited earlier
  const isRepeat = (e, s = seq) => s.slice(0, e).includes(s[e]);
  function label(e) {
    if (e < 0 || e >= seq.length) return '';
    return `பாசுரம் ${L.lines[seq[e]].v} / 10` + (isRepeat(e) ? ' · மீண்டும்' : '');
  }
  let toastTimer;
  function toast(msg, ms = 3500) {
    const el = $('toast'); el.textContent = msg; el.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
  }
  function save(patch) { Object.assign(S, patch); store.setSettings(patch); }

  // ---------- render lyrics ----------
  const lis = [];
  function buildLines() {
    const ol = $('lines'); ol.innerHTML = '';
    L.lines.forEach((ln, i) => {
      const li = document.createElement('li');
      li.className = 'line';
      if (i === 0 || L.lines[i - 1].v !== ln.v) {
        li.classList.add('verse-start');
        li.dataset.verse = ln.v;
      }
      // inline span: when a line wraps, its background is laid out as one continuous strip,
      // so the highlight sweeps the first row and then the second instead of both at once
      const txt = document.createElement('span'); txt.className = 'txt'; txt.textContent = ln.text;
      li.appendChild(txt);
      li.addEventListener('click', () => {
        if (sync || !player) return;
        // a repeated line has several timeline entries: jump to the one nearest the current position
        const now = player.time();
        let best = -1;
        seq.forEach((l, e) => { if (l === i && (best < 0 || Math.abs(t0(e) - now) < Math.abs(t0(best) - now))) best = e; });
        if (best >= 0) { player.seek(t0(best) + 0.01); player.play(); userScrollUntil = 0; }
      });
      ol.appendChild(li); lis.push(li);
    });
  }

  function scrollToLine(line, smooth) {
    const vp = $('viewport');
    const li = lis[Math.max(line, 0)];
    if (!li) return;
    // keep the whole line (even when it wraps) clear of the faded top edge
    const top = li.offsetTop - Math.max(vp.clientHeight * 0.24, 30);
    vp.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  }

  // highlight timeline entry e; `scrollLine` overrides which line to keep in view (used by sync mode)
  function setEntry(e, scrollLine) {
    if (e === entry && scrollLine === undefined) return;
    const changed = e !== entry;
    entry = e;
    const line = e < 0 ? -1 : seq[e];
    const prevLine = activeLine;
    activeLine = line;
    lis.forEach((li, k) => {
      li.classList.toggle('active', k === line);
      li.classList.toggle('past', k < line); // on a repeat, lines after it light back up as "to come"
    });
    $('verseLabel').textContent = label(e);
    $('pillText').textContent = line < 0 ? L.title : L.lines[line].text;
    if (changed && performance.now() > userScrollUntil) {
      const target = scrollLine ?? line;
      scrollToLine(target, Math.abs(target - prevLine) < 14);
    }
  }

  // ---------- main loop ----------
  function tick() {
    if (player) {
      const t = player.time();
      const dur = player.duration();
      if (sync && !player.playing() && t >= dur - 0.5) finishSync(); // recording ended mid-sync
      if (sync) {
        const targetLine = seq[sync.next];
        if (sync.shown !== sync.next) {
          sync.shown = sync.next;
          entry = -2; // force refresh
          setEntry(sync.next - 1, targetLine ?? undefined);
          lis.forEach((li, k) => li.classList.toggle('target', k === targetLine));
          $('syncNext').textContent = sync.next < seq.length ? 'Next: ' + label(sync.next) : '';
        }
      } else {
        const e = entryAt(t);
        setEntry(e);
        if (e >= 0) {
          const end = e + 1 < times.length ? t0(e + 1) : Math.min(t0(e) + 6, dur);
          const p = Math.max(0, Math.min(1, (t - t0(e)) / Math.max(0.3, end - t0(e))));
          lis[seq[e]].style.setProperty('--p', (p * 100).toFixed(2) + '%');
        }
      }
      if (player.playing() !== document.body.classList.contains('playing')) updatePlayButtons();
      $('time').textContent = fmt(t);
      $('duration').textContent = fmt(dur);
      $('progressFill').style.width = (100 * t / dur).toFixed(2) + '%';
    }
    requestAnimationFrame(tick);
  }

  function updatePlayButtons() {
    const on = !!(player && player.playing());
    const icon = on ? '❚❚' : '▶';
    document.body.classList.toggle('playing', on);
    $('btnPlay').textContent = icon; $('pillPlay').textContent = icon;
  }
  function togglePlay() { if (!player) return; player.playing() ? player.pause() : player.play(); setTimeout(updatePlayButtons, 50); }
  function jumpLine(d) {
    if (!player) return;
    const base = entry < 0 ? -1 : entry;
    const target = Math.max(0, Math.min(times.length - 1, base + d));
    // "previous" restarts the current line if we're more than 2s into it
    const e = d < 0 && entry >= 0 && player.time() - t0(entry) > 2 ? entry : target;
    player.seek(t0(e) + 0.01); userScrollUntil = 0;
    setEntry(e); // update now so quick repeated presses keep stepping
  }

  // ---------- sync mode ----------
  // Walks the timeline in playback order (repeats included). Space marks the start of the
  // highlighted line; S skips it if the recording doesn't actually say it there.
  function startSync() {
    closeSheet();
    sync = { next: 0, marks: [], shown: -1 };
    document.body.classList.add('syncing');
    $('syncBanner').classList.remove('hidden');
    player.loop = false;
    player.seek(0); player.play();
    userScrollUntil = 0;
  }
  function lastMark() {
    for (let k = sync.marks.length - 1; k >= 0; k--) if (sync.marks[k] != null) return sync.marks[k];
    return null;
  }
  function mark() {
    if (!sync) return;
    const prev = lastMark();
    sync.marks[sync.next] = prev == null ? player.time() : Math.max(player.time(), prev + 0.1);
    sync.next++;
    if (sync.next >= seq.length) finishSync();
  }
  function skip() {
    if (!sync) return;
    sync.marks[sync.next] = null;
    sync.next++;
    if (sync.next >= seq.length) finishSync();
  }
  function undoMark() {
    if (!sync || sync.next === 0) return;
    const wasMark = sync.marks[sync.next - 1] != null;
    sync.next--; sync.marks.length = sync.next;
    // replay from the start of the last kept line so the redone mark lands after it
    if (wasMark) player.seek(lastMark() ?? 0);
  }
  function finishSync() {
    if (!sync) return;
    const n = sync.marks.length;
    const total = seq.length;
    const skipped = sync.marks.filter((m) => m == null).length;
    if (n > 0) {
      const newSeq = [], newTimes = [];
      let delta = 0;
      for (let k = 0; k < n; k++) {
        if (sync.marks[k] == null) continue; // skipped: not in this recording
        newSeq.push(seq[k]); newTimes.push(sync.marks[k]);
        delta = sync.marks[k] - t0(k);
      }
      // shift the not-yet-synced lines so they keep their relative spacing
      for (let k = n; k < seq.length; k++) { newSeq.push(seq[k]); newTimes.push(t0(k) + delta); }
      seq = newSeq;
      times = newTimes.map((t) => Math.round(t * 100) / 100);
      save({ timings: times, seq, offset: 0 });
      $('offVal').textContent = '0.0s';
      toast((n === total ? 'Timings saved for every line ✓' : `Saved ${n} of ${total} lines — run Sync again later to finish.`)
        + (skipped ? ` Skipped ${skipped} line${skipped > 1 ? 's' : ''} not in the recording.` : ''));
    }
    sync = null;
    document.body.classList.remove('syncing');
    $('syncBanner').classList.add('hidden');
    lis.forEach((li) => li.classList.remove('target'));
    entry = -2;
    player.loop = !!S.loop;
    updateTimingNote();
  }

  // ---------- settings sheet ----------
  function applyLook() {
    document.documentElement.style.setProperty('--bg-a', S.opacity);
    document.documentElement.style.setProperty('--scale', S.font);
    document.body.classList.toggle('show-video', !!S.video);
    $('offVal').textContent = (S.offset >= 0 ? '+' : '') + S.offset.toFixed(1) + 's';
    if (player) player.loop = !!S.loop && !sync;
    entry = -2; // refresh pill text
  }
  function updateTimingNote() {
    $('timingNote').textContent = S.timings
      ? 'Using your synced timings.'
      : 'Timings are estimates. Use “Sync timings” once — tap Space as each line begins — to make them exact.';
  }
  function openSheet() {
    $('optOpacity').value = S.opacity; $('optFont').value = S.font; $('optVideo').checked = !!S.video; $('optLoop').checked = !!S.loop;
    updateTimingNote();
    $('sheet').classList.remove('hidden');
  }
  function closeSheet() { $('sheet').classList.add('hidden'); }

  function applyCompact(on) {
    document.body.classList.toggle('compact', on);
    if (!on) { entry = -2; activeLine = -2; } // next frame re-highlights and scrolls to the current line
  }

  // ---------- wire up ----------
  function bind() {
    $('btnPlay').onclick = togglePlay; $('pillPlay').onclick = togglePlay;
    $('btnPrev').onclick = () => jumpLine(-1); $('btnNext').onclick = () => jumpLine(1);
    $('btnMin').onclick = () => store.setCompact(true);
    $('btnRestore').onclick = () => store.setCompact(false);
    $('pillText').ondblclick = () => store.setCompact(false);
    $('btnClose').onclick = () => store.hide();
    $('btnSettings').onclick = () => ($('sheet').classList.contains('hidden') ? openSheet() : closeSheet());
    $('btnSheetClose').onclick = closeSheet;
    $('optOpacity').oninput = (e) => { save({ opacity: +e.target.value }); applyLook(); };
    $('optFont').oninput = (e) => { save({ font: +e.target.value }); applyLook(); };
    $('optVideo').onchange = (e) => { save({ video: e.target.checked }); applyLook(); };
    $('optLoop').onchange = (e) => { save({ loop: e.target.checked }); applyLook(); };
    $('offMinus').onclick = () => { save({ offset: Math.round((S.offset - 0.5) * 10) / 10 }); applyLook(); };
    $('offPlus').onclick = () => { save({ offset: Math.round((S.offset + 0.5) * 10) / 10 }); applyLook(); };
    $('btnSync').onclick = startSync;
    $('btnMark').onclick = mark;
    $('btnSkip').onclick = skip;
    $('btnReset').onclick = () => {
      seq = DEFAULT_SEQ.slice(); times = DEFAULT_TIMES.slice();
      save({ timings: null, seq: null, offset: 0 }); applyLook(); updateTimingNote();
      toast('Timings reset to the built-in estimates.');
    };
    $('btnQuit').onclick = () => store.quit();

    $('progress').addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      player && player.seek(((e.clientX - r.left) / r.width) * player.duration());
      userScrollUntil = 0;
    });
    $('viewport').addEventListener('wheel', () => { userScrollUntil = performance.now() + 4000; }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (sync) {
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); mark(); }
        else if (e.code === 'KeyS') { e.preventDefault(); skip(); }
        else if (e.code === 'Backspace') { e.preventDefault(); undoMark(); }
        else if (e.code === 'Escape') finishSync();
        return;
      }
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlay(); break;
        case 'ArrowUp': e.preventDefault(); jumpLine(-1); break;
        case 'ArrowDown': e.preventDefault(); jumpLine(1); break;
        case 'ArrowLeft': player && player.seek(player.time() - 5); break;
        case 'ArrowRight': player && player.seek(player.time() + 5); break;
        case 'KeyM': store.setCompact(!document.body.classList.contains('compact')); break;
        case 'Escape': closeSheet(); break;
      }
    });
    store.onCompactChanged(applyCompact);
    store.onCommand((cmd) => { if (cmd === 'toggle-play') togglePlay(); });
  }

  // ---------- player ----------
  function onLoop() { entry = -2; userScrollUntil = 0; }
  function useClock(reason) {
    if (player && player.kind === 'clock') return;
    player = new ClockPlayer(L.duration);
    player.onState = updatePlayButtons; player.onLoop = onLoop; player.loop = !!S.loop;
    document.body.classList.add('clock-mode');
    toast(reason + ' Using a stopwatch instead: press ▶ at the same moment you start the video.', 9000);
  }
  let ytTimeout = setTimeout(() => useClock('Couldn’t reach YouTube.'), 10000);
  window.onYouTubeIframeAPIReady = () => {
    if (player) return;
    const yp = new YouTubePlayer('yt', L.videoId, L.duration, {
      onReady: () => { clearTimeout(ytTimeout); player = yp; yp.onState = updatePlayButtons; yp.onLoop = onLoop; yp.loop = !!S.loop && !sync; },
      onError: (code) => {
        clearTimeout(ytTimeout);
        if (!player || player === yp) { player = null; useClock(`YouTube can’t play the video here (error ${code}).`); }
      },
    });
  };

  // ---------- start ----------
  (async () => {
    Object.assign(S, await store.getSettings());
    const ok = Array.isArray(S.timings) && Array.isArray(S.seq) && S.timings.length === S.seq.length && S.seq.length > 0
      && S.seq.every((i) => Number.isInteger(i) && i >= 0 && i < L.lines.length);
    if (ok) { seq = S.seq.slice(); times = S.timings.slice(); } else { S.timings = null; S.seq = null; }
    buildLines();
    bind();
    applyLook();
    setEntry(-1);
    requestAnimationFrame(tick);
  })();
})();
