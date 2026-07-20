"use client";

import type { Nushi, UpcomingWindow, WeatherTypeInfo } from "@/lib/types";
import TideGauge from "./TideGauge";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0分";
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}日${h}時間`;
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
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

function MiniMap({ nushi }: { nushi: Nushi }) {
  if (!nushi.mapCoords || !nushi.mapScale) return null;
  const [x, y] = nushi.mapCoords;
  const fx = coordFraction(x, nushi.mapScale);
  const fy = coordFraction(y, nushi.mapScale);
  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 64 64"
        className="h-16 w-16 shrink-0 rounded border border-abyss-600 bg-abyss-900"
        aria-label="釣り場のおおよその位置"
      >
        {[16, 32, 48].map((p) => (
          <g key={p} className="stroke-abyss-700" strokeWidth="1">
            <line x1={p} y1="0" x2={p} y2="64" />
            <line x1="0" y1={p} x2="64" y2={p} />
          </g>
        ))}
        <circle
          cx={4 + fx * 56}
          cy={4 + fy * 56}
          r="3.5"
          className="fill-hookgold"
        />
        <circle
          cx={4 + fx * 56}
          cy={4 + fy * 56}
          r="6"
          className="fill-none stroke-hookgold-bright/60"
          strokeWidth="1"
        />
      </svg>
      <div className="text-xs">
        <div className="text-moonlight">
          {nushi.zoneNameJa ?? nushi.zoneName}
        </div>
        <div className="text-moonlight-dim">{nushi.spotNameJa ?? nushi.spotName}</div>
        <div className="mt-1 font-mono text-hookgold-bright">
          X: {x.toFixed(1)} , Y: {y.toFixed(1)}
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ nushi }: { nushi: Nushi }) {
  return (
    <div className="grid gap-4 border-b border-abyss-700/60 bg-abyss-900/80 px-5 py-4 sm:grid-cols-[auto_1fr]">
      <MiniMap nushi={nushi} />
      <div className="space-y-2 text-sm">
        {nushi.baitPath.length > 0 && (
          <div>
            <span className="mr-2 text-xs text-moonlight-faint">釣り方</span>
            <span className="text-moonlight">
              {nushi.baitPath.map((b, i) => (
                <span key={i}>
                  {i === 0 ? (
                    <span className="rounded bg-abyss-700 px-1.5 py-0.5 text-hookgold-bright">
                      {b.ja ?? b.en}
                    </span>
                  ) : (
                    <span className="text-moonlight">{b.ja ?? b.en}</span>
                  )}
                  {i < nushi.baitPath.length - 1 && (
                    <span className="mx-1.5 text-moonlight-faint">→ 泳がせ →</span>
                  )}
                </span>
              ))}
              <span className="mx-1.5 text-moonlight-faint">→</span>
              <span className="font-display text-hookgold">{nushi.nameJa}</span>
            </span>
          </div>
        )}
        {nushi.predators.length > 0 && (
          <div>
            <span className="mr-2 text-xs text-moonlight-faint">漁師の直感</span>
            <span className="text-moonlight">
              {nushi.predators
                .map((p) => `${p.ja ?? p.en} ×${p.count}`)
                .join(" 、 ")}
              を先に釣る
              {nushi.intuitionLength && (
                <span className="ml-1 text-moonlight-dim">
                  (持続 {nushi.intuitionLength}秒)
                </span>
              )}
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <span>
            <span className="mr-2 text-xs text-moonlight-faint">アタリ</span>
            <span className="font-mono text-moonlight">{TUG_LABEL[nushi.tug] ?? nushi.tug}</span>
          </span>
          {nushi.hookset && (
            <span>
              <span className="mr-2 text-xs text-moonlight-faint">フッキング</span>
              <span className="text-moonlight">
                {HOOKSET_LABEL[nushi.hookset] ?? nushi.hookset}
              </span>
            </span>
          )}
          {nushi.fishEyes && (
            <span className="text-moonlight-dim">要フィッシュアイ</span>
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
  expanded,
  onToggleExpand,
}: {
  nushi: Nushi;
  window: UpcomingWindow | null;
  nowMs: number;
  weatherTypes: Record<string, WeatherTypeInfo>;
  isCaught: boolean;
  onToggleCaught: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const weatherLabel =
    nushi.weatherSet.length > 0
      ? nushi.weatherSet.map((id) => weatherTypes[id]?.ja ?? `#${id}`).join("/")
      : null;
  const prevWeatherLabel =
    nushi.previousWeatherSet.length > 0
      ? nushi.previousWeatherSet
          .map((id) => weatherTypes[id]?.ja ?? `#${id}`)
          .join("/")
      : null;

  let status: { label: string; className: string };
  if (!win) {
    status = { label: "窓なし(48日以内)", className: "text-moonlight-faint" };
  } else if (win.isAlways) {
    status = { label: "常時", className: "text-tide-active" };
  } else if (win.isActiveNow) {
    status = {
      label: `開催中 残り${formatCountdown(win.endMs - nowMs)}`,
      className: "text-tide-active font-bold",
    };
  } else {
    status = {
      label: `あと${formatCountdown(win.startMs - nowMs)}`,
      className:
        win.startMs - nowMs < 3600 * 1000
          ? "text-hookgold-bright font-bold"
          : "text-moonlight",
    };
  }

  const startDate = win && !win.isAlways ? new Date(win.startMs) : null;

  return (
    <div>
      <div
        onClick={onToggleExpand}
        className={`grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-x-3 border-b border-abyss-700/60 px-4 py-3 transition-colors hover:bg-abyss-800/60 sm:grid-cols-[auto_minmax(170px,1.2fr)_minmax(140px,1fr)_minmax(150px,1fr)_minmax(120px,0.9fr)] ${
          expanded ? "bg-abyss-800/50" : ""
        } ${isCaught ? "opacity-60" : ""}`}
      >
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

        {/* 魚名 */}
        <div>
          <div
            className={`font-display text-base ${
              isCaught ? "text-moonlight-dim line-through" : "text-moonlight"
            }`}
          >
            {nushi.nameJa ?? nushi.name}
            {nushi.bigFish && (
              <span className="ml-1.5 rounded border border-hookgold-deep px-1 text-[10px] text-hookgold align-middle">
                ヌシ
              </span>
            )}
            {nushi.folkloreNameJa && (
              <span className="ml-1 rounded border border-moonlight-faint px-1 text-[10px] text-moonlight-dim align-middle">
                伝承
              </span>
            )}
            {nushi.predators.length > 0 && (
              <span className="ml-1 rounded border border-moonlight-faint px-1 text-[10px] text-moonlight-dim align-middle">
                直感
              </span>
            )}
          </div>
          <div className="text-xs text-moonlight-faint">
            {nushi.name} ・ Patch {nushi.patch}
          </div>
        </div>

        {/* 場所 */}
        <div className="hidden text-sm sm:block">
          <div className="text-moonlight">{nushi.spotNameJa ?? nushi.spotName ?? "—"}</div>
          <div className="text-xs text-moonlight-faint">
            {nushi.zoneNameJa ?? nushi.zoneName ?? ""}
          </div>
        </div>

        {/* 条件 */}
        <div className="hidden text-xs sm:block">
          <div className="text-moonlight-dim">
            {formatHourRange(nushi.startHour, nushi.endHour)}
          </div>
          <div className="text-moonlight-dim">
            {prevWeatherLabel && (
              <span className="text-moonlight-faint">{prevWeatherLabel} → </span>
            )}
            {weatherLabel ?? (prevWeatherLabel ? "" : "天候不問")}
          </div>
        </div>

        {/* 次の窓 */}
        <div className="text-right">
          <div className={`text-sm tabular-nums ${status.className}`}>{status.label}</div>
          {startDate && !win?.isActiveNow && (
            <div className="text-[11px] text-moonlight-faint tabular-nums">
              {startDate.getMonth() + 1}/{startDate.getDate()}{" "}
              {String(startDate.getHours()).padStart(2, "0")}:
              {String(startDate.getMinutes()).padStart(2, "0")}〜
            </div>
          )}
          <div className="mt-1.5">
            <TideGauge window={win} nowMs={nowMs} />
          </div>
        </div>
      </div>
      {expanded && <DetailPanel nushi={nushi} />}
    </div>
  );
}
