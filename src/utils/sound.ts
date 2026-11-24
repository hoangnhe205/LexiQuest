// 8-bit Web Audio API synthesizer for LexiQuest retro RPG sound feedback

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioCtx = new AudioContextCtor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'square',
  volume = 0.08,
  delay = 0,
  endFreq?: number
) {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
  }

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.01);
}

export const sfx = {
  click(enabled: boolean) {
    if (!enabled) return;
    playTone(540, 0.05, 'square', 0.04, 0, 720);
  },

  slash(enabled: boolean) {
    if (!enabled) return;
    playTone(380, 0.09, 'sawtooth', 0.08, 0, 140);
    playTone(620, 0.08, 'square', 0.06, 0.05, 880);
  },

  heavyCharge(enabled: boolean) {
    if (!enabled) return;
    playTone(220, 0.14, 'sawtooth', 0.07, 0, 440);
    playTone(330, 0.16, 'triangle', 0.08, 0.09, 660);
  },

  critSpell(enabled: boolean) {
    if (!enabled) return;
    playTone(523.25, 0.09, 'square', 0.08, 0);
    playTone(659.25, 0.09, 'square', 0.08, 0.07);
    playTone(783.99, 0.12, 'square', 0.09, 0.14);
    playTone(1046.5, 0.22, 'triangle', 0.1, 0.22);
  },

  parry(enabled: boolean) {
    if (!enabled) return;
    playTone(980, 0.07, 'triangle', 0.1, 0, 1480);
    playTone(740, 0.11, 'square', 0.07, 0.06, 1180);
  },

  dodge(enabled: boolean) {
    if (!enabled) return;
    playTone(680, 0.08, 'sine', 0.08, 0, 1240);
    playTone(920, 0.12, 'triangle', 0.07, 0.06, 1520);
  },

  timerTick(enabled: boolean, urgent = false) {
    if (!enabled) return;
    playTone(urgent ? 880 : 620, 0.04, 'square', urgent ? 0.06 : 0.035);
  },

  monsterHit(enabled: boolean) {
    if (!enabled) return;
    playTone(190, 0.16, 'sawtooth', 0.1, 0, 65);
    playTone(130, 0.12, 'square', 0.07, 0.06, 55);
  },

  heavyMonsterHit(enabled: boolean) {
    if (!enabled) return;
    playTone(150, 0.24, 'sawtooth', 0.12, 0, 45);
    playTone(95, 0.22, 'square', 0.1, 0.07, 40);
  },

  lootDrop(enabled: boolean) {
    if (!enabled) return;
    playTone(587.33, 0.1, 'square', 0.07, 0);
    playTone(783.99, 0.1, 'square', 0.07, 0.09);
    playTone(1174.66, 0.22, 'triangle', 0.09, 0.18);
  },

  levelUp(enabled: boolean) {
    if (!enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, i) => {
      playTone(n, i === notes.length - 1 ? 0.32 : 0.1, 'square', 0.07, i * 0.085);
    });
  },

  purify(enabled: boolean) {
    if (!enabled) return;
    playTone(440, 0.1, 'triangle', 0.08, 0, 660);
    playTone(660, 0.14, 'triangle', 0.08, 0.1, 990);
    playTone(880, 0.22, 'sine', 0.09, 0.2, 1320);
  },
};
