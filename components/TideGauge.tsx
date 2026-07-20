"use client";

import type { UpcomingWindow } from "@/lib/types";

/** 12時間先までを 1 本のゲージとして、窓までの近さ / 開催中の残り時間を可視化する */
const HORIZON_MS = 12 * 3600 * 1000;

export default function TideGauge({
  window: win,
  nowMs,
}: {
  window: UpcomingWindow | null;
  nowMs: number;
}) {
  if (!win) {
    return (
      <div className="h-1.5 w-full rounded-full bg-abyss-700">
        <div className="h-full w-0 rounded-full" />
      </div>
    );
  }

  if (win.isAlways) {
    return (
      <div className="h-1.5 w-full rounded-full bg-tide-active/30">
        <div className="h-full w-full rounded-full bg-tide-active/70" />
      </div>
    );
  }

  if (win.isActiveNow) {
    // 開催中: 残り時間の割合を緑で表示 (窓全体に対する残り)
    const total = win.endMs - win.startMs;
    const remain = Math.max(0, win.endMs - nowMs);
    const pct = total > 0 ? Math.min(100, (remain / total) * 100) : 0;
    return (
      <div className="h-1.5 w-full rounded-full bg-abyss-700">
        <div
          className="h-full rounded-full bg-tide-active transition-[width] duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }

  // 待機中: 12時間ゲージ上で「どれだけ近いか」を金色で満たす
  const until = win.startMs - nowMs;
  const pct = Math.max(0, Math.min(100, (1 - until / HORIZON_MS) * 100));
  return (
    <div className="h-1.5 w-full rounded-full bg-abyss-700">
      <div
        className="h-full rounded-full bg-hookgold transition-[width] duration-1000"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
