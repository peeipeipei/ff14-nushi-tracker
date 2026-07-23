"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import nushiData from "@/data/nushi_data.json";
import spotFishData from "@/data/spot_fish.json";
import weatherData from "@/data/weather_rates.json";
import type {
  Nushi,
  Predator,
  SpotEntry,
  SpotFish,
  WeatherTypeInfo,
} from "@/lib/types";
import { iconUrl, lodestoneUrl, mapUrl } from "@/lib/assets";
import { nextWindow, windowStatus } from "@/lib/windowInfo";
import { useCaught } from "@/lib/useCaught";
import EorzeaClock from "@/components/EorzeaClock";
import SiteFooter from "@/components/SiteFooter";

const allNushi = nushiData as unknown as Nushi[];
const spots = spotFishData as unknown as Record<string, SpotEntry>;
const weatherTypes = (weatherData as unknown as { types: Record<string, WeatherTypeInfo> })
  .types;

/** アタリの強さ (tug) = 釣りやすさ / レア度の目安 */
const TUG: Record<string, { mark: string; cls: string; label: string }> = {
  legendary: { mark: "!!!", cls: "text-rose-400", label: "レジェンダリー級 (最も強い引き)" },
  heavy: { mark: "!!!", cls: "text-rose-400", label: "強い引き (レア)" },
  medium: { mark: "!!", cls: "text-hookgold-bright", label: "中くらいの引き" },
  light: { mark: "!", cls: "text-sky-400", label: "弱い引き (釣りやすい)" },
};

function weatherNames(ids: number[]): string {
  return ids.map((id) => weatherTypes[id]?.ja ?? `#${id}`).join("/");
}

function WeatherIcons({ ids }: { ids: number[] }) {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {ids.map((id) => {
        const w = weatherTypes[id];
        return w ? (
          <img
            key={id}
            src={iconUrl(w.icon)}
            alt={w.ja}
            title={w.ja}
            width={18}
            height={18}
          />
        ) : (
          <span key={id}>#{id}</span>
        );
      })}
    </span>
  );
}

function etHour(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour % 1) * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}
function hourRange(s: number, e: number): string {
  return s === 0 && e === 24 ? "終日" : `ET ${etHour(s)}〜${etHour(e)}`;
}

/** マップ座標が妥当な範囲 (FF14 は概ね 1〜42) か。壊れたデータを除外 */
function validCoords(c: [number, number] | null): c is [number, number] {
  return !!c && c.every((v) => v >= 0 && v <= 60);
}

