"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import nushiData from "@/data/nushi_data.json";
import weatherData from "@/data/weather_rates.json";
import type { Nushi, UpcomingWindow, WeatherRate, WeatherTypeInfo } from "@/lib/types";
import { findNextMatchingWeatherWindow } from "@/lib/weather";
import { formatWhen } from "@/lib/windowInfo";
import { iconUrl, SKILL_ICONS } from "@/lib/assets";
import { useCaught, usePrep, usePinned } from "@/lib/useCaught";
import EorzeaClock from "@/components/EorzeaClock";
import NushiRow from "@/components/NushiRow";
import SiteFooter from "@/components/SiteFooter";

const allNushi = nushiData as unknown as Nushi[];
const weatherRates = (weatherData as unknown as { rates: Record<string, WeatherRate> })
  .rates;
const weatherTypes = (weatherData as unknown as { types: Record<string, WeatherTypeInfo> })
  .types;

const BIG_FISH_TOTAL = allNushi.filter((n) => n.bigFish).length;

interface Row {
  nushi: Nushi;
  window: UpcomingWindow | null;
}

/**
 * ソートキー (小さいほど上)。いま釣れる魚を上に、その中で緊急度順に:
 * 1. 出現中(時限) … 残り時間 (endMs-nowMs) 昇順 = もうすぐ閉じるものが上
 * 2. 常時 … いつでも釣れるので出現中の直後 (待機より上)
 * 3. 待機中 … 開始までの時間 (startMs-nowMs) 昇順
 * 4. 窓なし … 最下部
 */
function sortKey(row: Row, nowMs: number): number {
  const w = row.window;
  if (!w) return Number.POSITIVE_INFINITY;
  const TIER = 1e13;
  if (w.isAlways) return TIER; // 常時: 出現中(<1e8)の後、待機(>=2e13)の前
  if (w.isActiveNow) return w.endMs - nowMs;
  return 2 * TIER + (w.startMs - nowMs);
}

const EXPANSIONS = [
  { key: 2, label: "新生" },
  { key: 3, label: "蒼天" },
  { key: 4, label: "紅蓮" },
  { key: 5, label: "漆黒" },
  { key: 6, label: "暁月" },
  { key: 7, label: "黄金" },
] as const;

type TypeFilter = "all" | "nushi" | "oonushi";
type AvailFilter = "all" | "active" | "always" | "timed";
type SortMode = "window" | "patch" | "name";

function expansionOf(patch: number | string): number {
  return Math.floor(parseFloat(String(patch)));
}

/** フィルタチップの見た目 (選択中は金地) */
function chipClass(active: boolean): string {
  return `rounded-full px-3 py-1 text-xs transition-colors ${
    active
      ? "bg-hookgold text-abyss font-bold"
      : "border border-abyss-600 text-moonlight-dim hover:border-hookgold-deep hover:text-moonlight"
  }`;
}

const FILTER_STORAGE_KEY = "nushi-filters-v1";
const NOTIFY_STORAGE_KEY = "nushi-notify-v1";
const NOTIFY_LEAD_MS = 10 * 60 * 1000; // 出現の約10分前に通知

