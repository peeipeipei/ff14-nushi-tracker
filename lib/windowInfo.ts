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

/**
 * 残り/待機時間を「1日2時間」「3時間5分」「12分」、1分未満は「45秒」形式に。
 * withSeconds=true のとき、10分未満は「8分30秒」と秒まで表示する。
 */
export function formatCountdown(ms: number, withSeconds = false): string {
  if (ms <= 0) return "0秒";
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}秒`;
  if (withSeconds && totalSec < 600) {
    return `${Math.floor(totalSec / 60)}分${totalSec % 60}秒`;
  }
  const totalMin = Math.floor(totalSec / 60);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}日${h}時間`;
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

/** 同じ暦日か */
function isSameDate(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** 「M月D日 HH:MM」形式 (ローカル時刻) */
export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 「HH:MM」形式 (ローカル時刻) */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 本日中なら「HH:MM」、日をまたぐなら「M月D日 HH:MM」 */
export function formatWhen(targetMs: number, nowMs: number): string {
  return isSameDate(targetMs, nowMs)
    ? formatClock(targetMs)
    : formatDateTime(targetMs);
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
      // 残り10分未満は分秒まで表示
      label: `出現中 残り${formatCountdown(win.endMs - nowMs, true)}`,
      className: "text-tide-active font-bold",
    };
  }
  const until = win.startMs - nowMs;
  const className =
    until < 3600 * 1000 ? "text-hookgold-bright font-bold" : "text-moonlight";
  // 出現が日付をまたぐ場合は相対時間でなく絶対日時を表示
  if (!isSameDate(win.startMs, nowMs)) {
    return { label: formatDateTime(win.startMs), className };
  }
  return { label: `あと${formatCountdown(until)}`, className };
}
