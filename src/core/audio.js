// Sons synthétisés via WebAudio (aucun asset externe)
let ctx = null, vol = 0.7;
export function setVolume(v) { vol = v; }
function ac() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; }
function tone(freq, dur, type = 'square', gain = 0.15, slide = 0) {
  try {
    const a = ac(), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(gain * vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur);
  } catch { /* audio indisponible */ }
}
function noise(dur, gain = 0.2, low = 400) {
  try {
    const a = ac(), len = a.sampleRate * dur, buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low;
    const g = a.createGain(); g.gain.value = gain * vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
  } catch { }
}
export const sfx = {
  breakBlock() { noise(0.18, 0.35, 900); tone(180, 0.12, 'triangle', 0.12, -80); },
  place() { tone(320, 0.08, 'square', 0.1); noise(0.08, 0.15, 1200); },
  step() { noise(0.05, 0.08, 500); },
  splash() { noise(0.3, 0.25, 2000); },
  hit() { tone(140, 0.1, 'sawtooth', 0.15, -40); noise(0.08, 0.2, 700); },
  hurt() { tone(220, 0.25, 'sawtooth', 0.2, -120); },
  pop() { tone(660, 0.08, 'square', 0.12, 220); },
  craft() { tone(520, 0.07, 'square', 0.1); setTimeout(() => tone(780, 0.09, 'square', 0.1), 70); },
  eat() { noise(0.12, 0.25, 800); setTimeout(() => noise(0.12, 0.25, 800), 130); },
  levelup() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'square', 0.14), i * 90)); },
  fuse() { noise(0.4, 0.1, 4000); },
};
let musicTimer = null;
export function startMusic() {
  if (musicTimer) return;
  const notes = [262, 294, 330, 392, 440, 392, 330, 294];
  let i = 0;
  musicTimer = setInterval(() => {
    if (document.hidden) return;
    try { tone(notes[i % notes.length], 0.6, 'sine', 0.03); } catch { }
    i++;
  }, 1400);
}