export default function Home() {
  // SSR とのハイドレーション不一致を避けるため、時刻はマウント後に初期化する
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [availFilter, setAvailFilter] = useState<AvailFilter>("all");
  const [uncaughtOnly, setUncaughtOnly] = useState(false);
  const [expFilters, setExpFilters] = useState<number[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [fishEyesOnly, setFishEyesOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("window");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false); // モバイルでのフィルタ開閉
  // ピンした魚の出現通知
  const [notifyOn, setNotifyOn] = useState(false);
  const [notifySupported, setNotifySupported] = useState(true);
  const notifiedRef = useRef<Set<string>>(new Set());
  const { caught, toggle } = useCaught();
  const { prep, togglePrep } = usePrep();
  const { pinned, togglePin } = usePinned();

  // 釣獲チェック: 誤操作防止のため、付ける/外すどちらも確認する
  const toggleCaughtSafe = (id: number) => {
    const n = allNushi.find((x) => x.id === id);
    const name = n?.nameJa ?? n?.name ?? "この魚";
    const msg = caught.has(id)
      ? `「${name}」の釣獲済みを解除しますか？`
      : `「${name}」を釣獲済みにしますか？`;
    if (!window.confirm(msg)) return;
    toggle(id);
  };

  // 直感対象のヌシへジャンプ: 絞り込みで隠れないよう検索をクリアし、展開してスクロール
  const jumpTo = (id: number) => {
    setQuery("");
    setExpandedId(id);
    // フィルタ更新後の再描画を待ってからスクロール
    setTimeout(() => {
      document
        .getElementById(`nushi-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  useEffect(() => {
    // 保存済みフィルタの復元
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (raw) {
        const f = JSON.parse(raw);
        if (["all", "active", "always", "timed"].includes(f.availFilter))
          setAvailFilter(f.availFilter);
        if (typeof f.uncaughtOnly === "boolean") setUncaughtOnly(f.uncaughtOnly);
        if (Array.isArray(f.expFilters))
          setExpFilters(f.expFilters.filter((x: unknown) => typeof x === "number"));
        if (["all", "nushi", "oonushi"].includes(f.typeFilter))
          setTypeFilter(f.typeFilter);
        if (typeof f.fishEyesOnly === "boolean") setFishEyesOnly(f.fishEyesOnly);
        if (["window", "patch", "name"].includes(f.sortMode))
          setSortMode(f.sortMode);
      }
    } catch {
      // 壊れた保存値は無視
    }
    // 通知: 対応状況と前回の有効状態を復元
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifySupported(false);
    } else if (
      localStorage.getItem(NOTIFY_STORAGE_KEY) === "1" &&
      Notification.permission === "granted"
    ) {
      setNotifyOn(true);
    }
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 通知トグル: 有効化時に許可を要求
  const toggleNotify = async () => {
    if (!("Notification" in window)) return;
    if (notifyOn) {
      setNotifyOn(false);
      try {
        localStorage.setItem(NOTIFY_STORAGE_KEY, "0");
      } catch {
        /* noop */
      }
      return;
    }
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotifyOn(true);
      notifiedRef.current.clear();
      try {
        localStorage.setItem(NOTIFY_STORAGE_KEY, "1");
        new Notification("通知をオンにしました", {
          body: "ピン留めした魚の約10分前にお知らせします（このページを開いている間）",
          icon: "/icon.svg",
        });
      } catch {
        /* noop */
      }
    }
  };

  // フィルタ状態の保存 (初期化前は保存しない)
  useEffect(() => {
    if (nowMs === null) return;
    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({
          availFilter,
          uncaughtOnly,
          expFilters,
          typeFilter,
          fishEyesOnly,
          sortMode,
        })
      );
    } catch {
      // ストレージ不可でも動作は継続
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availFilter, uncaughtOnly, expFilters, typeFilter, fishEyesOnly, sortMode]);

  // 窓の再計算は30秒粒度 (計算自体は数十msなので体感遅延なし)
  const computeTick = nowMs === null ? null : Math.floor(nowMs / 30000);
  const rows = useMemo<Row[]>(() => {
    if (computeTick === null) return [];
    const t = computeTick * 30000;
    return allNushi.map((nushi) => ({
      nushi,
      window: findNextMatchingWeatherWindow(
        nushi,
        nushi.territoryId ? weatherRates[String(nushi.territoryId)] ?? null : null,
        t
      ),
    }));
  }, [computeTick]);

  // ピンした魚が約10分以内に出現するなら通知 (30秒粒度でチェック)
  useEffect(() => {
    if (!notifyOn || computeTick === null) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const t = computeTick * 30000;
    for (const r of rows) {
      const n = r.nushi;
      if (n.id === null || !pinned.has(n.id)) continue;
      const w = r.window;
      if (!w || w.isAlways || w.isActiveNow) continue;
      const until = w.startMs - t;
      if (until <= 0 || until > NOTIFY_LEAD_MS) continue;
      const key = `${n.id}:${w.startMs}`;
      if (notifiedRef.current.has(key)) continue;
      notifiedRef.current.add(key);
      const mins = Math.max(1, Math.round(until / 60000));
      try {
        new Notification(`まもなく出現: ${n.nameJa ?? n.name}`, {
          body: `${formatWhen(w.startMs, t)}頃 (あと約${mins}分)${
            n.spotNameJa ? ` ・ ${n.spotNameJa}` : ""
          }`,
          tag: key,
          icon: "/icon.svg",
        });
      } catch {
        /* noop */
      }
    }
  }, [computeTick, notifyOn, pinned, rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchesQuery = (n: (typeof rows)[number]["nushi"]) =>
      !q ||
      n.name.toLowerCase().includes(q) ||
      (n.nameJa ?? "").toLowerCase().includes(q) ||
      (n.spotNameJa ?? "").toLowerCase().includes(q) ||
      (n.zoneNameJa ?? "").toLowerCase().includes(q);

    const isPinned = (n: (typeof rows)[number]["nushi"]) =>
      n.id !== null && pinned.has(n.id);

    const filtered = rows.filter((r) => {
      const n = r.nushi;
      // ピン留めした魚は絞り込みを無視して常に表示 (検索語だけは尊重)
      if (isPinned(n)) return matchesQuery(n);
      // 常時 = 時間・天候の制約がなく常に釣れるもの (isAlways)
      // 開催中 = いま釣獲可能 (常時を含む) / 時限 = 常時を除いた条件付き
      if (availFilter === "active" && !(r.window?.isActiveNow ?? false)) return false;
      if (availFilter === "always" && !(r.window?.isAlways ?? false)) return false;
      if (availFilter === "timed" && (r.window?.isAlways ?? false)) return false;
      if (uncaughtOnly && n.id !== null && caught.has(n.id)) return false;
      if (expFilters.length > 0 && !expFilters.includes(expansionOf(n.patch)))
        return false;
      if (typeFilter === "nushi" && !n.bigFish) return false;
      if (typeFilter === "oonushi" && !n.oonushi) return false;
      if (fishEyesOnly && !n.fishEyes) return false;
      return matchesQuery(n);
    });

    const t = (computeTick ?? 0) * 30000;
    const bySort = (a: Row, b: Row): number => {
      if (sortMode === "patch") {
        return (
          parseFloat(String(a.nushi.patch)) - parseFloat(String(b.nushi.patch)) ||
          (a.nushi.nameJa ?? "").localeCompare(b.nushi.nameJa ?? "", "ja")
        );
      }
      if (sortMode === "name") {
        return (a.nushi.nameJa ?? a.nushi.name).localeCompare(
          b.nushi.nameJa ?? b.nushi.name,
          "ja"
        );
      }
      // 窓が近い順 (安定化のため tick 時刻で計算)
      return sortKey(a, t) - sortKey(b, t);
    };

    // ピン留めを最優先で先頭に、その中と外はそれぞれ選択ソートで並べる
    return filtered.sort((a, b) => {
      const pa = isPinned(a.nushi) ? 0 : 1;
      const pb = isPinned(b.nushi) ? 0 : 1;
      return pa - pb || bySort(a, b);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rows,
    query,
    availFilter,
    uncaughtOnly,
    expFilters,
    typeFilter,
    fishEyesOnly,
    sortMode,
    caught,
    pinned,
    computeTick,
  ]);

  const activeCount = rows.filter((r) => r.window?.isActiveNow).length;
  const caughtBig = allNushi.filter(
    (n) => n.bigFish && n.id !== null && caught.has(n.id)
  ).length;

  if (nowMs === null) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="py-24 text-center text-sm text-moonlight-faint">
          潮を読んでいます…
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 sm:mb-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-moonlight sm:text-3xl">
            FFXIV <span className="text-hookgold">太公望への道</span>
          </h1>
          <p className="mt-1 text-xs text-moonlight-dim sm:text-sm">
            全{allNushi.length}種 ・ いま釣れる{" "}
            <span className="text-tide-active font-bold">{activeCount}</span> 種 ・
            釣獲済み{" "}
            <span className="text-hookgold-bright font-bold">
              {caughtBig}/{BIG_FISH_TOTAL}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {notifySupported && (
            <button
              onClick={toggleNotify}
              title={
                notifyOn
                  ? "ピン留めした魚の出現通知: オン (クリックでオフ)"
                  : "ピン留めした魚を約10分前に通知 (クリックでオン)"
              }
              aria-pressed={notifyOn}
              className={`rounded-lg border px-2.5 py-2 text-sm transition-colors ${
                notifyOn
                  ? "border-hookgold bg-hookgold/15 text-hookgold-bright"
                  : "border-abyss-600 bg-abyss-800 text-moonlight-dim hover:text-moonlight"
              }`}
            >
              {notifyOn ? "🔔" : "🔕"}
              <span className="hidden sm:inline"> 通知</span>
            </button>
          )}
          <Link
            href="/list"
            className="rounded-lg border border-hookgold-deep bg-abyss-800 px-2.5 py-2 text-sm text-hookgold transition-colors hover:bg-abyss-700 hover:text-hookgold-bright"
          >
            📖<span className="hidden sm:inline"> 図鑑</span>
          </Link>
          <Link
            href="/achievements"
            className="rounded-lg border border-hookgold-deep bg-abyss-800 px-2.5 py-2 text-sm text-hookgold transition-colors hover:bg-abyss-700 hover:text-hookgold-bright"
          >
            🏆<span className="hidden sm:inline"> アチーブメント</span>
          </Link>
          <EorzeaClock nowMs={nowMs} />
        </div>
      </header>

      <div className="sticky top-0 z-10 -mx-3 mb-4 space-y-2.5 border-b border-abyss-700/60 bg-abyss/90 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4">
        {/* 常時表示: 検索 + 件数 + (モバイル)絞り込みトグル */}
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="魚名・釣り場で検索…"
            className="w-full rounded-md border border-abyss-700 bg-abyss-800 px-3 py-2 text-sm text-moonlight placeholder:text-moonlight-faint focus:border-hookgold focus:outline-none sm:w-64"
          />
          <span className="hidden shrink-0 text-xs text-moonlight-faint tabular-nums sm:inline">
            表示中 {visible.length} 種
          </span>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex shrink-0 items-center gap-1 rounded-md border border-abyss-700 bg-abyss-800 px-3 py-2 text-sm text-moonlight-dim sm:hidden"
            aria-expanded={filtersOpen}
          >
            絞り込み{filtersOpen ? " ▲" : " ▼"}
          </button>
        </div>

        {/* フィルタ群: モバイルは折りたたみ、sm以上は常時表示 */}
        <div className={`${filtersOpen ? "block" : "hidden"} space-y-2.5 sm:block`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-moonlight-dim">
              <input
                type="checkbox"
                checked={uncaughtOnly}
                onChange={(e) => setUncaughtOnly(e.target.checked)}
                className="accent-hookgold"
              />
              未釣獲のみ
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-moonlight-dim">
              <input
                type="checkbox"
                checked={fishEyesOnly}
                onChange={(e) => setFishEyesOnly(e.target.checked)}
                className="accent-hookgold"
              />
              <img
                src={iconUrl(SKILL_ICONS.fishEyes.code)}
                alt=""
                width={18}
                height={18}
              />
              フィッシュアイ
            </label>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-md border border-abyss-700 bg-abyss-800 px-2 py-2 text-sm text-moonlight focus:border-hookgold focus:outline-none"
              aria-label="並び順"
            >
              <option value="window">出現が近い順</option>
              <option value="patch">パッチ順</option>
              <option value="name">名前順</option>
            </select>
            <span className="ml-auto text-xs text-moonlight-faint tabular-nums sm:hidden">
              表示中 {visible.length} 種
            </span>
          </div>
        {/* 拡張フィルタ (複数選択可) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] text-moonlight-faint">拡張</span>
          <button
            onClick={() => setExpFilters([])}
            className={chipClass(expFilters.length === 0)}
          >
            すべて
          </button>
          {EXPANSIONS.map((e) => (
            <button
              key={e.key}
              onClick={() =>
                setExpFilters((prev) =>
                  prev.includes(e.key)
                    ? prev.filter((k) => k !== e.key)
                    : [...prev, e.key]
                )
              }
              className={chipClass(expFilters.includes(e.key))}
            >
              {e.label}
            </button>
          ))}
        </div>
        {/* 状態フィルタ (常時 / 開催中) と種別フィルタ */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] text-moonlight-faint">状態</span>
          {(
            [
              ["all", "すべて"],
              ["active", "出現中"],
              ["timed", "時限のみ"],
              ["always", "常時"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setAvailFilter(key)}
              className={chipClass(availFilter === key)}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-abyss-600" />
          <span className="mr-1 text-[11px] text-moonlight-faint">種別</span>
          {(
            [
              ["all", "すべて"],
              ["nushi", "ヌシのみ"],
              ["oonushi", "オオヌシ"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={chipClass(typeFilter === key)}
            >
              {label}
            </button>
          ))}
        </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-abyss-700 bg-abyss-900/70 shadow-deep">
        <div className="hidden grid-cols-[auto_auto_auto_minmax(140px,1.2fr)_minmax(140px,1fr)_minmax(150px,1fr)_minmax(120px,0.9fr)] gap-x-3 border-b border-abyss-700 bg-abyss-800 px-4 py-2 text-[11px] uppercase tracking-wider text-moonlight-dim sm:grid">
          <div className="w-5"></div>
          <div className="w-4">済</div>
          <div className="w-9"></div>
          <div>ヌシ</div>
          <div>釣り場</div>
          <div>条件 (ET / 天候)</div>
          <div className="text-right">次の窓</div>
        </div>
        {visible.map((r) => (
          <div key={`${r.nushi.name}-${r.nushi.spotId}`} id={`nushi-${r.nushi.id}`}>
            <NushiRow
              nushi={r.nushi}
              window={r.window}
              nowMs={nowMs}
              weatherTypes={weatherTypes}
              isCaught={r.nushi.id !== null && caught.has(r.nushi.id)}
              onToggleCaught={() =>
                r.nushi.id !== null && toggleCaughtSafe(r.nushi.id)
              }
              caught={caught}
              prep={prep}
              onTogglePrep={togglePrep}
              onToggleCaughtId={toggleCaughtSafe}
              onJumpTo={jumpTo}
              isPinned={r.nushi.id !== null && pinned.has(r.nushi.id)}
              onTogglePin={() => r.nushi.id !== null && togglePin(r.nushi.id)}
              expanded={expandedId === r.nushi.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === r.nushi.id ? null : r.nushi.id)
              }
            />
          </div>
        ))}
        {visible.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-moonlight-faint">
            条件に一致するヌシがいません
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-moonlight-faint">
        魚名をタップで釣り方・釣り場の詳細を表示 ・ 📌で上部に固定 ・ 🔔で
        ピン留めした魚を約10分前に通知(このページを開いている間)
      </p>
      <SiteFooter />
    </main>
  );
}
