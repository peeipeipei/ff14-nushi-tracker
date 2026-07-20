"use client";

import type { Nushi, UpcomingWindow, WeatherTypeInfo } from "@/lib/types";
import TideGauge from "./TideGauge";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0分";
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}日${h}時間`;
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

function formatEtHour(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour % 1) * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function formatHourRange(startHour: number, endHour: number): string {
  if (startHour === 0 && endHour === 24) return "終日";
  return `ET ${formatEtHour(startHour)}〜${formatEtHour(endHour)}`;
}

export default function NushiRow({
  nushi,
  window: win,
  nowMs,
  weatherTypes,
}: {
  nushi: Nushi;
  window: UpcomingWindow | null;
  nowMs: number;
  weatherTypes: Record<string, WeatherTypeInfo>;
}) {
  const weatherLabel =
    nushi.weatherSet.length > 0
      ? nushi.weatherSet.map((id) => weatherTypes[id]?.ja ?? `#${id}`).join("/")
      : null;
  const prevWeatherLabel =
    nushi.previousWeatherSet.length > 0
      ? nushi.previousWeatherSet
          .map((id) => weatherTypes[id]?.ja ?? `#${id}`)
          .join("/")
      : null;

  let status: { label: string; className: string };
  if (!win) {
    status = { label: "窓なし(48日以内)", className: "text-moonlight-faint" };
  } else if (win.isAlways) {
    status = { label: "常時", className: "text-tide-active" };
  } else if (win.isActiveNow) {
    status = {
      label: `開催中 残り${formatCountdown(win.endMs - nowMs)}`,
      className: "text-tide-active font-bold",
    };
  } else {
    status = {
      label: `あと${formatCountdown(win.startMs - nowMs)}`,
      className:
        win.startMs - nowMs < 3600 * 1000
          ? "text-hookgold-bright font-bold"
          : "text-moonlight",
    };
  }

  const startDate = win && !win.isAlways ? new Date(win.startMs) : null;

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-abyss-700/60 px-4 py-3 transition-colors hover:bg-abyss-800/60 sm:grid-cols-[minmax(180px,1.2fr)_minmax(140px,1fr)_minmax(150px,1fr)_minmax(120px,0.9fr)]">
      {/* 魚名 */}
      <div>
        <div className="font-display text-base text-moonlight">
          {nushi.nameJa ?? nushi.name}
          {nushi.folklore && (
            <span className="ml-1.5 rounded border border-hookgold-deep px-1 text-[10px] text-hookgold align-middle">
              伝承
            </span>
          )}
          {nushi.intuition && (
            <span className="ml-1 rounded border border-moonlight-faint px-1 text-[10px] text-moonlight-dim align-middle">
              直感
            </span>
          )}
        </div>
        <div className="text-xs text-moonlight-faint">
          {nushi.name} ・ Patch {nushi.patch}
        </div>
      </div>

      {/* 場所 */}
      <div className="hidden text-sm sm:block">
        <div className="text-moonlight">{nushi.spotNameJa ?? nushi.spotName ?? "—"}</div>
        <div className="text-xs text-moonlight-faint">
          {nushi.zoneNameJa ?? nushi.zoneName ?? ""}
        </div>
      </div>

      {/* 条件 */}
      <div className="hidden text-xs sm:block">
        <div className="text-moonlight-dim">{formatHourRange(nushi.startHour, nushi.endHour)}</div>
        <div className="text-moonlight-dim">
          {prevWeatherLabel && (
            <span className="text-moonlight-faint">{prevWeatherLabel} → </span>
          )}
          {weatherLabel ?? (prevWeatherLabel ? "" : "天候不問")}
        </div>
      </div>

      {/* 次の窓 */}
      <div className="text-right">
        <div className={`text-sm tabular-nums ${status.className}`}>{status.label}</div>
        {startDate && !win?.isActiveNow && (
          <div className="text-[11px] text-moonlight-faint tabular-nums">
            {startDate.getMonth() + 1}/{startDate.getDate()}{" "}
            {String(startDate.getHours()).padStart(2, "0")}:
            {String(startDate.getMinutes()).padStart(2, "0")}〜
          </div>
        )}
        <div className="mt-1.5">
          <TideGauge window={win} nowMs={nowMs} />
        </div>
      </div>
    </div>
  );
}
