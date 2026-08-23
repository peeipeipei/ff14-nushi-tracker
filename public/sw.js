/*
 * FFXIV 太公望への道 — Service Worker
 *
 * 目的はオフラインでも「釣り方・条件」を確認できること。
 * 窓の計算はすべて端末側で行うため、一度開いていれば圏外でも実用になる。
 *
 * 方針 (古い内容を掴んだままにしないことを最優先):
 *  - HTML(ページ遷移) : ネットワーク優先。失敗したときだけキャッシュを返す
 *  - ビルド成果物 /_next/static : 内容ハッシュ付きで不変なのでキャッシュ優先
 *  - XIVAPI の画像       : 不変なのでキャッシュ優先 (別キャッシュで上限管理)
 *  - それ以外            : 素通し
 */

const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const PAGE_CACHE = `pages-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const IMAGE_CACHE = `xivimg-${VERSION}`;

/** オフライン起動に最低限必要なもの */
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

const MAX_IMAGES = 600;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // 1件でも失敗するとインストールごと失敗するため個別に握りつぶす
      await Promise.all(
        SHELL.map((url) => cache.add(url).catch(() => undefined))
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, PAGE_CACHE, ASSET_CACHE, IMAGE_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.map((n) => (keep.has(n) ? null : caches.delete(n))));
      await self.clients.claim();
    })()
  );
});

/** 古いエントリを削るだけの簡易上限管理 */
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

async function cacheFirst(request, cacheName, opts = {}) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  // opaque(no-cors)も保存する。ok でなくても type:'opaque' は status 0 になる
  if (res && (res.ok || res.type === "opaque")) {
    cache.put(request, res.clone()).catch(() => undefined);
    if (opts.max) trim(cacheName, opts.max);
  }
  return res;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone()).catch(() => undefined);
    return res;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    // 未訪問ページはトップのキャッシュで代替する
    const shell = await caches.open(SHELL_CACHE);
    const root = await shell.match("/");
    if (root) return root;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // XIVAPI のアイコン・マップ画像 (別オリジン)
  if (url.hostname === "v2.xivapi.com") {
    event.respondWith(
      cacheFirst(request, IMAGE_CACHE, { max: MAX_IMAGES }).catch(() => fetch(request))
    );
    return;
  }

  // 自サイト以外は素通し (ロードストーン等)
  if (url.origin !== self.location.origin) return;

  // ビルド成果物はハッシュ付きで不変
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE).catch(() => fetch(request)));
    return;
  }

  // アイコン類
  if (/^\/(icon-|apple-touch-icon|favicon)/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE).catch(() => fetch(request)));
    return;
  }

  // ページ遷移: 常に最新を取りに行き、オフライン時のみキャッシュ
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }
});
