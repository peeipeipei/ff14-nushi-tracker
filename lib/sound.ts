/**
 * 出現アラート音。
 *
 * FF14 をフルスクリーンで遊んでいるとブラウザ通知は目に入らないため、
 * 音で知らせられるようにする。音は Web Audio で合成するので音源ファイル不要。
 * 通知と違いブラウザの許可も要らない (ただし自動再生制限があるため、
 * ユーザー操作のタイミングで unlockAudio() を呼んで AudioContext を起こす)。
 */

type Ctx = AudioContext | null;
let ctx: Ctx = null;

function getCtx(): Ctx {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

/** ブラウザの自動再生制限を解除する。必ずユーザー操作の中から呼ぶこと。 */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
}

/** 音が使える環境か */
export function soundSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext
  );
}

/** 単音を鳴らす (減衰付きの正弦波。耳に痛くない程度の音量) */
function tone(c: AudioContext, freq: number, startAt: number, dur: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  // クリックノイズを避けるため立ち上がり/減衰をつける
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.18, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(startAt);
  osc.stop(startAt + dur + 0.02);
}

export type AlertKind = "soon" | "open";

/**
 * soon = まもなく出現 (低め2音)
 * open = いま出現した (高め3音の上昇)
 */
export function playAlert(kind: AlertKind): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t0 = c.currentTime + 0.02;
  if (kind === "soon") {
    tone(c, 660, t0, 0.18);
    tone(c, 660, t0 + 0.24, 0.18);
  } else {
    tone(c, 660, t0, 0.14);
    tone(c, 880, t0 + 0.16, 0.14);
    tone(c, 1175, t0 + 0.32, 0.3);
  }
}
