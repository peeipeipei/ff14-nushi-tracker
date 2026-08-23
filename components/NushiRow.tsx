"use client";

import type {
  ItemRef,
  Nushi,
  Predator,
  UpcomingWindow,
  WeatherTypeInfo,
} from "@/lib/types";
import { useMemo } from "react";
import Link from "next/link";
import { iconUrl, lodestoneUrl, mapUrl, SKILL_ICONS, spotUrl } from "@/lib/assets";
import {
  fishEyesEffective,
  formatCountdown,
  formatWhen,
  nextWindow,
  nextWindows,
  windowDuration,
  windowStatus,
} from "@/lib/windowInfo";
import {
  formatUptime,
  isRareChanceNow,
  rarityInfo,
  rarityStars,
} from "@/lib/rarity";
import TideGauge from "./TideGauge";

/** 天候をゲーム内アイコンで表示 */
function WeatherIcons({
  ids,
  weatherTypes,
}: {
  ids: number[];
  weatherTypes: Record<string, WeatherTypeInfo>;
}) {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {ids.map((id) => {
        const w = weatherTypes[id];
        if (!w) return <span key={id}>#{id}</span>;
        return (
          <img
            key={id}
            src={iconUrl(w.icon)}
            alt={w.ja}
            title={w.ja}
            width={20}
            height={20}
            className="inline-block"
          />
        );
      })}
    </span>
  );
}

/** 釣り場名。クリックで釣り場ページへ (行の展開はしない) */
function SpotLink({ nushi, className }: { nushi: Nushi; className?: string }) {
  const name = nushi.spotNameJa ?? nushi.spotName ?? "—";
  if (nushi.spotId === null) {
    return <span className={className}>{name}</span>;
  }
  return (
    <Link
      href={spotUrl(nushi.spotId)}
      onClick={(e) => e.stopPropagation()}
      className={`${className ?? ""} underline decoration-dotted underline-offset-2 hover:text-hookgold-bright`}
    >
      {name}
    </Link>
  );
}

type WeatherMap = Record<string, WeatherTypeInfo>;

/** フィッシングスキル/アクションのゲームアイコン */
function SkillIcon({ code, label }: { code: string; label: string }) {
  return (
    <img
      src={iconUrl(code)}
      alt={label}
      title={label}
      width={20}
      height={20}
      className="inline-block rounded-sm align-middle"
    />
  );
}

const HOOKSET_SKILL: Record<string, { code: string; label: string }> = {
  Powerful: SKILL_ICONS.powerfulHookset,
  Precision: SKILL_ICONS.precisionHookset,
};

function weatherNames(ids: number[], weatherTypes: WeatherMap): string {
  return ids.map((id) => weatherTypes[id]?.ja ?? `#${id}`).join("/");
}

