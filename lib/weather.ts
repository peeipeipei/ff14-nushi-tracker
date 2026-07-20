/**
 * FF14 の天候予測アルゴリズムと「次に釣れる窓」の探索。
 *
 * 天候はリアル 23分20秒 (ET 8時間) ごとに、ゾーン別の累積確率テーブルと
 * 時刻から決定論的に求まる 0-99 の乱数値で決まる。
 */
import type { Nushi, UpcomingWindow, WeatherRate } from "./types";
import {
  WEATHER_WINDOW_REAL_MS,
  REAL_MS_PER_EORZEA_HOUR,
  getWeatherWindowStart,
  getWindowStartHour,
} from "./eorzeaTime";

/** 天候抽選値 (0-99)。FF14 クライアントと同一のハッシュ計算 */
export function calculateForecastTarget(unixMs: number): number {
  const unixSeconds = Math.floor(unixMs / 1000);
  const bell = unixSeconds / 175;
  const increment = (bell + 8 - (bell % 8)) % 24;
  const totalDays = Math.floor(unixSeconds / 4200);
  const calcBase = (totalDays * 100 + increment) >>> 0;
  const step1 = ((calcBase << 11) ^ calcBase) >>> 0;
  const step2 = ((step1 >>> 8) ^ step1) >>> 0;
  return step2 % 100;
}

/** 指定時刻のゾーン天候 (WeatherType ID) */
export function getWeather(rate: WeatherRate, unixMs: number): number {
  const target = calculateForecastTarget(unixMs);
  for (const [weatherId, cumulative] of rate.rates) {
    if (target < cumulative) return weatherId;
  }
  return rate.rates[rate.rates.length - 1][0];
}

/**
 * 魚の時間帯条件 [startHour, endHour) と天候窓 [h0, h0+8) の交差を
 * 「窓開始からの ET 時間オフセット」の区間として返す (最大2区間)。
 */
function activeHourSegments(
  startHour: number,
  endHour: number,
  windowStartHour: number
): [number, number][] {
  if (startHour === 0 && endHour === 24) return [[0, 8]];
  // 時間帯を [開始, 終了) の非日跨ぎ区間に分解
  const ranges: [number, number][] =
    startHour < endHour
      ? [[startHour, endHour]]
      : [[startHour, 24], [0, endHour]];
  const segments: [number, number][] = [];
  for (const [a, b] of ranges) {
    // 窓 [windowStartHour, windowStartHour+8) との交差
    const lo = Math.max(a, windowStartHour);
    const hi = Math.min(b, windowStartHour + 8);
    if (lo < hi) segments.push([lo - windowStartHour, hi - windowStartHour]);
  }
  return segments.sort((x, y) => x[0] - y[0]);
}

const MAX_WINDOWS = 3000; // 約48日ぶん先まで探索

/**
 * fromMs 以降で最初に釣獲条件 (時間帯 + 天候 + 直前天候) を満たす窓を返す。
 * 見つからなければ null。
 */
export function findNextMatchingWeatherWindow(
  fish: Nushi,
  rate: WeatherRate | null,
  fromMs: number
): UpcomingWindow | null {
  const noTime = fish.startHour === 0 && fish.endHour === 24;
  const noWeather = fish.weatherSet.length === 0 && fish.previousWeatherSet.length === 0;

  if (noTime && noWeather) {
    return {
      startMs: fromMs,
      endMs: Number.POSITIVE_INFINITY,
      weatherId: null,
      previousWeatherId: null,
      isActiveNow: true,
      isAlways: true,
    };
  }

  // 天候条件があるのにレートテーブルが無い場合は計算不能
  if (!noWeather && !rate) return null;

  const firstWindow = getWeatherWindowStart(fromMs);

  const weatherOk = (windowStartMs: number): boolean => {
    if (!rate) return true;
    if (
      fish.weatherSet.length > 0 &&
      !fish.weatherSet.includes(getWeather(rate, windowStartMs))
    ) {
      return false;
    }
    if (
      fish.previousWeatherSet.length > 0 &&
      !fish.previousWeatherSet.includes(
        getWeather(rate, windowStartMs - WEATHER_WINDOW_REAL_MS)
      )
    ) {
      return false;
    }
    return true;
  };

  for (let i = 0; i < MAX_WINDOWS; i++) {
    const w = firstWindow + i * WEATHER_WINDOW_REAL_MS;
    if (!weatherOk(w)) continue;

    const segments = activeHourSegments(
      fish.startHour,
      fish.endHour,
      getWindowStartHour(w)
    );
    for (const [lo, hi] of segments) {
      const segStart = w + lo * REAL_MS_PER_EORZEA_HOUR;
      let segEnd = w + hi * REAL_MS_PER_EORZEA_HOUR;
      if (segEnd <= fromMs) continue; // もう終わった区間

      // 窓境界まで続く区間は、後続の窓も条件を満たす限り延長する
      let cursor = w;
      while (segEnd === cursor + WEATHER_WINDOW_REAL_MS) {
        const next = cursor + WEATHER_WINDOW_REAL_MS;
        if (!weatherOk(next)) break;
        const nextSegs = activeHourSegments(
          fish.startHour,
          fish.endHour,
          getWindowStartHour(next)
        );
        if (nextSegs.length === 0 || nextSegs[0][0] !== 0) break;
        segEnd = next + nextSegs[0][1] * REAL_MS_PER_EORZEA_HOUR;
        cursor = next;
        if (segEnd - segStart > 24 * 3600 * 1000) break; // 実質常設なら打ち切り
      }

      return {
        startMs: segStart,
        endMs: segEnd,
        weatherId: rate && fish.weatherSet.length > 0 ? getWeather(rate, w) : null,
        previousWeatherId:
          rate && fish.previousWeatherSet.length > 0
            ? getWeather(rate, w - WEATHER_WINDOW_REAL_MS)
            : null,
        isActiveNow: segStart <= fromMs,
        isAlways: false,
      };
    }
  }
  return null;
}
