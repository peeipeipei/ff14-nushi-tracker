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
import { formatCountdown, nextWindow, windowStatus } from "@/lib/windowInfo";
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
  checked,
  nowMs,
  onToggle,
  onJump,
}: {
  predator: Predator;
  weatherTypes: WeatherMap;
  checked: boolean;
  nowMs: number;
  onToggle: () => void;
  onJump?: () => void;
}) {
  const c = predator.conditions;
  // 時間帯/天候の制約がある予測魚は「いつ釣れるか」を計算して表示
  const restricted =
    c && !(c.startHour === 0 && c.endHour === 24 && c.weatherSet.length === 0 &&
      c.previousWeatherSet.length === 0);
  const win = restricted ? nextWindow(c!, c!.territoryId, nowMs) : null;
  const status = win && !win.isAlways ? windowStatus(win, nowMs) : null;
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-abyss-700 bg-abyss-800/50 px-2.5 py-2 ${
        checked ? "opacity-55" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 h-4 w-4 shrink-0 accent-hookgold"
        aria-label={`${predator.ja ?? predator.en} を釣った`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
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
          <div className="mt-0.5 text-[11px] text-moonlight-dim">
            {c.bait.length > 0 && (
              <span>餌 {c.bait.map((b) => b.ja ?? b.en).join("→")}・</span>
            )}
            {hourRangeText(c.startHour, c.endHour)}
            {c.weatherSet.length > 0 && (
              <span>・{weatherNames(c.weatherSet, weatherTypes)}</span>
            )}
            {c.previousWeatherSet.length > 0 && (
              <span> (前:{weatherNames(c.previousWeatherSet, weatherTypes)})</span>
            )}
          </div>
        )}
      </div>
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
  caught,
  prep,
  onTogglePrep,
  onToggleCaughtId,
  onJumpTo,
}: {
  nushi: Nushi;
  weatherTypes: WeatherMap;
  nowMs: number;
  caught: Set<number>;
  prep: Set<number>;
  onTogglePrep: (id: number) => void;
  onToggleCaughtId: (id: number) => void;
  onJumpTo?: (id: number) => void;
}) {
  return (
    <div className="grid gap-4 border-b border-abyss-700/60 bg-abyss-900/80 px-5 py-4 sm:grid-cols-[auto_1fr]">
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
                  <ItemChip item={b} />
                  {/* 先頭は餌、2番目以降は「泳がせ」で使う魚 */}
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
            <div className="grid gap-1.5 sm:grid-cols-2">
              {nushi.predators.map((p, i) => {
                const isNushiPred = p.conditions?.bigFish ?? false;
                const checked =
                  p.id !== null &&
                  (isNushiPred ? caught.has(p.id) : prep.has(p.id));
                return (
                  <PredatorItem
                    key={p.id ?? i}
                    predator={p}
                    weatherTypes={weatherTypes}
                    checked={checked}
                    nowMs={nowMs}
                    onToggle={() => {
                      if (p.id === null) return;
                      if (isNushiPred) onToggleCaughtId(p.id);
                      else onTogglePrep(p.id);
                    }}
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
          {nushi.fishEyes && (
            <span className="inline-flex items-center gap-1 text-moonlight-dim">
              <SkillIcon {...SKILL_ICONS.fishEyes} />要フィッシュアイ
            </span>
          )}
        </div>
        {nushi.folkloreNameJa && (
          <div>
            <span className="mr-2 text-xs text-moonlight-faint">伝承録</span>
            <span className="text-hookgold">{nushi.folkloreNameJa}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NushiRow({
  nushi,
  window: win,
  nowMs,
  weatherTypes,
  isCaught,
  onToggleCaught,
  caught,
  prep,
  onTogglePrep,
  onToggleCaughtId,
  onJumpTo,
  isPinned,
  onTogglePin,
  expanded,
  onToggleExpand,
}: {
  nushi: Nushi;
  window: UpcomingWindow | null;
  nowMs: number;
  weatherTypes: Record<string, WeatherTypeInfo>;
  isCaught: boolean;
  onToggleCaught: () => void;
  caught: Set<number>;
  prep: Set<number>;
  onTogglePrep: (id: number) => void;
  onToggleCaughtId: (id: number) => void;
  onJumpTo?: (id: number) => void;
  isPinned: boolean;
  onTogglePin: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const hasWeather =
    nushi.weatherSet.length > 0 || nushi.previousWeatherSet.length > 0;

  const status = windowStatus(win, nowMs);

  // 出現中の魚は「この窓が閉じた後、次にいつ出るか」を計算 (30秒粒度でメモ化)
  const activeNext = useMemo(() => {
    if (!win?.isActiveNow || win.isAlways) return null;
    return nextWindow(nushi, nushi.territoryId, win.endMs + 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win?.endMs, win?.isActiveNow, win?.isAlways, nushi.id]);

  const startDate = win && !win.isAlways ? new Date(win.startMs) : null;

  // 状態で背景を明確に分ける (出現中=緑+左バー / 待機=中間 / 常時=薄緑)
  const active = win?.isActiveNow && !win.isAlways;
  let rowBg: string;
  if (active) {
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
          expanded ? "ring-1 ring-inset ring-hookgold-deep/50" : ""
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
            {nushi.fishEyes && (
              <img
                src={iconUrl(SKILL_ICONS.fishEyes.code)}
                alt="要フィッシュアイ"
                title="フィッシュアイ必須"
                width={16}
                height={16}
                className="ml-1 inline-block align-middle"
              />
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
          </div>
        </div>

        {/* 場所 */}
        <div className="hidden text-sm sm:block">
          <SpotLink nushi={nushi} className="text-moonlight" />
          <div className="text-xs text-moonlight-faint">
            {nushi.zoneNameJa ?? nushi.zoneName ?? ""}
          </div>
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
          <div className={`text-sm tabular-nums ${status.className}`}>{status.label}</div>
          <div className="text-[11px] text-moonlight-faint tabular-nums">
            {/* 出現中は次に出る時刻。待機中で同日なら時刻のみ補足
                (日付をまたぐ場合はメインラベルが絶対日時なので補足なし) */}
            {activeNext && !activeNext.isAlways && (
              <span>次 {formatCountdown(activeNext.startMs - nowMs)}後</span>
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
          caught={caught}
          prep={prep}
          onTogglePrep={onTogglePrep}
          onToggleCaughtId={onToggleCaughtId}
          onJumpTo={onJumpTo}
        />
      )}
    </div>
  );
}