/** アイテム名 (餌など)。ロードストーン ID があれば新規タブでリンク */
function ItemChip({ item, size = 24 }: { item: ItemRef; size?: number }) {
  const label = item.ja ?? item.en;
  const inner = (
    <>
      {item.icon && (
        <img
          src={iconUrl(item.icon)}
          alt=""
          width={size}
          height={size}
          className="rounded-sm border border-abyss-600 bg-abyss-900"
        />
      )}
      <span>{label}</span>
    </>
  );
  if (item.lodestoneId) {
    return (
      <a
        href={lodestoneUrl(item.lodestoneId)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title={`${label} をロードストーンで見る`}
        className="inline-flex items-center gap-1 rounded bg-abyss-800 px-1.5 py-0.5 text-moonlight transition-colors hover:bg-abyss-700 hover:text-hookgold-bright"
      >
        {inner}
      </a>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-abyss-800 px-1.5 py-0.5 text-moonlight">
      {inner}
    </span>
  );
}

function hourRangeText(startHour: number, endHour: number): string {
  if (startHour === 0 && endHour === 24) return "終日";
  return `ET ${formatEtHour(startHour)}〜${formatEtHour(endHour)}`;
}

/** 予測魚 1 種の行: チェック + アイコンリンク + 匹数 + その魚自身の条件 */
function PredatorItem({
  predator,
  weatherTypes,
  nowMs,
  onJump,
}: {
  predator: Predator;
  weatherTypes: WeatherMap;
  nowMs: number;
  onJump?: () => void;
}) {
  const c = predator.conditions;
  // 時間帯/天候の制約がある予測魚は「いつ釣れるか」を計算して表示
  const restricted =
    c && !(c.startHour === 0 && c.endHour === 24 && c.weatherSet.length === 0 &&
      c.previousWeatherSet.length === 0);
  const win = restricted ? nextWindow(c!, c!.territoryId, nowMs) : null;
  const status = win && !win.isAlways ? windowStatus(win, nowMs) : null;
  const feEffective =
    c?.fishEyesApplicable && !(c.startHour === 0 && c.endHour === 24);

  return (
    <div className="rounded-lg border border-abyss-700 bg-abyss-800/50 px-2.5 py-2">
      {/* 見出し: 魚名 ×匹数 と 出現状況 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <TugMark tug={predator.tug} />
        <ItemChip item={predator} />
        <span className="font-mono text-xs text-hookgold-bright">×{predator.count}</span>
        {status && (
          <span className={`text-[11px] tabular-nums ${status.className}`}>
            {status.label}
          </span>
        )}
        {c?.bigFish && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onJump?.();
            }}
            className="rounded border border-hookgold-deep px-1 text-[10px] text-hookgold hover:bg-abyss-700"
            title="このヌシへ移動"
          >
            ヌシ ↗
          </button>
        )}
      </div>

      {c && (
        <div className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-moonlight-dim">
          {/* 釣り方: 餌 → 泳がせ中間魚 → この魚 */}
          {c.bait.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
              <span className="mr-0.5 text-moonlight-faint">釣り方</span>
              {c.bait.map((b, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  <span className="inline-flex items-center gap-1">
                    {i === 0 && (
                      <span className="rounded bg-abyss-700 px-1 text-[10px] text-moonlight-dim">
                        餌
                      </span>
                    )}
                    {i >= 1 && b.tug && <TugMark tug={b.tug} />}
                    <ItemChip item={b} />
                    {i >= 1 && (
                      <span className="inline-flex items-center gap-0.5 text-moonlight-dim">
                        （<SkillIcon {...SKILL_ICONS.mooch} />泳がせ）
                      </span>
                    )}
                  </span>
                  <span className="text-moonlight-faint">→</span>
                </span>
              ))}
              <span className="text-moonlight">{predator.ja ?? predator.en}</span>
            </div>
          )}

          {/* アタリ・フッキング・引掛釣り・ルアー */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {predator.tug && TUG_LABEL[predator.tug] && (
              <span>
                <span className="mr-1 text-moonlight-faint">アタリ</span>
                <span className={TUG_MARK[predator.tug]?.cls}>
                  {TUG_LABEL[predator.tug]}
                </span>
              </span>
            )}
            {c.hookset && (
              <span className="inline-flex items-center gap-1">
                <span className="text-moonlight-faint">フッキング</span>
                {HOOKSET_SKILL[c.hookset] && (
                  <SkillIcon {...HOOKSET_SKILL[c.hookset]} />
                )}
                <span className="text-moonlight">
                  {HOOKSET_LABEL[c.hookset] ?? c.hookset}
                </span>
              </span>
            )}
            {c.snagging && <span className="text-moonlight">引っ掛け釣りが必要</span>}
            {c.lure && (
              <span className="text-hookgold-bright">
                ルアー {c.lure === "Ambitious" ? "アンビシャス" : "モデスト"}
              </span>
            )}
          </div>

          {/* 釣り場・時間・天候 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {c.spotNameJa && (
              <span>
                <span className="mr-1 text-moonlight-faint">釣り場</span>
                {c.spotId !== null ? (
                  <Link
                    href={spotUrl(c.spotId)}
                    onClick={(e) => e.stopPropagation()}
                    className="underline decoration-dotted underline-offset-2 hover:text-hookgold-bright"
                  >
                    {c.spotNameJa}
                  </Link>
                ) : (
                  <span className="text-moonlight">{c.spotNameJa}</span>
                )}
              </span>
            )}
            <span>
              <span className="mr-1 text-moonlight-faint">時間</span>
              {hourRangeText(c.startHour, c.endHour)}
            </span>
            {(c.weatherSet.length > 0 || c.previousWeatherSet.length > 0) && (
              <span className="inline-flex items-center gap-1">
                <span className="text-moonlight-faint">天候</span>
                {c.previousWeatherSet.length > 0 && (
                  <>
                    <WeatherIcons
                      ids={c.previousWeatherSet}
                      weatherTypes={weatherTypes}
                    />
                    <span className="text-moonlight-faint">→</span>
                  </>
                )}
                {c.weatherSet.length > 0 ? (
                  <WeatherIcons ids={c.weatherSet} weatherTypes={weatherTypes} />
                ) : (
                  <span className="text-moonlight-faint">不問</span>
                )}
              </span>
            )}
            {feEffective && (
              <span className="inline-flex items-center gap-1 text-moonlight-dim">
                <SkillIcon {...SKILL_ICONS.fishEyes} />
                フィッシュアイ有効
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatEtHour(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour % 1) * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function formatHourRange(startHour: number, endHour: number): string {
  if (startHour === 0 && endHour === 24) return "終日";
  return `ET ${formatEtHour(startHour)}〜${formatEtHour(endHour)}`;
}

const TUG_LABEL: Record<string, string> = {
  legendary: "!!!(伝説)",
  heavy: "!!!",
  medium: "!!",
  light: "!",
};

/** アタリ強さ(tug)の色分けマーク */
const TUG_MARK: Record<string, { mark: string; cls: string }> = {
  legendary: { mark: "!!!", cls: "text-rose-400" },
  heavy: { mark: "!!!", cls: "text-rose-400" },
  medium: { mark: "!!", cls: "text-hookgold-bright" },
  light: { mark: "!", cls: "text-sky-400" },
};

/** 魚のアタリ強さを色付きの「!」で表示 (泳がせ魚など) */
function TugMark({ tug }: { tug?: string | null }) {
  const t = tug ? TUG_MARK[tug] : null;
  if (!t) return null;
  return (
    <span className={`font-mono font-bold ${t.cls}`} title={`アタリ: ${TUG_LABEL[tug!] ?? tug}`}>
      {t.mark}
    </span>
  );
}

const HOOKSET_LABEL: Record<string, string> = {
  Powerful: "ストロングフッキング",
  Precision: "プレシジョンフッキング",
};

/** ゲーム内座標の最大値 (マップスケールから算出) に対する割合 (0-1) */
function coordFraction(coord: number, scale: number): number {
  const max = 41 / (scale / 100) + 1;
  return Math.min(1, Math.max(0, (coord - 1) / (max - 1)));
}

/** ゲーム内マップ画像を釣り場中心にズーム表示するミニマップ */
const MAP_ZOOM = 3;

function MiniMap({ nushi }: { nushi: Nushi }) {
  if (!nushi.mapCoords || !nushi.mapScale) return null;
  const [x, y] = nushi.mapCoords;
  const fx = coordFraction(x, nushi.mapScale);
  const fy = coordFraction(y, nushi.mapScale);

  // background-position P% で画像内の点 fx をコンテナ中央に置く:
  // (1-S)*P/100 + fx*S = 1/2  →  P = 100*(fx*S - 1/2)/(S-1)
  const posX = Math.min(100, Math.max(0, (100 * (fx * MAP_ZOOM - 0.5)) / (MAP_ZOOM - 1)));
  const posY = Math.min(100, Math.max(0, (100 * (fy * MAP_ZOOM - 0.5)) / (MAP_ZOOM - 1)));
  // 端でクランプされた場合のドットの実位置 (コンテナ内割合)
  const dotX = ((1 - MAP_ZOOM) * posX) / 100 + fx * MAP_ZOOM;
  const dotY = ((1 - MAP_ZOOM) * posY) / 100 + fy * MAP_ZOOM;

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative h-40 w-40 shrink-0 overflow-hidden rounded-lg border border-abyss-600 bg-abyss-900 shadow-deep"
        aria-label="釣り場の位置 (ゲーム内マップ)"
      >
        {nushi.mapId ? (
          <>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${mapUrl(nushi.mapId)})`,
                backgroundSize: `${MAP_ZOOM * 100}%`,
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
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-moonlight-faint">
            マップなし
          </div>
        )}
      </div>
      <div className="text-xs">
        <div className="text-moonlight">
          {nushi.zoneNameJa ?? nushi.zoneName}
        </div>
        <SpotLink nushi={nushi} className="text-moonlight-dim" />
        <div className="mt-1 font-mono text-hookgold-bright">
          X: {x.toFixed(1)} , Y: {y.toFixed(1)}
        </div>
        {nushi.aetheryte && (
          <div className="mt-1 text-moonlight-dim">
            <span className="text-hookgold">✧</span> 最寄り{" "}
            <span className="text-moonlight">{nushi.aetheryte.nameJa}</span>
          </div>
        )}
        {nushi.spotId !== null && (
          <Link
            href={spotUrl(nushi.spotId)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-block rounded border border-hookgold-deep px-1.5 py-0.5 text-[11px] text-hookgold hover:bg-abyss-700"
          >
            この釣り場のヌシ →
          </Link>
        )}
      </div>
    </div>
  );
}

function DetailPanel({
  nushi,
  weatherTypes,
  nowMs,
  onJumpTo,
  fishEyesAssisted,
}: {
  nushi: Nushi;
  weatherTypes: WeatherMap;
  nowMs: number;
  onJumpTo?: (id: number) => void;
  /** 窓をフィッシュアイ前提 (時間条件を無視) で計算するか */
  fishEyesAssisted?: boolean;
}) {
  return (
    <div className="grid gap-4 border-b border-abyss-700/60 bg-abyss-900/80 px-5 py-4 shadow-[inset_4px_0_0_#D9A441] sm:grid-cols-[auto_1fr]">
      <MiniMap nushi={nushi} />
      <div className="space-y-3 text-sm">
        {nushi.baitPath.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="mr-1 text-xs text-moonlight-faint">釣り方</span>
            {nushi.baitPath.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <span className="inline-flex items-center gap-1">
                  {i === 0 && (
                    <span className="rounded bg-abyss-700 px-1 text-[10px] text-moonlight-dim">
                      餌
                    </span>
                  )}
                  {/* 2番目以降は泳がせで使う中間魚。アタリを魚の左に表示 */}
                  {i >= 1 && b.tug && <TugMark tug={b.tug} />}
                  <ItemChip item={b} />
                  {i >= 1 && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-moonlight-dim">
                      （<SkillIcon {...SKILL_ICONS.mooch} />泳がせ）
                    </span>
                  )}
                </span>
                <span className="text-moonlight-faint">→</span>
              </span>
            ))}
            <span className="font-display text-hookgold">{nushi.nameJa}</span>
          </div>
        )}

        {nushi.predators.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs text-moonlight-faint">
              <SkillIcon {...SKILL_ICONS.intuition} />{" "}
              漁師の直感 — 先に以下を釣る
              {nushi.intuitionLength && (
                <span className="ml-1 text-moonlight-dim">
                  (発動後 {nushi.intuitionLength}秒以内に本命を釣る)
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {nushi.predators.map((p, i) => {
                const isNushiPred = p.conditions?.bigFish ?? false;
                return (
                  <PredatorItem
                    key={p.id ?? i}
                    predator={p}
                    weatherTypes={weatherTypes}
                    nowMs={nowMs}
                    onJump={
                      isNushiPred && p.id !== null
                        ? () => onJumpTo?.(p.id!)
                        : undefined
                    }
                  />
                );
              })}
            </div>
            <div className="mt-1.5 text-[11px] text-moonlight-dim">
              上記を釣ると直感が付き{" "}
              <span className="font-display text-hookgold">{nushi.nameJa}</span>{" "}
              が釣れるようになります
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <span>
            <span className="mr-2 text-xs text-moonlight-faint">アタリ</span>
            <span className="font-mono text-moonlight">{TUG_LABEL[nushi.tug] ?? nushi.tug}</span>
          </span>
          {nushi.hookset && (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-xs text-moonlight-faint">フッキング</span>
              {HOOKSET_SKILL[nushi.hookset] && (
                <SkillIcon {...HOOKSET_SKILL[nushi.hookset]} />
              )}
              <span className="text-moonlight">
                {HOOKSET_LABEL[nushi.hookset] ?? nushi.hookset}
              </span>
            </span>
          )}
          {fishEyesEffective(nushi) && (
            <span
              className="inline-flex items-center gap-1 text-moonlight-dim"
              title="時間制限があり、フィッシュアイで待ち時間を省けます"
            >
              <SkillIcon {...SKILL_ICONS.fishEyes} />フィッシュアイ有効
            </span>
          )}
          {nushi.lure && (
            <span
              className="inline-flex items-center gap-1"
              title="ルアーリングで狙います (黄金)"
            >
              <span className="text-xs text-moonlight-faint">ルアー</span>
              <span className="rounded bg-abyss-700 px-1.5 py-0.5 text-hookgold-bright">
                {nushi.lure === "Ambitious" ? "アンビシャス" : "モデスト"}
              </span>
            </span>
          )}
        </div>
        {(() => {
          const r = rarityInfo(nushi.effectiveUptime);
          if (!r) return null;
          return (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="mr-1 text-xs text-moonlight-faint">釣れる機会</span>
              <span className={`font-mono text-sm ${r.className}`}>
                {rarityStars(r.tier)}
              </span>
              {nushi.uptime !== null && (
                <span className="text-xs text-moonlight-dim">
                  出現率 {formatUptime(nushi.uptime)}
                </span>
              )}
              {nushi.gatedByIntuition && nushi.effectiveUptime !== null && (
                <span className="text-xs text-moonlight-faint">
                  ・直感の下ごしらえ込みで実質 {formatUptime(nushi.effectiveUptime)}
                </span>
              )}
            </div>
          );
        })()}

        <UpcomingWindows
          nushi={nushi}
          nowMs={nowMs}
          weatherTypes={weatherTypes}
          ignoreTime={fishEyesAssisted}
        />
      </div>
    </div>
  );
}

/** 今後の釣獲チャンスを複数件、継続時間つきで表示 */
function UpcomingWindows({
  nushi,
  nowMs,
  weatherTypes,
  ignoreTime,
}: {
  nushi: Nushi;
  nowMs: number;
  weatherTypes: WeatherMap;
  ignoreTime?: boolean;
}) {
  // 30秒粒度でメモ化 (窓探索は少し重い)
  const tick = Math.floor(nowMs / 30000);
  const wins = useMemo(
    () =>
      nextWindows(nushi, nushi.territoryId, tick * 30000, 5,
        ignoreTime ? { ignoreTime: true } : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, nushi.id, ignoreTime]
  );
  // 常時釣獲可 / 窓なしのときは出さない
  if (wins.length === 0 || wins[0].isAlways) return null;

  return (
    <div>
      <div className="mb-1 text-xs text-moonlight-faint">
        今後のチャンス
        <span className="ml-1 text-moonlight-dim">(開始時刻 ・ 開いている長さ)</span>
      </div>
      <ul className="space-y-0.5 text-xs">
        {wins.map((w, i) => {
          const dur = windowDuration(w);
          const active = w.isActiveNow;
          return (
            <li
              key={w.startMs}
              className={`flex flex-wrap items-center gap-x-2 tabular-nums ${
                active ? "text-tide-active" : "text-moonlight-dim"
              }`}
            >
              <span className="w-4 text-moonlight-faint">{i + 1}.</span>
              <span className={active ? "font-bold" : "text-moonlight"}>
                {active ? "出現中" : formatWhen(w.startMs, nowMs)}
              </span>
              {dur !== null && (
                <span className="text-moonlight-faint">
                  {active
                    ? `残り ${formatCountdown(w.endMs - nowMs)}`
                    : `${formatCountdown(dur)}間`}
                </span>
              )}
              {w.previousWeatherId !== null && (
                <span className="inline-flex items-center gap-0.5">
                  <WeatherIcons ids={[w.previousWeatherId]} weatherTypes={weatherTypes} />
                  <span className="text-moonlight-faint">→</span>
                </span>
              )}
              {w.weatherId !== null && (
                <WeatherIcons ids={[w.weatherId]} weatherTypes={weatherTypes} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function NushiRow({
  nushi,
  window: win,
  fishEyesAssisted = false,
  nowMs,
  weatherTypes,
  isCaught,
  onToggleCaught,
  onJumpTo,
  isPinned,
  onTogglePin,
  expanded,
  onToggleExpand,
}: {
  nushi: Nushi;
  window: UpcomingWindow | null;
  /** 窓がフィッシュアイ前提 (時間条件を無視) で計算されているか */
  fishEyesAssisted?: boolean;
  nowMs: number;
  weatherTypes: Record<string, WeatherTypeInfo>;
  isCaught: boolean;
  onToggleCaught: () => void;
  onJumpTo?: (id: number) => void;
  isPinned: boolean;
  onTogglePin: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const hasWeather =
    nushi.weatherSet.length > 0 || nushi.previousWeatherSet.length > 0;

  const status = windowStatus(win, nowMs);

  // 出現レア度 (uptime ベース) と「いま窓が開いているレア魚」の判定
  const rarity = rarityInfo(nushi.effectiveUptime);
  const rareChance = isRareChanceNow(nushi.effectiveUptime, win);

  // 出現中の魚は「この窓が閉じた後、次にいつ出るか」を計算 (30秒粒度でメモ化)
  const activeNext = useMemo(() => {
    if (!win?.isActiveNow || win.isAlways) return null;
    return nextWindow(
      nushi,
      nushi.territoryId,
      win.endMs + 1000,
      fishEyesAssisted ? { ignoreTime: true } : undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win?.endMs, win?.isActiveNow, win?.isAlways, nushi.id, fishEyesAssisted]);

  const startDate = win && !win.isAlways ? new Date(win.startMs) : null;

  // 選択(展開)中は金色ハイライトで最優先。それ以外は状態別
  // (出現中=緑+左バー / 待機=中間 / 常時=薄緑)
  const active = win?.isActiveNow && !win.isAlways;
  let rowBg: string;
  if (expanded) {
    rowBg =
      "bg-hookgold/[0.14] hover:bg-hookgold/[0.18] shadow-[inset_4px_0_0_#D9A441]";
  } else if (active) {
    rowBg =
      "bg-tide-active/[0.16] hover:bg-tide-active/[0.24] shadow-[inset_3px_0_0_#3FBF8F]";
  } else if (win?.isAlways) {
    rowBg = "bg-tide-active/[0.05] hover:bg-abyss-800/70";
  } else {
    rowBg = "bg-abyss-800/40 hover:bg-abyss-700/50";
  }

  return (
    <div>
      <div
        onClick={onToggleExpand}
        className={`grid cursor-pointer grid-cols-[auto_auto_auto_1fr_auto] items-center gap-x-2.5 border-b border-abyss-700/60 px-3 py-3 transition-colors sm:grid-cols-[auto_auto_auto_minmax(140px,1.2fr)_minmax(140px,1fr)_minmax(150px,1fr)_minmax(120px,0.9fr)] sm:px-4 sm:gap-x-3 ${rowBg} ${
          expanded ? "ring-1 ring-inset ring-hookgold/60" : ""
        } ${isCaught ? "opacity-60" : ""}`}
      >
        {/* ピン留め: 未ピンは白黒、ピンすると赤(通常の絵文字色)に */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          title={isPinned ? "ピン留めを外す" : "ピン留めして上部に固定"}
          aria-label={isPinned ? "ピン留めを外す" : "ピン留め"}
          className="shrink-0 text-base leading-none"
          style={
            isPinned
              ? { filter: "none", opacity: 1 }
              : { filter: "grayscale(1)", opacity: 0.55 }
          }
        >
          📌
        </button>

        {/* 釣獲チェック */}
        <label
          onClick={(e) => e.stopPropagation()}
          className="flex cursor-pointer items-center"
          title={isCaught ? "釣獲済み" : "未釣獲"}
        >
          <input
            type="checkbox"
            checked={isCaught}
            onChange={onToggleCaught}
            className="h-4 w-4 accent-hookgold"
            aria-label={`${nushi.nameJa ?? nushi.name} 釣獲済み`}
          />
        </label>

        {/* 魚アイコン (クリックでロードストーンのアイテムページへ) */}
        {nushi.icon &&
          (nushi.lodestoneId ? (
            <a
              href={lodestoneUrl(nushi.lodestoneId)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={`${nushi.nameJa ?? nushi.name} をロードストーンで見る`}
              className="block shrink-0 transition-transform hover:scale-110"
            >
              <img
                src={iconUrl(nushi.icon)}
                alt={nushi.nameJa ?? nushi.name}
                width={36}
                height={36}
                className="rounded border border-abyss-600 bg-abyss-900"
              />
            </a>
          ) : (
            <img
              src={iconUrl(nushi.icon)}
              alt={nushi.nameJa ?? nushi.name}
              width={36}
              height={36}
              className="shrink-0 rounded border border-abyss-600 bg-abyss-900"
            />
          ))}

        {/* 魚名 */}
        <div>
          <div
            className={`font-display text-base ${
              isCaught ? "text-moonlight-dim line-through" : "text-moonlight"
            }`}
          >
            {nushi.nameJa ?? nushi.name}
            {nushi.oonushi ? (
              <span className="ml-1.5 rounded bg-hookgold px-1 text-[10px] font-bold text-abyss align-middle">
                オオヌシ
              </span>
            ) : (
              nushi.bigFish && (
                <span className="ml-1.5 rounded border border-hookgold-deep px-1 text-[10px] text-hookgold align-middle">
                  ヌシ
                </span>
              )
            )}
            {nushi.predators.length > 0 && (
              <span className="ml-1 rounded border border-moonlight-faint px-1 text-[10px] text-moonlight-dim align-middle">
                直感
              </span>
            )}
            {fishEyesEffective(nushi) && (
              <img
                src={iconUrl(SKILL_ICONS.fishEyes.code)}
                alt="フィッシュアイ有効"
                title="フィッシュアイ有効 (時間制限あり・待ち時間を省ける)"
                width={16}
                height={16}
                className="ml-1 inline-block align-middle"
              />
            )}
            {rarity && rarity.tier >= 3 && (
              <span
                title={`釣れる機会 ${rarityStars(rarity.tier)}${nushi.uptime !== null ? ` ・ 出現率 ${formatUptime(nushi.uptime)}` : ""}${nushi.gatedByIntuition && nushi.effectiveUptime !== null ? ` (直感の下ごしらえ込みで実質 ${formatUptime(nushi.effectiveUptime)})` : ""}`}
                className={`ml-1.5 font-mono text-[11px] align-middle ${rarity.className}`}
              >
                {"★".repeat(rarity.tier)}
              </span>
            )}
            {rareChance && (
              <span
                title="レアな窓がいま開いています。逃すと次の機会は遠くなります"
                className="ml-1 rounded bg-rose-500/25 px-1 text-[10px] font-bold text-rose-200 align-middle"
              >
                今が好機
              </span>
            )}
          </div>
          <div className="text-xs text-moonlight-faint">
            {nushi.name} ・ Patch {nushi.patch}
          </div>
          {/* モバイルでは場所列が消えるため名前の下に出す */}
          <div className="text-xs text-moonlight-dim sm:hidden">
            <SpotLink nushi={nushi} />
            {nushi.zoneNameJa && (
              <span className="text-moonlight-faint"> ・ {nushi.zoneNameJa}</span>
            )}
            {nushi.aetheryte && (
              <span className="text-moonlight-faint">
                {" "}
                ・ <span className="text-hookgold">✧</span>
                {nushi.aetheryte.nameJa}
              </span>
            )}
          </div>
        </div>

        {/* 場所 */}
        <div className="hidden text-sm sm:block">
          <SpotLink nushi={nushi} className="text-moonlight" />
          <div className="text-xs text-moonlight-faint">
            {nushi.zoneNameJa ?? nushi.zoneName ?? ""}
          </div>
          {nushi.aetheryte && (
            <div className="text-xs text-moonlight-faint">
              <span className="text-hookgold">✧</span> {nushi.aetheryte.nameJa}
            </div>
          )}
        </div>

        {/* 条件 (時間帯 + 天候アイコン) */}
        <div className="hidden text-xs sm:block">
          <div className="text-moonlight-dim">
            {formatHourRange(nushi.startHour, nushi.endHour)}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-moonlight-dim">
            {nushi.previousWeatherSet.length > 0 && (
              <>
                <WeatherIcons
                  ids={nushi.previousWeatherSet}
                  weatherTypes={weatherTypes}
                />
                <span className="text-moonlight-faint">→</span>
              </>
            )}
            {nushi.weatherSet.length > 0 ? (
              <WeatherIcons ids={nushi.weatherSet} weatherTypes={weatherTypes} />
            ) : (
              !hasWeather && <span className="text-moonlight-faint">天候不問</span>
            )}
          </div>
        </div>

        {/* 次の窓 */}
        <div className="text-right">
          <div
            className={`flex items-center justify-end gap-1 text-sm tabular-nums ${status.className}`}
          >
            {/* フィッシュアイ前提の窓であることを明示 */}
            {fishEyesAssisted && (
              <img
                src={iconUrl(SKILL_ICONS.fishEyes.code)}
                alt=""
                width={14}
                height={14}
                title="フィッシュアイ使用前提 (時間条件を無視した判定)"
                className="shrink-0"
              />
            )}
            {status.label}
          </div>
          <div className="text-[11px] text-moonlight-faint tabular-nums">
            {/* 出現中は次に出る時刻。待機中で同日なら時刻のみ補足
                (日付をまたぐ場合はメインラベルが絶対日時なので補足なし) */}
            {activeNext && !activeNext.isAlways && (
              <span>次 {formatWhen(activeNext.startMs, nowMs)}</span>
            )}
            {startDate &&
              !win?.isActiveNow &&
              startDate.toDateString() === new Date(nowMs).toDateString() && (
                <span>
                  {String(startDate.getHours()).padStart(2, "0")}:
                  {String(startDate.getMinutes()).padStart(2, "0")}〜
                </span>
              )}
          </div>
          <div className="mt-1.5">
            <TideGauge window={win} nowMs={nowMs} />
          </div>
        </div>
      </div>
      {expanded && (
        <DetailPanel
          nushi={nushi}
          weatherTypes={weatherTypes}
          nowMs={nowMs}
          onJumpTo={onJumpTo}
          fishEyesAssisted={fishEyesAssisted}
        />
      )}
    </div>
  );
}
