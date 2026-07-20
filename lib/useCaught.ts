"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "nushi-caught-v1";

/** 釣獲済みヌシの ID 集合を localStorage に永続化するフック */
export function useCaught() {
  const [caught, setCaught] = useState<Set<number>>(() => new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCaught(new Set(JSON.parse(raw) as number[]));
    } catch {
      // 壊れたデータは無視して空から開始
    }
    setLoaded(true);
  }, []);

  const toggle = useCallback((id: number) => {
    setCaught((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ストレージ不可 (プライベートモード等) でも UI 上は動かす
      }
      return next;
    });
  }, []);

  return { caught, toggle, loaded };
}
