"use client";

import { useCallback, useEffect, useState } from "react";

/** ID 集合を localStorage に永続化する汎用フック */
function useCheckedSet(storageKey: string) {
  const [set, setSet] = useState<Set<number>>(() => new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setSet(new Set(JSON.parse(raw) as number[]));
    } catch {
      // 壊れたデータは無視して空から開始
    }
    setLoaded(true);
  }, [storageKey]);

  const toggle = useCallback(
    (id: number) => {
      setSet((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch {
          // ストレージ不可 (プライベートモード等) でも UI 上は動かす
        }
        return next;
      });
    },
    [storageKey]
  );

  return { set, toggle, loaded };
}

/** 釣獲済みヌシの ID 集合 */
export function useCaught() {
  const { set, toggle, loaded } = useCheckedSet("nushi-caught-v1");
  return { caught: set, toggle, loaded };
}

/**
 * 漁師の直感の準備 (先に釣る予測魚) の進捗。
 * ヌシ本体の釣獲とは別管理で、セッションごとの下ごしらえチェックに使う。
 */
export function usePrep() {
  const { set, toggle, loaded } = useCheckedSet("nushi-prep-v1");
  return { prep: set, togglePrep: toggle, prepLoaded: loaded };
}
