import { STORAGE_KEYS } from "./useCaught";

/** バックアップファイルの形式 */
export interface BackupData {
  app: "ff14-taikoubou";
  version: 1;
  exportedAt: string;
  caught: number[];
  prep: number[];
  pinned: number[];
}

/** localStorage から数値 ID 配列を読む (壊れていれば空配列) */
function readIds(key: string): number[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is number => typeof x === "number");
  } catch {
    return [];
  }
}

/** 現在の localStorage からバックアップデータを組み立てる */
export function buildBackup(): BackupData {
  return {
    app: "ff14-taikoubou",
    version: 1,
    exportedAt: new Date().toISOString(),
    caught: readIds(STORAGE_KEYS.caught),
    prep: readIds(STORAGE_KEYS.prep),
    pinned: readIds(STORAGE_KEYS.pinned),
  };
}

/** JSON 文字列を検証してバックアップデータに変換 (不正なら例外) */
export function parseBackup(text: string): BackupData {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error("ファイルの中身が JSON として読み取れませんでした。");
  }
  if (typeof obj !== "object" || obj === null) {
    throw new Error("バックアップの形式が正しくありません。");
  }
  const o = obj as Record<string, unknown>;
  if (o.app !== "ff14-taikoubou") {
    throw new Error("このサイトのバックアップファイルではないようです。");
  }
  const ids = (v: unknown): number[] =>
    Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
  return {
    app: "ff14-taikoubou",
    version: 1,
    exportedAt: typeof o.exportedAt === "string" ? o.exportedAt : "",
    caught: ids(o.caught),
    prep: ids(o.prep),
    pinned: ids(o.pinned),
  };
}

/** バックアップデータを localStorage へ書き込む
 *  mode="replace": 現在の記録を破棄して置き換え
 *  mode="merge":   現在の記録に取り込む (和集合) */
export function applyBackup(data: BackupData, mode: "replace" | "merge") {
  const write = (key: string, incoming: number[]) => {
    const next =
      mode === "replace"
        ? incoming
        : Array.from(new Set([...readIds(key), ...incoming]));
    localStorage.setItem(key, JSON.stringify(next));
  };
  write(STORAGE_KEYS.caught, data.caught);
  write(STORAGE_KEYS.prep, data.prep);
  write(STORAGE_KEYS.pinned, data.pinned);
}
