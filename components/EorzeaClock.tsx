"use client";

import { formatEorzeaClock } from "@/lib/eorzeaTime";

/** 現在のエオルゼア時間とリアル時間を並べて表示するヘッダー時計 */
export default function EorzeaClock({ nowMs }: { nowMs: number }) {
  const real = new Date(nowMs);
  const realStr = `${String(real.getHours()).padStart(2, "0")}:${String(
    real.getMinutes()
  ).padStart(2, "0")}`;

  return (
    <div className="flex items-baseline gap-4 rounded-lg border border-abyss-700 bg-abyss-800 px-5 py-3 shadow-lantern">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-moonlight-dim">
          Eorzea Time
        </div>
        <div className="font-mono text-3xl font-bold text-hookgold-bright tabular-nums">
          {formatEorzeaClock(nowMs)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-[0.2em] text-moonlight-dim">
          Local
        </div>
        <div className="font-mono text-lg text-moonlight tabular-nums">{realStr}</div>
      </div>
    </div>
  );
}