/** 釣り場のゲームマップ (釣り場 + 最寄りエーテライトを表示) */
function SpotMap({ entry }: { entry: SpotEntry }) {
  if (!entry.mapId || !entry.mapScale || !validCoords(entry.mapCoords)) return null;
  const max = 41 / (entry.mapScale / 100) + 1;
  const frac = (v: number) => Math.min(1, Math.max(0, (v - 1) / (max - 1)));
  const sx = frac(entry.mapCoords[0]);
  const sy = frac(entry.mapCoords[1]);
  const aeth = entry.aetheryte;
  const ax = aeth ? frac(aeth.x) : null;
  const ay = aeth ? frac(aeth.y) : null;

  // 中心とズーム: エーテライトがあれば両方が収まるように調整
  let cx = sx;
  let cy = sy;
  let Z = 3;
  if (ax !== null && ay !== null) {
    cx = (sx + ax) / 2;
    cy = (sy + ay) / 2;
    const span = Math.max(Math.abs(sx - ax), Math.abs(sy - ay)) / 2;
    Z = Math.min(3, Math.max(1.4, 0.5 / (span + 0.09)));
  }
  const posX = Math.min(100, Math.max(0, (100 * (cx * Z - 0.5)) / (Z - 1)));
  const posY = Math.min(100, Math.max(0, (100 * (cy * Z - 0.5)) / (Z - 1)));
  const mapX = (f: number) => ((1 - Z) * posX) / 100 + f * Z;
  const mapY = (f: number) => ((1 - Z) * posY) / 100 + f * Z;
  const clamp = (v: number) => Math.min(0.97, Math.max(0.03, v));

  const spotL = mapX(sx) * 100;
  const spotT = mapY(sy) * 100;

  return (
    <div className="shrink-0">
      <div className="relative h-56 w-56 overflow-hidden rounded-xl border border-abyss-600 bg-abyss-900 shadow-deep">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${mapUrl(entry.mapId)})`,
            backgroundSize: `${Z * 100}%`,
            backgroundPosition: `${posX}% ${posY}%`,
          }}
        />
        {/* 最寄りエーテライト (水晶マーカー) */}
        {ax !== null && ay !== null && (
          <span
            title={`エーテライト: ${aeth!.nameJa}`}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-abyss bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
            style={{ left: `${clamp(mapX(ax)) * 100}%`, top: `${clamp(mapY(ay)) * 100}%` }}
          />
        )}
        {/* 釣り場 (金の丸) */}
        <span
          className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-hookgold/30"
          style={{ left: `${spotL}%`, top: `${spotT}%` }}
        />
        <span
          title={entry.spotNameJa}
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-abyss bg-hookgold shadow-lantern"
          style={{ left: `${spotL}%`, top: `${spotT}%` }}
        />
      </div>
      {/* 凡例 */}
      <div className="mt-1.5 flex items-center justify-center gap-3 text-[11px] text-moonlight-faint">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-hookgold" />
          釣り場
        </span>
        {aeth && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rotate-45 bg-sky-400" />
            {aeth.nameJa}
          </span>
        )}
      </div>
    </div>
  );
}

function FishIcon({ fish }: { fish: SpotFish }) {
  if (!fish.icon) return null;
  const img = (
    <img
      src={iconUrl(fish.icon)}
      alt={fish.nameJa ?? ""}
      width={32}
      height={32}
      className="rounded border border-abyss-600 bg-abyss-900"
    />
  );
  return fish.lodestoneId ? (
    <a
      href={lodestoneUrl(fish.lodestoneId)}
      target="_blank"
      rel="noopener noreferrer"
      title={`${fish.nameJa} をロードストーンで見る`}
      className="shrink-0 transition-transform hover:scale-110"
    >
      {img}
    </a>
  ) : (
    <span className="shrink-0">{img}</span>
  );
}

function SpotContent() {
  const params = useSearchParams();
  const spotId = params.get("id") ?? "";
  const entry = spots[spotId];
  const [nowMs, setNowMs] = useState<number | null>(null);
  const { caught, toggle } = useCaught();

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const tick = nowMs === null ? 0 : Math.floor(nowMs / 30000) * 30000;

  // 餌ごとに釣れる魚をまとめる
  const groups = useMemo(() => {
    if (!entry) return [];
    const m = new Map<string, { bait: SpotFish["bait"]; fish: SpotFish[] }>();
    for (const f of entry.fish) {
      const key = f.bait ? String(f.bait.id) : "none";
      if (!m.has(key)) m.set(key, { bait: f.bait, fish: [] });
      m.get(key)!.fish.push(f);
    }
    return Array.from(m.values());
  }, [entry]);

  // オオヌシ/ヌシが必要とする予測魚 (重複排除)
  const predators = useMemo(() => {
    if (!entry) return [];
    const nushiHere = allNushi.filter((n) => n.spotId === Number(spotId));
    const map = new Map<number, Predator>();
    for (const n of nushiHere) {
      for (const p of n.predators) {
        if (p.id !== null && !map.has(p.id)) map.set(p.id, p);
      }
    }
    return Array.from(map.values());
  }, [entry, spotId]);

  if (nowMs === null) {
    return (
      <div className="py-24 text-center text-sm text-moonlight-faint">
        釣り場を読み込んでいます…
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="py-20 text-center">
        <p className="text-moonlight-dim">この釣り場のデータが見つかりません。</p>
        <Link href="/" className="mt-3 inline-block text-hookgold underline">
          トラッカーへ戻る
        </Link>
      </div>
    );
  }

  const caughtBig = entry.fish.filter(
    (f) => f.bigFish && caught.has(f.id)
  ).length;
  const bigCount = entry.fish.filter((f) => f.bigFish).length;

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
            {entry.spotNameJa}
          </h1>
          <p className="mt-1 text-sm text-moonlight-dim">
            {entry.zoneNameJa}
            {validCoords(entry.mapCoords) && (
              <span className="ml-2 font-mono text-hookgold-bright">
                X:{entry.mapCoords[0].toFixed(1)} Y:{entry.mapCoords[1].toFixed(1)}
              </span>
            )}
          </p>
          {entry.aetheryte && (
            <p className="mt-1 text-sm text-moonlight-dim">
              <span className="mr-1 text-hookgold">✧</span>
              オススメ転移先{" "}
              <span className="font-display text-moonlight">
                {entry.aetheryte.nameJa}
              </span>
            </p>
          )}
          <p className="mt-1 text-sm text-moonlight-dim">
            釣れる魚{entry.fish.length}種
            {bigCount > 0 && (
              <>
                {" "}・ ヌシ釣獲{" "}
                <span className="text-hookgold-bright font-bold">
                  {caughtBig}/{bigCount}
                </span>
              </>
            )}
          </p>
        </div>
        <EorzeaClock nowMs={nowMs} />
      </header>

      <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
        <SpotMap entry={entry} />

        <div className="space-y-5">
          {groups.map((g, gi) => (
            <section
              key={g.bait ? g.bait.id : `none-${gi}`}
              className="overflow-hidden rounded-xl border border-abyss-700 bg-abyss-900/70 shadow-deep"
            >
              <div className="flex items-center gap-2 border-b border-abyss-700 bg-abyss-800 px-4 py-2">
                <span className="text-xs text-moonlight-faint">餌</span>
                {g.bait ? (
                  <>
                    {g.bait.lodestoneId ? (
                      <a
                        href={lodestoneUrl(g.bait.lodestoneId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-moonlight hover:text-hookgold-bright"
                      >
                        <img
                          src={iconUrl(g.bait.icon)}
                          alt={g.bait.ja ?? ""}
                          width={24}
                          height={24}
                          className="rounded border border-abyss-600"
                        />
                        <span className="font-display">{g.bait.ja}</span>
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 font-display text-moonlight">
                        <img src={iconUrl(g.bait.icon)} alt="" width={24} height={24} />
                        {g.bait.ja}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-moonlight-dim">不明</span>
                )}
                <span className="ml-auto text-xs text-moonlight-faint">
                  {g.fish.length}種
                </span>
              </div>

              {g.fish.map((f) => {
                const win = nextWindow(f, entry.territoryId, tick);
                const st = windowStatus(win, nowMs);
                const isCaught = f.bigFish && caught.has(f.id);
                const tug = TUG[f.tug];
                return (
                  <div
                    key={f.id}
                    className={`flex items-start gap-2.5 border-b border-abyss-700/50 px-3 py-2 last:border-0 sm:px-4 ${
                      win?.isActiveNow ? "bg-tide-active/[0.06]" : ""
                    } ${isCaught ? "opacity-55" : ""}`}
                  >
                    {f.bigFish ? (
                      <input
                        type="checkbox"
                        checked={isCaught}
                        onChange={() => toggle(f.id)}
                        className="mt-1 h-4 w-4 shrink-0 accent-hookgold"
                        aria-label={`${f.nameJa} 釣獲済み`}
                      />
                    ) : (
                      <span className="mt-1 w-4 shrink-0" />
                    )}
                    <div className="mt-0.5">
                      <FishIcon fish={f} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* 1行目: 魚名 + バッジ + アタリ */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`min-w-0 truncate text-sm ${
                            isCaught
                              ? "text-moonlight-dim line-through"
                              : "text-moonlight"
                          }`}
                        >
                          {f.nameJa}
                        </span>
                        {f.oonushi ? (
                          <span className="shrink-0 rounded bg-hookgold px-1 text-[10px] font-bold text-abyss">
                            オオヌシ
                          </span>
                        ) : (
                          f.bigFish && (
                            <span className="shrink-0 rounded border border-hookgold-deep px-1 text-[10px] text-hookgold">
                              ヌシ
                            </span>
                          )
                        )}
                        {tug && (
                          <span
                            className={`shrink-0 font-mono text-sm font-bold ${tug.cls}`}
                            title={`アタリ: ${tug.label}`}
                          >
                            {tug.mark}
                          </span>
                        )}
                        {f.mooch && (
                          <span className="shrink-0 text-[10px] text-moonlight-faint">
                            泳がせ
                          </span>
                        )}
                      </div>
                      {/* 2行目: 条件 + 次の出現 */}
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                        <span className="flex items-center gap-1 text-moonlight-faint">
                          {hourRange(f.startHour, f.endHour)}
                          {f.previousWeatherSet.length > 0 && (
                            <>
                              <WeatherIcons ids={f.previousWeatherSet} />
                              <span>→</span>
                            </>
                          )}
                          {f.weatherSet.length > 0 && (
                            <WeatherIcons ids={f.weatherSet} />
                          )}
                        </span>
                        <span className={`tabular-nums ${st.className}`}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}

          {predators.length > 0 && (
            <p className="text-[11px] text-moonlight-faint">
              ※ オオヌシは上記の魚で「漁師の直感」を発動させてから狙います。必要な匹数は各ヌシの詳細（トラッカー）を参照してください。
            </p>
          )}
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-moonlight-faint">
        「!」の数はアタリの強さ（釣りやすさ・レア度の目安）です。
        各魚の釣り上げ確率はゲーム内で公開されておらず、正確な数値は提供できません。
      </p>
      <SiteFooter />
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
