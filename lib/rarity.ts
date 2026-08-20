/**
 * ヌシの「出現レア度」。
 *
 * 指標は uptime (時間帯 + 天候 + 直前天候の条件を満たす実時間の割合 %)。
 * 値が小さいほど窓が開く機会が少なく、見かけたら優先して釣る価値が高い。
 */

export type RarityTier = 1 | 2 | 3 | 4 | 5;

export interface RarityInfo {
  tier: RarityTier;
  /** 短いラベル (バッジ用) */
  label: string;
  /** 一覧の凡例・詳細で使う説明 */
  description: string;
  /** 文字色 */
  className: string;
  /** バッジ (枠 + 背景 + 文字) */
  badgeClassName: string;
}

const TIERS: Record<RarityTier, Omit<RarityInfo, "tier">> = {
  5: {
    label: "極稀",
    description: "出現率1%未満。ほとんど窓が開かない最上級のレア",
    className: "text-rose-300",
    badgeClassName: "border-rose-400/60 bg-rose-500/15 text-rose-200",
  },
  4: {
    label: "稀",
    description: "出現率1〜3%。窓が開いたら優先したい",
    className: "text-hookgold-bright",
    badgeClassName: "border-hookgold/70 bg-hookgold/15 text-hookgold-bright",
  },
  3: {
    label: "やや稀",
    description: "出現率3〜8%。狙って待つ必要がある",
    className: "text-moonlight",
    badgeClassName: "border-moonlight-dim/50 bg-moonlight/10 text-moonlight",
  },
  2: {
    label: "普通",
    description: "出現率8〜20%。待てば比較的すぐ出る",
    className: "text-moonlight-dim",
    badgeClassName: "border-abyss-600 bg-abyss-800 text-moonlight-dim",
  },
  1: {
    label: "頻出",
    description: "出現率20%以上。いつでも狙いやすい",
    className: "text-moonlight-faint",
    badgeClassName: "border-abyss-600 bg-abyss-800 text-moonlight-faint",
  },
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
