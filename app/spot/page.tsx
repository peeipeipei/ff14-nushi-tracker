"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import nushiData from "@/data/nushi_data.json";
import weatherData from "@/data/weather_rates.json";
import type { Nushi, Predator, WeatherTypeInfo } from "@/lib/types";
import { iconUrl, lodestoneUrl, mapUrl, SKILL_ICONS } from "@/lib/assets";
import { nextWindow, windowStatus } from "@/lib/windowInfo";
import { useCaught } from "@/lib/useCaught";
import EorzeaClock from "@/components/EorzeaClock";

const allNushi = nushiData as unknown as Nushi[];
const weatherTypes = (weatherData as unknown as { types: Record<string, WeatherTypeInfo> })
  .types;

function weatherNames(ids: number[]): string {
  return ids.map((id) => weatherTypes[id]?.ja ?? `#${id}`).join("/");
}

function etHour(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour % 1) * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function hourRange(startHour: number, endHour: number): string {
  if (startHour === 0 && endHour === 24) return "終日";
  return `ET ${etHour(startHour)}〜${etHour(endHour)}`;
}

/** 釣り場のゲームマップ (座標を中心にズーム) */
function SpotMap({ nushi }: { nushi: Nushi }) {
  if (!nushi.mapId || !nushi.mapCoords || !nushi.mapScale) return null;
  const [x, y] = nushi.mapCoords;
  const max = 41 / (nushi.mapScale / 100) + 1;
  const fx = Math.min(1, Math.max(0, (x - 1) / (max - 1)));
  const fy = Math.min(1, Math.max(0, (y - 1) / (max - 1)));
  const Z = 3;
  const posX = Math.min(100, Math.max(0, (100 * (fx * Z - 0.5)) / (Z - 1)));
  const posY = Math.min(100, Math.max(0, (100 * (fy * Z - 0.5)) / (Z - 1)));
  const dotX = ((1 - Z) * posX) / 100 + fx * Z;
  const dotY = ((1 - Z) * posY) / 100 + fy * Z;
  return (
    <div className="relative h-56 w-56 shrink-0 overflow-hidden rounded-xl border border-abyss-600 bg-abyss-900 shadow-deep">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${mapUrl(nushi.mapId)})`,
          backgroundSize: `${Z * 100}%`,
          backgroundPosition: `${posX}% ${posY}%`,
        }}
      />
      <span
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-abyss bg-hookgold shadow-lantern"
        style={{ left: `${dotX * 100}%`, top: `${dotY * 100}%` }}
      />
      <span
        className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-hookgold/30"
        style={{ left: `${dotX * 100}%`, top: `${dotY * 100}%` }}
      />
    </div>
  );
}

function UptimeBar({ uptime }: { uptime: number | null }) {
  if (uptime === null) return <span className="text-moonlight-faint">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-abyss-700">
        <div
          className="h-full rounded-full bg-hookgold"
          style={{ width: `${Math.min(100, uptime)}%` }}
        />
      </div>
      <span className="font-mono text-xs text-moonlight tabular-nums">{uptime}%</span>
    </div>
  );
}

function SpotContent() {
  const params = useSearchParams();
  const spotId = Number(params.get("id"));
  const [nowMs, setNowMs] = useState<number | null>(null);
  const { caught, toggle } = useCaught();

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fishHere = useMemo(
    () => allNushi.filter((n) => n.spotId === spotId),
    [spotId]
  );

  // 30秒粒度で窓を計算し、残り時間が短い順に並べる
  const tick = nowMs === null ? 0 : Math.floor(nowMs / 30000) * 30000;
  const rows = useMemo(() => {
    return fishHere
      .map((n) => ({ n, win: nextWindow(n, n.territoryId, tick) }))
      .sort((a, b) => {
        const key = (w: typeof a.win) =>
          !w
            ? Number.POSITIVE_INFINITY
            : w.isAlways
              ? 3e13
              : w.isActiveNow
                ? w.endMs - tick
                : 2e13 + (w.startMs - tick);
        return key(a.win) - key(b.win);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fishHere, tick]);

  // この釣り場のオオヌシ/ヌシが必要とする予測魚 (重複排除)
  const predators = useMemo(() => {
    const map = new Map<number, Predator>();
    for (const n of fishHere) {
      for (const p of n.predators) {
        if (p.id !== null && !map.has(p.id)) map.set(p.id, p);
      }
    }
    return Array.from(map.values());
  }, [fishHere]);

  if (nowMs === null) {
    return (
      <div className="py-24 text-center text-sm text-moonlight-faint">
        釣り場を読み込んでいます…
      </div>
    );
  }

  if (fishHere.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-moonlight-dim">この釣り場のデータが見つかりません。</p>
        <Link href="/" className="mt-3 inline-block text-hookgold underline">
          トラッカーへ戻る
        </Link>
      </div>
    );
  }

  const head = fishHere[0];
  const caughtHere = fishHere.filter(
    (n) => n.id !== null && caught.has(n.id)
  ).length;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex gap-4 text-sm">
            <Link href="/" className="text-moonlight-dim underline hover:text-moonlight">
              ← トラッカー
            </Link>
            <Link href="/list" className="text-moonlight-dim underline hover:text-moonlight">
              📖 図鑑
            </Link>
          </div>
          <h1 className="font-display text-3xl font-bold text-moonlight">
            {head.spotNameJa ?? head.spotName}
          </h1>
          <p className="mt-1 text-sm text-moonlight-dim">
            {head.zoneNameJa ?? head.zoneName}
            {head.mapCoords && (
              <span className="ml-2 font-mono text-hookgold-bright">
                X:{head.mapCoords[0].toFixed(1)} Y:{head.mapCoords[1].toFixed(1)}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-moonlight-dim">
            ヌシ{fishHere.length}種 ・ 釣獲済み{" "}
            <span className="text-hookgold-bright font-bold">
              {caughtHere}/{fishHere.length}
            </span>
          </p>
        </div>
        <EorzeaClock nowMs={nowMs} />
      </header>

      <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
        <SpotMap nushi={head} />

        <div>
          <h2 className="mb-2 font-display text-lg text-moonlight">
            釣れるヌシと出現率
          </h2>
          <div className="overflow-hidden rounded-xl border border-abyss-700 bg-abyss-900/70 shadow-deep">
            {rows.map(({ n, win }) => {
              const st = windowStatus(win, nowMs);
              const isCaught = n.id !== null && caught.has(n.id);
              return (
                <div
                  key={`${n.name}-${n.spotId}`}
                  className={`flex items-center gap-3 border-b border-abyss-700/60 px-4 py-2.5 ${
                    isCaught ? "opacity-55" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isCaught}
                    onChange={() => n.id !== null && toggle(n.id)}
                    className="h-4 w-4 shrink-0 accent-hookgold"
                    aria-label={`${n.nameJa ?? n.name} 釣獲済み`}
                  />
                  {n.icon &&
                    (n.lodestoneId ? (
                      <a
                        href={lodestoneUrl(n.lodestoneId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${n.nameJa ?? n.name} をロードストーンで見る`}
                        className="shrink-0 transition-transform hover:scale-110"
                      >
                        <img
                          src={iconUrl(n.icon)}
                          alt={n.nameJa ?? n.name}
                          width={34}
                          height={34}
                          className="rounded border border-abyss-600 bg-abyss-900"
                        />
                      </a>
                    ) : (
                      <img
                        src={iconUrl(n.icon)}
                        alt={n.nameJa ?? n.name}
                        width={34}
                        height={34}
                        className="shrink-0 rounded border border-abyss-600 bg-abyss-900"
                      />
                    ))}
                  <div className="min-w-0 flex-1">
                    <div
                      className={`font-display text-sm ${
                        isCaught ? "text-moonlight-dim line-through" : "text-moonlight"
                      }`}
                    >
                      {n.nameJa ?? n.name}
                      {n.oonushi ? (
                        <span className="ml-1.5 rounded bg-hookgold px-1 text-[10px] font-bold text-abyss align-middle">
                          オオヌシ
                        </span>
                      ) : (
                        n.bigFish && (
                          <span className="ml-1.5 rounded border border-hookgold-deep px-1 text-[10px] text-hookgold align-middle">
                            ヌシ
                          </span>
                        )
                      )}
                    </div>
                    <div className="text-[11px] text-moonlight-faint">
                      {hourRange(n.startHour, n.endHour)}
                      {n.weatherSet.length > 0 && ` ・ ${weatherNames(n.weatherSet)}`}
                      {n.previousWeatherSet.length > 0 &&
                        ` (前:${weatherNames(n.previousWeatherSet)})`}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <UptimeBar uptime={n.uptime} />
                    <div className={`mt-0.5 text-xs tabular-nums ${st.className}`}>
                      {st.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {predators.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 flex items-center gap-1.5 font-display text-lg text-moonlight">
                <img
                  src={iconUrl(SKILL_ICONS.intuition.code)}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-sm"
                />
                直感に必要な魚 — 釣れる時間
              </h2>
              <p className="mb-2 text-xs text-moonlight-faint">
                オオヌシを釣るための漁師の直感に使う魚です。時間・天候条件があるものは次に釣れる時刻を表示します。
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {predators.map((p) => {
                  const c = p.conditions;
                  const restricted =
                    c &&
                    !(
                      c.startHour === 0 &&
                      c.endHour === 24 &&
                      c.weatherSet.length === 0 &&
                      c.previousWeatherSet.length === 0
                    );
                  const win = restricted ? nextWindow(c!, c!.territoryId, tick) : null;
                  const st = win && !win.isAlways ? windowStatus(win, nowMs) : null;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded-lg border border-abyss-700 bg-abyss-800/50 px-2.5 py-2"
                    >
                      {p.icon && (
                        <a
                          href={p.lodestoneId ? lodestoneUrl(p.lodestoneId) : "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={iconUrl(p.icon)}
                            alt={p.ja ?? p.en}
                            width={28}
                            height={28}
                            className="rounded border border-abyss-600 bg-abyss-900"
                          />
                        </a>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-moonlight">
                          {p.ja ?? p.en}
                          <span className="ml-1 font-mono text-xs text-hookgold-bright">
                            ×{p.count}
                          </span>
                        </div>
                        {c && (
                          <div className="text-[11px] text-moonlight-faint">
                            {hourRange(c.startHour, c.endHour)}
                            {c.weatherSet.length > 0 &&
                              ` ・ ${weatherNames(c.weatherSet)}`}
                          </div>
                        )}
                      </div>
                      {st ? (
                        <span className={`shrink-0 text-xs tabular-nums ${st.className}`}>
                          {st.label}
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-tide-active">常時</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-moonlight-faint">
        出現率は天候アルゴリズムからの推定値です ・ FINAL FANTASY XIV © SQUARE ENIX
      </footer>
    </>
  );
}

export default function SpotPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Suspense
        fallback={
          <div className="py-24 text-center text-sm text-moonlight-faint">
            読み込み中…
          </div>
        }
      >
        <SpotContent />
      </Suspense>
    </main>
  );
}
