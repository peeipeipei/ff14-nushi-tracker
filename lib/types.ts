/** ヌシ1匹分のデータ (nushi_data.json のエントリ) */
/** 泳がせルート・直感条件で参照するアイテム名 */
export interface ItemRef {
  ja: string | null;
  en: string;
}

export interface Nushi {
  id: number | null;
  name: string;
  nameJa: string | null;
  /** ゲーム内「ヌシ」(太公望アチーブメントの対象) か */
  bigFish: boolean;
  /** 泳がせ釣りルート。先頭が餌、以降は泳がせる中間魚 */
  baitPath: ItemRef[];
  /** 漁師の直感の発動条件 (先に釣る魚と匹数) */
  predators: (ItemRef & { count: number })[];
  folkloreNameJa: string | null;
  /** 直感の持続秒数 */
  intuitionLength: number | null;
  /** ゲーム内マップ座標 [x, y] */
  mapCoords: [number, number] | null;
  /** マップスケール (座標の最大値の算出に使用) */
  mapScale: number | null;
  /** ゲーム内マップ画像の ID ("s1f3/01" 形式、XIVAPI アセット用) */
  mapId: string | null;
  /** アイテムアイコン ID ("029094" 形式) */
  icon: string | null;
  /** ロードストーン エオルゼアデータベースのアイテム ID */
  lodestoneId: string | null;
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
  tug: "legendary" | "heavy" | "light" | "medium";
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

/** XIVAPI から取得した漁師アチーブメント */
export interface Achievement {
  id: number;
  nameJa: string | null;
  nameEn: string | null;
  descJa: string | null;
  points: number | null;
  order: number | null;
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
