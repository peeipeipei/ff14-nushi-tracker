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
  fromMs: number,
  options?: { ignoreTime?: boolean }
): UpcomingWindow | null {
  return findNextMatchingWeatherWindow(
    spec,
    rateFor(territoryId),
    fromMs,
    options
  );
}

/**
 * fromMs 以降の窓を最大 count 件。
 * 各窓の終了直後から次を探すことで「次の次」以降も求める。
 */
export function nextWindows(
  spec: WindowSpec,
  territoryId: number | null,
  fromMs: number,
  count: number,
  options?: { ignoreTime?: boolean }
): UpcomingWindow[] {
  const out: UpcomingWindow[] = [];
  let cursor = fromMs;
  for (let i = 0; i < count; i++) {
    const w = nextWindow(spec, territoryId, cursor, options);
    // 常時釣獲可 / これ以上見つからない場合は打ち切り
    if (!w || w.isAlways) {
      if (w && i === 0) out.push(w);
      break;
    }
    out.push(w);
    if (!Number.isFinite(w.endMs)) break;
    cursor = w.endMs + 1000;
  }
  return out;
}

/** 窓の長さ (ms)。常時・無限窓は null */
export function windowDuration(w: UpcomingWindow): number | null {
  if (w.isAlways || !Number.isFinite(w.endMs)) return null;
  return w.endMs - w.startMs;
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

/**
 * フィッシュアイが実際に有効か。次の2条件をどちらも満たす魚のみ。
 *
 * 1. 時間帯の制約がある — フィッシュアイは時間条件のみを解除する
 *    (天候条件は解除されない) ので、終日(0-24)の魚には効果がない。
 * 2. フィッシュアイの適用対象である — オオヌシは全拡張で対象外、
 *    6.0(暁月)以降に追加された魚も対象外。
 */
export function fishEyesEffective(f: {
  startHour: number;
  endHour: number;
  fishEyesApplicable: boolean;
}): boolean {
  if (!f.fishEyesApplicable) return false;
  return !(f.startHour === 0 && f.endHour === 24);
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
