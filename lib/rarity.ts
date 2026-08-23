/**
 * ヌシの「出現レア度」。
 *
 * 指標は effectiveUptime (時間帯 + 天候 + 直前天候に加え、
 * 漁師の直感が要る魚は予測魚の窓の狭さも織り込んだ実時間の割合 %)。
 * 値が小さいほど釣れるようになる機会が少なく、優先して釣る価値が高い。
 */

export type RarityTier = 1 | 2 | 3 | 4 | 5;

export interface RarityInfo {
  tier: RarityTier;
  /** ★の文字色 (レアなほど目立つ) */
  className: string;
}

const TIERS: Record<RarityTier, Omit<RarityInfo, "tier">> = {
  5: { className: "text-rose-300" },
  4: { className: "text-hookgold-bright" },
  3: { className: "text-moonlight" },
  2: { className: "text-moonlight-dim" },
  1: { className: "text-moonlight-faint" },
};

/** uptime(%) からレア度を判定。uptime 不明なら null */
export function rarityTier(uptime: number | null): RarityTier | null {
  if (uptime === null) return null;
  if (uptime < 1) return 5;
  if (uptime < 3) return 4;
  if (uptime < 8) return 3;
  if (uptime < 20) return 2;
  return 1;
}

/** レア度の表示情報。uptime 不明なら null */
export function rarityInfo(uptime: number | null): RarityInfo | null {
  const tier = rarityTier(uptime);
  return tier === null ? null : { tier, ...TIERS[tier] };
}

/** ★★★☆☆ 形式 */
export function rarityStars(tier: RarityTier): string {
  return "★".repeat(tier) + "☆".repeat(5 - tier);
}

/** 出現率の表示 (1%未満は小数2桁、それ以上は1桁) */
export function formatUptime(uptime: number): string {
  return uptime < 1 ? `${uptime.toFixed(2)}%` : `${uptime.toFixed(1)}%`;
}

/**
 * 「いま釣るべき」か = レア度が高い(★4以上)のに、いま窓が開いている。
 * 逃すと次の機会が遠いので一覧で強調する。
 */
export function isRareChanceNow(
  uptime: number | null,
  window: { isActiveNow: boolean; isAlways: boolean } | null
): boolean {
  const tier = rarityTier(uptime);
  if (tier === null || tier < 4) return false;
  return !!window && window.isActiveNow && !window.isAlways;
}
