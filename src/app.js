/* Mummanikkovai lyrics widget — renderer */
(function () {
  const $ = (id) => document.getElementById(id);
  const L = window.LYRICS;
  const DEFAULT_TIMES = L.lines.map((l) => l.t);

  // settings live in the Electron main process; fall back to localStorage when opened in a plain browser
  const store = window.widget || {
    getSettings: async () => { try { return JSON.parse(localStorage.getItem('mmk') || '{}'); } catch { return {}; } },
    setSettings: (p) => { try { const s = JSON.parse(localStorage.getItem('mmk') || '{}'); localStorage.setItem('mmk', JSON.stringify({ ...s, ...p })); } catch {} },
    setCompact: (on) => applyCompact(on), hide: () => {}, quit: () => window.close(),
    onCompactChanged: () => {}, onCommand: () => {},
  };

  const S = { opacity: 0.55, font: 1, offset: 0, video: false, loop: true, timings: null };
  let times = DEFAULT_TIMES.slice();
  let player = null;
  let active = -2;
  let userScrollUntil = 0;
  let sync = null; // { next: index, marks: [] } while in sync mode

  // ---------- helpers ----------
  const fmt = (s) => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const t0 = (i) => times[i] + S.offset;
  function lineAt(t) {
    let lo = 0, hi = times.length - 1, ans = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (t0(m) <= t) { ans = m; lo = m + 1; } else hi = m - 1; }
    return ans;
  }
  function verseName(v) {
    return `பாசுரம் ${v} / 10`;
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
        if (sync) return;
        player.seek(t0(i) + 0.01); player.play(); userScrollUntil = 0;
      });
      ol.appendChild(li); lis.push(li);
    });
  }

  function scrollToActive(smooth) {
    const vp = $('viewport');
    const li = lis[Math.max(active, 0)];
    if (!li) return;
    // keep the whole active line (even when it wraps) clear of the faded top edge
    const top = li.offsetTop - Math.max(vp.clientHeight * 0.24, 30);
    vp.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  }

  function setActive(i) {
    if (i === active) return;
    const prev = active;
    active = i;
    lis.forEach((li, k) => {
      li.classList.toggle('active', k === i);
      li.classList.toggle('past', k < i);
    });
    const ln = L.lines[Math.max(i, 0)];
    $('verseLabel').textContent = i < 0 ? '' : verseName(ln.v);
    $('pillText').textContent = i < 0 ? L.title : ln.text;
    if (performance.now() > userScrollUntil) scrollToActive(Math.abs(i - prev) < 4);
  }

  // ---------- main loop ----------
  function tick() {
    if (player) {
      const t = player.time();
      const dur = player.duration();
      if (sync && !player.playing() && t >= dur - 0.5) finishSync(); // recording ended mid-sync
      if (sync) {
        setActive(sync.next - 1);
        lis.forEach((li, k) => li.classList.toggle('target', k === sync.next));
      } else {
        const i = lineAt(t);
        setActive(i);
        if (i >= 0) {
          const end = i + 1 < times.length ? t0(i + 1) : Math.min(t0(i) + 6, dur);
          const p = Math.max(0, Math.min(1, (t - t0(i)) / Math.max(0.3, end - t0(i))));
          lis[i].style.setProperty('--p', (p * 100).toFixed(2) + '%');
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
    const base = active < 0 ? -1 : active;
    const target = Math.max(0, Math.min(times.length - 1, base + d));
    // "previous" restarts the current line if we're more than 2s into it
    const i = d < 0 && active >= 0 && player.time() - t0(active) > 2 ? active : target;
    player.seek(t0(i) + 0.01); userScrollUntil = 0;
  }

  // ---------- sync mode ----------
  function startSync() {
    closeSheet();
    sync = { next: 0, marks: [] };
    document.body.classList.add('syncing');
    $('syncBanner').classList.remove('hidden');
    lis.forEach((li) => li.classList.remove('active', 'past'));
    active = -2;
    player.loop = false;
    player.seek(0); player.play();
    userScrollUntil = 0;
  }
  function mark() {
    if (!sync) return;
    const prev = sync.marks[sync.next - 1];
    sync.marks[sync.next] = prev == null ? player.time() : Math.max(player.time(), prev + 0.1);
    sync.next++;
    if (sync.next >= times.length) finishSync();
  }
  function undoMark() {
    if (!sync || sync.next === 0) return;
    sync.next--; sync.marks.length = sync.next;
    // replay from the start of the last kept line so the redone mark lands after it
    player.seek(sync.marks[sync.next - 1] ?? 0);
  }
  function finishSync() {
    if (!sync) return;
    const n = sync.marks.length;
    if (n > 0) {
      const newTimes = times.map((t) => t + S.offset);
      for (let k = 0; k < n; k++) newTimes[k] = sync.marks[k];
      // shift the not-yet-marked lines so they keep their relative spacing
      const delta = sync.marks[n - 1] - (times[n - 1] + S.offset);
      for (let k = n; k < newTimes.length; k++) newTimes[k] += delta;
      times = newTimes.map((t) => Math.round(t * 100) / 100);
      save({ timings: times, offset: 0 });
      $('offVal').textContent = '0.0s';
      toast(n === times.length ? 'Timings saved for every line ✓' : `Saved ${n} of ${times.length} lines — run Sync again later to finish.`);
    }
    sync = null;
    document.body.classList.remove('syncing');
    $('syncBanner').classList.add('hidden');
    lis.forEach((li) => li.classList.remove('target'));
    active = -2;
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
    active = -2; // refresh pill text
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
    if (!on) { active = -2; setTimeout(() => scrollToActive(false), 30); }
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
    $('btnReset').onclick = () => { times = DEFAULT_TIMES.slice(); save({ timings: null, offset: 0 }); applyLook(); updateTimingNote(); toast('Timings reset to the built-in estimates.'); };
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
  function onLoop() { active = -2; userScrollUntil = 0; }
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
    if (Array.isArray(S.timings) && S.timings.length === DEFAULT_TIMES.length) times = S.timings.slice();
    else S.timings = null;
    buildLines();
    bind();
    applyLook();
    setActive(-1);
    requestAnimationFrame(tick);
  })();
})();
