/**
 * 漁師の直感が要るヌシの「実際に狙えるタイミング」。
 *
 * 直感が必要な魚は、本命の条件が揃っていても先に予測魚を釣らないと釣れない。
 * 予測魚自身に時間帯・天候の条件がある場合、実際のチャンスはそちらに縛られる
 * (例: 七彩天主は本命が常時でも、予測魚が ET 0:00〜4:00 / 4:00〜8:00 などに限られる)。
 *
 * ここでは次のように見積もる。
 *  - 準備が整う時刻 = 各予測魚が釣れるようになる時刻のうち最も遅いもの
 *    (予測魚は順に釣って積み上げるため、最後に釣れるようになるものが律速)
 *  - 準備の締切     = その「最後の予測魚」の窓が閉じる時刻
 *    (全部いま釣れる場合は、最初に閉じる窓を締切とする安全側の見積り)
 *  - 実際のチャンス = 準備が整った時刻以降で、本命の条件を満たす窓
 *
 * 匹数ぶんの釣り上げにかかる時間や、直感の持続中に本命を釣り切れるかまでは
 * 織り込んでいないため、あくまで計画用の目安。
 */
import type { Nushi, UpcomingWindow } from "./types";
import { nextWindow } from "./windowInfo";

export interface IntuitionTiming {
  /** 全ての予測魚が釣れるようになる時刻 */
  readyAt: number;
  /** 準備を終えていたい時刻 (律速となる予測魚の窓が閉じる時刻) */
  deadline: number;
}

/** 予測魚の条件から準備が整う時刻を求める。48日以内に揃わなければ null */
export function intuitionTiming(
  nushi: Nushi,
  fromMs: number
): IntuitionTiming | null {
  const preds = nushi.predators.filter((p) => p.conditions);
  if (preds.length === 0) return null;

  let readyAt = fromMs;
  let deadline = Number.POSITIVE_INFINITY;

  for (const p of preds) {
    const c = p.conditions!;
    const w = nextWindow(c, c.territoryId, fromMs);
    if (!w) return null;
    // いま釣れるなら「今から可能」とみなす
    const at = w.isActiveNow ? fromMs : w.startMs;
    if (at > readyAt) {
      readyAt = at;
      deadline = w.endMs;
    } else if (at === readyAt) {
      deadline = Math.min(deadline, w.endMs);
    }
  }
  return { readyAt, deadline };
}

/**
 * 直感の準備を織り込んだ「次に狙える窓」。
 * 直感が不要な魚や、予測魚の条件が計算できない場合は null。
 */
export function intuitionAwareWindow(
  nushi: Nushi,
  fromMs: number
): UpcomingWindow | null {
  const t = intuitionTiming(nushi, fromMs);
  if (!t) return null;

  const target = nextWindow(nushi, nushi.territoryId, t.readyAt);
  if (!target) return null;

  // 本命に時間・天候の条件がない場合、チャンスは予測魚の窓そのもの
  if (target.isAlways) {
    return {
      startMs: t.readyAt,
      endMs: t.deadline,
      weatherId: null,
      previousWeatherId: null,
      isActiveNow: t.readyAt <= fromMs && t.deadline > fromMs,
      isAlways: false,
    };
  }

  // 本命にも条件がある場合は、準備が整って以降で条件を満たす窓
  const startMs = Math.max(target.startMs, t.readyAt);
  return {
    ...target,
    startMs,
    isActiveNow: startMs <= fromMs && target.endMs > fromMs,
  };
}
