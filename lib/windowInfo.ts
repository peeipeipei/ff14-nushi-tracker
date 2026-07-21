import weatherData from "@/data/weather_rates.json";
import type { UpcomingWindow, WeatherRate } from "./types";
import { findNextMatchingWeatherWindow, WindowSpec } from "./weather";

const rates = (weatherData as unknown as { rates: Record<string, WeatherRate> })
  .rates;

/** TerritoryType ID から天候レートを引く */
export function rateFor(territoryId: number | null): WeatherRate | null {
  return territoryId ? rates[String(territoryId)] ?? null : null;
}

/** 条件 + 釣り場から fromMs 以降の次の釣獲窓を求める */
export function nextWindow(
  spec: WindowSpec,
  territoryId: number | null,
  fromMs: number
): UpcomingWindow | null {
  return findNextMatchingWeatherWindow(spec, rateFor(territoryId), fromMs);
}

/** 残り/待機時間を「1日2時間」「3時間5分」「12分」、1分未満は「45秒」形式に */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0秒";
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}秒`;
  const totalMin = Math.floor(totalSec / 60);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}日${h}時間`;
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

/** 窓の状態ラベルと色クラス */
export function windowStatus(
  win: UpcomingWindow | null,
  nowMs: number
): { label: string; className: string } {
  if (!win) return { label: "窓なし(48日以内)", className: "text-moonlight-faint" };
  if (win.isAlways) return { label: "常時", className: "text-tide-active" };
  if (win.isActiveNow) {
    return {
      label: `出現中 残り${formatCountdown(win.endMs - nowMs)}`,
      className: "text-tide-active font-bold",
    };
  }
  return {
    label: `あと${formatCountdown(win.startMs - nowMs)}`,
    className:
      win.startMs - nowMs < 3600 * 1000
        ? "text-hookgold-bright font-bold"
        : "text-moonlight",
  };
}
