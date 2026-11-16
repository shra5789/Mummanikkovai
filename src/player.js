// Playback source for the widget.
//  * YouTubePlayer — plays the recording through YouTube's embedded player (exact timing).
//  * ClockPlayer   — fallback stopwatch if YouTube can't be embedded/reached; the user presses
//                    play at the same moment they start the video elsewhere.
// Both expose: time(), duration(), playing(), play(), pause(), seek(sec), and fire onState().

class ClockPlayer {
  constructor(duration) {
    this.kind = 'clock';
    this._dur = duration; this._base = 0; this._startedAt = null; this.onState = () => {};
  }
  time() { const t = this._startedAt == null ? this._base : this._base + (performance.now() - this._startedAt) / 1000; return Math.min(t, this._dur); }
  duration() { return this._dur; }
  playing() { return this._startedAt != null && this.time() < this._dur; }
  play() { if (this._startedAt == null) { this._startedAt = performance.now(); this.onState(); } }
  pause() { if (this._startedAt != null) { this._base = this.time(); this._startedAt = null; this.onState(); } }
  seek(t) { this._base = Math.max(0, Math.min(t, this._dur)); if (this._startedAt != null) this._startedAt = performance.now(); this.onState(); }
}

class YouTubePlayer {
  constructor(elementId, videoId, duration, { onReady, onError }) {
    this.kind = 'youtube';
    this._dur = duration; this._ready = false; this.onState = () => {};
    // getCurrentTime() only updates every ~100-250 ms; interpolate between updates for smooth highlighting
    this._lastT = 0; this._lastAt = performance.now(); this._state = -1;
    this.p = new YT.Player(elementId, {
      videoId,
      width: 320, height: 180,
      playerVars: { autoplay: 0, controls: 1, rel: 0, playsinline: 1, modestbranding: 1, origin: location.origin },
      events: {
        onReady: () => { this._ready = true; const d = this.p.getDuration(); if (d) this._dur = d; onReady && onReady(); },
        onStateChange: (e) => { this._state = e.data; this._sample(true); this.onState(); },
        onError: (e) => onError && onError(e.data),
      },
    });
  }
  _sample(force) {
    if (!this._ready) return;
    const t = this.p.getCurrentTime() || 0;
    if (force || t !== this._lastT) { this._lastT = t; this._lastAt = performance.now(); }
  }
  time() {
    if (!this._ready) return 0;
    this._sample(false);
    if (this._state !== YT.PlayerState.PLAYING) return this._lastT;
    const extra = (performance.now() - this._lastAt) / 1000;
    return this._lastT + Math.min(extra, 0.5);
  }
  duration() { return this._dur; }
  playing() { return this._state === 1 || this._state === 3; }
  play() { this._ready && this.p.playVideo(); }
  pause() { this._ready && this.p.pauseVideo(); }
  seek(t) { if (this._ready) { this.p.seekTo(Math.max(0, t), true); this._lastT = t; this._lastAt = performance.now(); } }
}
