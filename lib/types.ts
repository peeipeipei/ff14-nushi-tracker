/** ヌシ1匹分のデータ (nushi_data.json のエントリ) */
export interface Nushi {
  id: number | null;
  name: string;
  nameJa: string | null;
  spotId: number | null;
  spotName: string | null;
  spotNameJa: string | null;
  zoneName: string | null;
  zoneNameJa: string | null;
  /** 天候レートテーブルのキー (TerritoryType ID)。null なら天候計算不可 */
  territoryId: number | null;
  /** エオルゼア時間の釣獲開始時刻 (0-23) */
  startHour: number;
  /** エオルゼア時間の釣獲終了時刻 (1-24)。startHour より小さい場合は日跨ぎ */
  endHour: number;
  /** 釣獲可能な天候の WeatherType ID 群。空配列なら天候条件なし */
  weatherSet: number[];
  /** 直前の天候窓に要求される WeatherType ID 群。空配列なら条件なし */
  previousWeatherSet: number[];
  bestCatchPath: (string | number)[];
  tug: "legendary" | "heavy";
  hookset: string | null;
  folklore: boolean;
  fishEyes: boolean;
  intuition: boolean;
  patch: number | string;
}

/** ゾーン(TerritoryType)ごとの天候抽選テーブル。[weatherTypeId, 累積確率(〜100)] の列 */
export interface WeatherRate {
  zone_id: number | null;
  rates: [number, number][];
}

/** 天候 ID → 表示名 */
export interface WeatherTypeInfo {
  en: string;
  ja: string;
  icon: string;
}

/** 「次に釣れる時間帯」の計算結果 */
export interface UpcomingWindow {
  /** 窓の開始 (unix ms)。現在釣獲可能なら now 以前 */
  startMs: number;
  /** 窓の終了 (unix ms) */
  endMs: number;
  /** 窓中の天候 ID (天候条件なしの魚は null) */
  weatherId: number | null;
  /** 直前窓の天候 ID (previousWeatherSet 指定魚のみ) */
  previousWeatherId: number | null;
  /** 現在釣獲可能か */
  isActiveNow: boolean;
  /** 時間・天候とも無条件 (常時釣獲可) か */
  isAlways: boolean;
}
