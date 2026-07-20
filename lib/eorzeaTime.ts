/**
 * リアル時間 ⇔ エオルゼア時間 (ET) の変換。
 * ET はリアルの 3600/175 倍速 (ET1時間 = リアル175秒、ET1日 = リアル70分)。
 * unix エポックが ET 00:00 に一致する (unixSeconds % 4200 == 0 で ET 0時)。
 */

export const EORZEA_MULTIPLIER = 3600 / 175;

/** ET 1時間のリアル時間 (ms) */
export const REAL_MS_PER_EORZEA_HOUR = 175 * 1000;

/** 天候窓 (ET 8時間) のリアル時間 (ms) = 23分20秒 */
export const WEATHER_WINDOW_REAL_MS = 8 * REAL_MS_PER_EORZEA_HOUR;

/** リアル unix ms → エオルゼア ms */
export function toEorzeaMs(unixMs: number): number {
  return unixMs * EORZEA_MULTIPLIER;
}

/** エオルゼア ms → リアル unix ms */
export function fromEorzeaMs(eorzeaMs: number): number {
  return eorzeaMs / EORZEA_MULTIPLIER;
}

/** 現在の ET 時刻 (時・分) */
export function getEorzeaClock(unixMs: number): { hour: number; minute: number } {
  const et = toEorzeaMs(unixMs);
  const dayMs = et % 86400000;
  return {
    hour: Math.floor(dayMs / 3600000),
    minute: Math.floor((dayMs % 3600000) / 60000),
  };
}

/** ET 時刻を小数の「時」で返す (例: 13.5 = ET 13:30) */
export function getEorzeaHourFloat(unixMs: number): number {
  return (toEorzeaMs(unixMs) % 86400000) / 3600000;
}

/** unixMs が属する天候窓の開始時刻 (unix ms)。窓は ET 0/8/16 時に切り替わる */
export function getWeatherWindowStart(unixMs: number): number {
  return Math.floor(unixMs / WEATHER_WINDOW_REAL_MS) * WEATHER_WINDOW_REAL_MS;
}

/** 天候窓開始時点の ET 時 (0, 8, 16 のいずれか) */
export function getWindowStartHour(windowStartMs: number): number {
  return Math.round(getEorzeaHourFloat(windowStartMs)) % 24;
}

/** ET の HH:MM 表示 */
export function formatEorzeaClock(unixMs: number): string {
  const { hour, minute } = getEorzeaClock(unixMs);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
