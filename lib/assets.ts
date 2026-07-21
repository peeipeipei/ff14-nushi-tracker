/** XIVAPI アセット URL とロードストーン URL の組み立て */

/** アイテムアイコン画像 (40x40 png)。icon は "029094" 形式 */
export function iconUrl(icon: string): string {
  const folder = icon.slice(0, 3) + "000";
  return `https://v2.xivapi.com/api/asset?path=ui/icon/${folder}/${icon}.tex&format=png`;
}

/** ゲーム内マップ画像 (2048x2048 jpg)。mapId は "s1f3/01" 形式 */
export function mapUrl(mapId: string): string {
  return `https://v2.xivapi.com/api/asset/map/${mapId}`;
}

/** ロードストーン (エオルゼアデータベース) のアイテムページ */
export function lodestoneUrl(lodestoneId: string): string {
  return `https://jp.finalfantasyxiv.com/lodestone/playguide/db/item/${lodestoneId}/`;
}

/** フィッシング関連スキル/アクションのゲームアイコン (icon コードと名称) */
export const SKILL_ICONS = {
  powerfulHookset: { code: "001115", label: "ストロングフッキング" },
  precisionHookset: { code: "001116", label: "プレシジョンフッキング" },
  fishEyes: { code: "001112", label: "フィッシュアイ" },
  intuition: { code: "211101", label: "漁師の直感" },
  mooch: { code: "001104", label: "泳がせ釣り" },
} as const;
