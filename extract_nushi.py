# -*- coding: utf-8 -*-
"""fishData.yaml からヌシ (tug: legendary / heavy) を抽出し、
data_repo.js (ff14-fish-tracker-app の生成済みデータ) で
日本語名・釣り場・天候レートを補完して nushi_data.json / weather_rates.json を出力する。
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

import yaml

HERE = Path(__file__).parent

def load_lodestone_ids():
    """Asvel/ffxiv-lodestone-item-id: 行番号(1始まり) = アイテムID"""
    path = HERE / "lodestone_item_id.txt"
    if not path.exists():
        return {}
    lines = path.read_text(encoding="utf-8").splitlines()
    return {i + 1: v for i, v in enumerate(lines) if v}

def load_map_ids(map_row_ids):
    """XIVAPI Map シートから map row id -> Id 文字列 ("s1t1/01" 等)。結果はキャッシュ。"""
    cache_path = HERE / "map_ids.json"
    cache = {}
    if cache_path.exists():
        cache = json.loads(cache_path.read_text(encoding="utf-8"))
    missing = [m for m in map_row_ids if str(m) not in cache]
    for m in missing:
        url = f"https://v2.xivapi.com/api/sheet/Map/{m}?fields=Id"
        req = urllib.request.Request(url, headers={"User-Agent": "ff14-nushi-tracker/0.1"})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                cache[str(m)] = json.loads(r.read().decode("utf-8"))["fields"]["Id"]
        except Exception as e:  # 取得失敗はマップ表示なしで続行
            print(f"  warn: Map {m} fetch failed: {e}")
    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    return {int(k): v for k, v in cache.items()}

def load_repo_data():
    """data_repo.js -> dict。`const DATA = {...}` の JS を JSON として読む。"""
    text = (HERE / "data_repo.js").read_text(encoding="utf-8")
    text = re.sub(r"^const DATA =\s*", "", text.strip())
    text = text.rstrip(";\n ")
    # トップレベルキー (FISH: 等) だけ引用符なしなので JSON 化する
    text = re.sub(r"^(\s+)([A-Z_]+):", r'\1"\2":', text, flags=re.M)
    return json.loads(text)

# --- 出現率 (uptime%) の計算: FF14 の天候アルゴリズムを移植してサンプリング ---
FORECAST_WINDOWS = 12960  # 天候窓 (ET8時間) を約300実日ぶんサンプリング

def forecast_target(unix_seconds):
    """FF14 の天候抽選値 (0-99)。lib/weather.ts と同一計算"""
    bell = unix_seconds / 175
    inc = int((bell + 8 - (bell % 8)) % 24)
    total_days = unix_seconds // 4200
    calc_base = (total_days * 100 + inc) & 0xFFFFFFFF
    step1 = ((calc_base << 11) ^ calc_base) & 0xFFFFFFFF
    step2 = ((step1 >> 8) ^ step1) & 0xFFFFFFFF
    return step2 % 100

def weather_at(rate_rows, target):
    for wid, cum in rate_rows:
        if target < cum:
            return wid
    return rate_rows[-1][0]

def build_weather_seq(rate_rows, n):
    return [weather_at(rate_rows, forecast_target(i * 1400)) for i in range(n)]

def _overlap_hours(start, end, h0):
    ranges = [(start, end)] if start < end else [(start, 24), (0, end)]
    total = 0.0
    for a, b in ranges:
        lo, hi = max(a, h0), min(b, h0 + 8)
        if lo < hi:
            total += hi - lo
    return total

def compute_uptime(start, end, wset, pwset, seq):
    """時間帯 + 天候 + 直前天候の条件を満たす実時間の割合 (%)"""
    ws, pws = set(wset), set(pwset)
    n = len(seq)
    avail = 0.0
    for i in range(n):
        if ws and seq[i] not in ws:
            continue
        if pws and (i == 0 or seq[i - 1] not in pws):
            continue
        avail += _overlap_hours(start, end, (i * 8) % 24)
    return round(avail / (n * 8) * 100, 1)

def add_uptime(nushi_list, weather_rates):
    # 天候シーケンスは territory 単位で 1 度だけ構築してキャッシュ
    seq_cache = {}
    for f in nushi_list:
        tid = f["territoryId"]
        no_time = f["startHour"] == 0 and f["endHour"] == 24
        no_weather = not f["weatherSet"] and not f["previousWeatherSet"]
        if no_time and no_weather:
            f["uptime"] = 100.0
            continue
        if no_weather:  # 時間帯のみ: 天候計算不要
            f["uptime"] = compute_uptime(
                f["startHour"], f["endHour"], [], [], [0] * FORECAST_WINDOWS)
            continue
        wr = weather_rates.get(str(tid)) if tid else None
        if not wr:
            f["uptime"] = None
            continue
        if tid not in seq_cache:
            seq_cache[tid] = build_weather_seq(wr["weather_rates"], FORECAST_WINDOWS)
        f["uptime"] = compute_uptime(
            f["startHour"], f["endHour"],
            f["weatherSet"], f["previousWeatherSet"], seq_cache[tid])


def load_aetherytes():
    """aetheryte_data.json (Teamcraft由来 + XIVAPI名) を territory 別に。"""
    from collections import defaultdict
    path = HERE / "aetheryte_data.json"
    if not path.exists():
        return {}
    by_terr = defaultdict(list)
    for a in json.loads(path.read_text(encoding="utf-8")):
        by_terr[a["territory"]].append(a)
    return by_terr

def nearest_aetheryte(by_terr, territory, coords):
    """釣り場座標に最も近いエーテライト。主要(type0)を優先、無ければ全種から。"""
    cands = by_terr.get(territory, [])
    if not cands or not coords:
        return None
    main = [a for a in cands if a["type"] == 0]
    pool = main or cands
    cx, cy = coords[0], coords[1]
    best = min(pool, key=lambda a: (a["x"] - cx) ** 2 + (a["y"] - cy) ** 2)
    return {"nameJa": best["nameJa"], "x": best["x"], "y": best["y"]}


def build_spot_fish(data, items, spots, weather_rates, zones, map_ids, lodestone_ids, oonushi_ids):
    """釣り場 (location) ごとに、そこで釣れる全魚を data.js から集める。"""
    from collections import defaultdict
    fish_db = data["FISH"]
    aeth_by_terr = load_aetherytes()

    def item_min(iid):
        # bestCatchPath[0] が [id, id] = どちらの餌でも可
        if isinstance(iid, list):
            parts = [p for p in (item_min(i) for i in iid) if p]
            if not parts:
                return None
            return {
                "ja": " / ".join(p["ja"] for p in parts),
                "id": parts[0]["id"],
                "icon": parts[0]["icon"],
                "lodestoneId": parts[0]["lodestoneId"],
            }
        it = items.get(str(iid))
        if not it:
            return None
        return {
            "ja": it["name_ja"],
            "id": iid,
            "icon": it["icon"],
            "lodestoneId": lodestone_ids.get(iid),
        }

    by_spot = defaultdict(list)
    for fid_s, f in fish_db.items():
        loc = f.get("location")
        if loc:
            by_spot[loc].append((int(fid_s), f))

    out = {}
    for sid, fishes in by_spot.items():
        spot = spots.get(str(sid))
        if not spot:
            continue
        terr = spot["territory_id"]
        wr = weather_rates.get(str(terr))
        zone_id = wr.get("zone_id") if wr else None
        zone = zones.get(str(zone_id)) if zone_id else None
        coords = spot.get("map_coords")

        fish_list = []
        for fid, f in fishes:
            it = items.get(str(fid))
            if not it:
                continue
            path = f.get("bestCatchPath") or []
            fish_list.append({
                "id": fid,
                "nameJa": it["name_ja"],
                "icon": it["icon"],
                "lodestoneId": lodestone_ids.get(fid),
                "bait": item_min(path[0]) if path else None,
                "mooch": len(path) > 1,
                "startHour": f.get("startHour", 0),
                "endHour": f.get("endHour", 24),
                "weatherSet": f.get("weatherSet") or [],
                "previousWeatherSet": f.get("previousWeatherSet") or [],
                "tug": (f.get("tug") or "").lower(),
                "bigFish": bool(f.get("bigFish")),
                "oonushi": fid in oonushi_ids,
            })
        # 大物 → tug の強い順 → 名前で安定ソート
        tug_rank = {"legendary": 0, "heavy": 1, "medium": 2, "light": 3, "": 4}
        fish_list.sort(key=lambda x: (not x["bigFish"], tug_rank.get(x["tug"], 4), x["nameJa"] or ""))

        out[str(sid)] = {
            "spotNameJa": spot["name_ja"],
            "spotNameEn": spot["name_en"].strip(),
            "zoneNameJa": zone["name_ja"] if zone else None,
            "territoryId": terr,
            "mapId": map_ids.get(wr.get("map_id")) if wr else None,
            "mapCoords": coords[:2] if coords else None,
            "mapScale": wr.get("map_scale") if wr else None,
            "aetheryte": nearest_aetheryte(aeth_by_terr, terr, coords),
            "fish": fish_list,
        }
    return out


def main():
    fish_yaml = yaml.safe_load((HERE / "fishData.yaml").read_text(encoding="utf-8"))
    data = load_repo_data()

    items = data["ITEMS"]
    fish_db = data["FISH"]
    spots = data["FISHING_SPOTS"]
    weather_rates = data["WEATHER_RATES"]
    weather_types = data["WEATHER_TYPES"]
    zones = data["ZONES"]

    # 英語名 -> item id (ITEMS は釣り餌含む全アイテム)
    # data.js 側の name_en に末尾スペースがある個体がいるため strip する
    name_to_id = {v["name_en"].strip().lower(): int(k) for k, v in items.items()}
    weather_name_to_id = {v["name_en"].lower(): int(k) for k, v in weather_types.items()}

    # ゲーム内アイテム説明文に「オオヌシ」記載がある個体 (fetch_descriptions.py で生成)
    oonushi_path = HERE / "oonushi_ids.json"
    oonushi_ids = set(json.loads(oonushi_path.read_text(encoding="utf-8"))) if oonushi_path.exists() else set()

    lodestone_ids = load_lodestone_ids()
    used_map_ids = {v["map_id"] for v in weather_rates.values() if v.get("map_id")}
    map_ids = load_map_ids(used_map_ids)

    # ゲーム内「ヌシ」(太公望アチーブ対象) の集合。tug が light/medium の例外個体
    # (ソルター、リトルペリュコス) も拾うため、tug 条件と OR で判定する
    bigfish_ids = {int(k) for k, v in fish_db.items() if v.get("bigFish")}

    nushi = []
    tug_counts = {}
    unmatched = []

    for entry in fish_yaml:
        tug = (entry.get("tug") or "").strip().lower()
        if tug:
            tug_counts[tug] = tug_counts.get(tug, 0) + 1
        entry_id = name_to_id.get(entry["name"].strip().lower())
        if tug not in ("legendary", "heavy") and entry_id not in bigfish_ids:
            continue

        name_en = entry["name"]
        item_id = name_to_id.get(name_en.lower())
        repo_fish = fish_db.get(str(item_id)) if item_id else None

        # location: 旧パッチは釣り場英語名 / 新パッチは数値ID。repo 側の spot id を優先。
        spot_id = None
        if repo_fish and repo_fish.get("location"):
            spot_id = repo_fish["location"]
        else:
            loc = entry.get("location")
            if isinstance(loc, int):
                spot_id = loc
            elif isinstance(loc, str) and loc:
                for sid, s in spots.items():
                    if s["name_en"].lower() == loc.lower():
                        spot_id = int(sid)
                        break

        spot = spots.get(str(spot_id)) if spot_id else None
        territory_id = spot["territory_id"] if spot else None
        zone_id = None
        if territory_id and str(territory_id) in weather_rates:
            zone_id = weather_rates[str(territory_id)].get("zone_id")
        zone = zones.get(str(zone_id)) if zone_id else None

        # 天候は repo 側の数値 ID を優先、無ければ yaml の英語名から解決
        def resolve_weather(key):
            if repo_fish and repo_fish.get(key) is not None:
                return repo_fish[key]
            names = entry.get(key) or []
            return [weather_name_to_id[n.lower()] for n in names if n.lower() in weather_name_to_id]

        item = items.get(str(item_id)) if item_id else None
        if not item:
            unmatched.append(name_en)

        # 時刻: yaml の "17:30" は PyYAML (YAML 1.1) が60進数として 1050 に変換して
        # しまうため、data.js 側の小数表現 (17.5) を優先。フォールバックは分→時に換算。
        def resolve_hour(key, default):
            if repo_fish and repo_fish.get(key) is not None:
                return repo_fish[key]
            v = entry.get(key, default)
            if v is None:
                return default
            if isinstance(v, int) and v > 24:  # 60進数として解釈された HH:MM
                return v / 60
            return v

        def to_item_id(ref):
            if isinstance(ref, int):
                return ref
            return name_to_id.get(str(ref).lower())

        # アイテム参照 -> {ja,en,id,icon,lodestoneId,tug} (餌・予測魚のリンク表示用)
        # tug は魚の場合のみ (泳がせ用の中間魚のアタリ強さ表示に使う)
        def item_ref(ref):
            # bestCatchPath[0] が [id, id] の場合 = どちらの餌でも可
            if isinstance(ref, list):
                parts = [item_ref(r) for r in ref]
                parts = [p for p in parts if p["ja"] or p["id"]]
                if not parts:
                    return {"ja": None, "en": str(ref), "id": None, "icon": None,
                            "lodestoneId": None, "tug": None}
                first = parts[0]
                return {
                    "ja": " / ".join(p["ja"] or p["en"] for p in parts),
                    "en": " / ".join(p["en"] for p in parts),
                    "id": first["id"],
                    "icon": first["icon"],
                    "lodestoneId": first["lodestoneId"],
                    "tug": None,
                }
            iid = to_item_id(ref)
            it = items.get(str(iid)) if iid else None
            if not it:
                return {"ja": None, "en": str(ref), "id": None, "icon": None,
                        "lodestoneId": None, "tug": None}
            pf = fish_db.get(str(iid))
            return {
                "ja": it["name_ja"],
                "en": it["name_en"].strip(),
                "id": iid,
                "icon": it["icon"],
                "lodestoneId": lodestone_ids.get(iid),
                "tug": (pf.get("tug") or "").lower() or None if pf else None,
            }

        # 予測魚など任意の魚の釣獲条件 (餌・時間帯・天候) を解決
        def fish_conditions(iid):
            pf = fish_db.get(str(iid))
            if not pf:
                return None
            pspot = spots.get(str(pf.get("location"))) if pf.get("location") else None
            pterr = pspot["territory_id"] if pspot else None
            return {
                "bait": [item_ref(b) for b in (pf.get("bestCatchPath") or [])],
                "startHour": pf.get("startHour", 0),
                "endHour": pf.get("endHour", 24),
                "weatherSet": pf.get("weatherSet") or [],
                "previousWeatherSet": pf.get("previousWeatherSet") or [],
                "spotNameJa": pspot["name_ja"] if pspot else None,
                "territoryId": pterr,
                "bigFish": bool(pf.get("bigFish")),
            }

        if repo_fish and repo_fish.get("bestCatchPath"):
            bait_path = [item_ref(i) for i in repo_fish["bestCatchPath"]]
        else:
            bait_path = [item_ref(n) for n in (entry.get("bestCatchPath") or [])]

        # 漁師の直感対象 (先に釣る必要のある魚と匹数)。予測魚自身の条件も同梱する
        predators = []
        if repo_fish and repo_fish.get("predators"):
            for pid, count in repo_fish["predators"]:
                predators.append({**item_ref(pid), "count": count,
                                  "conditions": fish_conditions(pid)})
        elif entry.get("predators"):
            for pname, count in entry["predators"].items():
                pid = to_item_id(pname)
                predators.append({**item_ref(pname), "count": count,
                                  "conditions": fish_conditions(pid) if pid else None})

        folklore_id = repo_fish.get("folklore") if repo_fish else None
        folklore_info = data["FOLKLORE"].get(str(folklore_id)) if folklore_id else None

        # マップ座標とスケール (ミニマップ表示用)、実マップ画像の Id
        map_coords = spot.get("map_coords") if spot else None
        map_scale = None
        map_asset_id = None
        if territory_id and str(territory_id) in weather_rates:
            wr = weather_rates[str(territory_id)]
            map_scale = wr.get("map_scale")
            map_asset_id = map_ids.get(wr.get("map_id"))

        nushi.append({
            "id": item_id,
            "name": name_en,
            "nameJa": item["name_ja"] if item else None,
            "bigFish": bool(repo_fish and repo_fish.get("bigFish")),
            "oonushi": item_id in oonushi_ids,
            "baitPath": bait_path,
            "predators": predators,
            "folkloreNameJa": folklore_info["book_ja"] if folklore_info else None,
            "intuitionLength": repo_fish.get("intuitionLength") if repo_fish else None,
            "mapCoords": map_coords[:2] if map_coords else None,
            "mapScale": map_scale,
            "mapId": map_asset_id,
            "icon": item["icon"] if item else None,
            "lodestoneId": lodestone_ids.get(item_id) if item_id else None,
            "spotId": spot_id,
            "spotName": spot["name_en"] if spot else (entry.get("location") if isinstance(entry.get("location"), str) else None),
            "spotNameJa": spot["name_ja"] if spot else None,
            "zoneName": zone["name_en"] if zone else None,
            "zoneNameJa": zone["name_ja"] if zone else None,
            "territoryId": territory_id,
            "startHour": resolve_hour("startHour", 0),
            "endHour": resolve_hour("endHour", 24),
            "weatherSet": resolve_weather("weatherSet"),
            "previousWeatherSet": resolve_weather("previousWeatherSet"),
            "tug": tug,
            "hookset": entry.get("hookset"),
            "folklore": bool(entry.get("folklore")),
            "fishEyes": bool(entry.get("fishEyes")),
            "intuition": bool(entry.get("predators")),
            "patch": entry.get("patch"),
        })

    add_uptime(nushi, weather_rates)

    (HERE / "nushi_data.json").write_text(
        json.dumps(nushi, ensure_ascii=False, indent=1), encoding="utf-8")

    # アプリ用: territory_id -> 累積天候レート、weather id -> 名前
    rates_out = {
        tid: {"zone_id": v.get("zone_id"), "rates": v["weather_rates"]}
        for tid, v in weather_rates.items()
    }
    types_out = {
        wid: {"en": v["name_en"], "ja": v["name_ja"], "icon": v["icon"]}
        for wid, v in weather_types.items()
    }
    (HERE / "weather_rates.json").write_text(
        json.dumps({"rates": rates_out, "types": types_out}, ensure_ascii=False), encoding="utf-8")

    # 釣り場ごとの「全魚」一覧 (ヌシ以外も含む) を出力
    spot_fish = build_spot_fish(
        data, items, spots, weather_rates, zones, map_ids, lodestone_ids, oonushi_ids)
    (HERE / "spot_fish.json").write_text(
        json.dumps(spot_fish, ensure_ascii=False), encoding="utf-8")
    total_fish = sum(len(s["fish"]) for s in spot_fish.values())
    print(f"spots: {len(spot_fish)}  fish entries: {total_fish}")

    ja_count = sum(1 for n in nushi if n["nameJa"])
    spot_count = sum(1 for n in nushi if n["territoryId"])
    print(f"tug counts: {tug_counts}")
    print(f"extracted nushi: {len(nushi)}")
    print(f"  with nameJa: {ja_count}")
    print(f"  with territory (weather-capable): {spot_count}")
    if unmatched:
        print(f"  unmatched names ({len(unmatched)}): {unmatched[:20]}")

if __name__ == "__main__":
    sys.exit(main())
