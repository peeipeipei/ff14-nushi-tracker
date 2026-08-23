"use client";

import { useEffect } from "react";

/**
 * Service Worker を登録してオフライン閲覧とホーム画面追加(PWA)を有効にする。
 * 表示要素は持たない。開発中は登録しない (HMR と競合するため)。
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 登録失敗してもサイトは通常どおり動くので握りつぶす
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
