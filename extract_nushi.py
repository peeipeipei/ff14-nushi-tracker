# -*- coding: utf-8 -*-
"""fishData.yaml からヌシ (tug: legendary / heavy) を抽出し、
data_repo.js (ff14-fish-tracker-app の生成済みデータ) で
日本語名・釣り場・天候レートを補完して nushi_data.json / weather_rates.json を出力する。
"""
import json
import re
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).parent

def load_repo_data():
    """data_repo.js -> dict。`const DATA = {...}` の JS を JSON として読む。"""
    text = (HERE / "data_repo.js").read_text(encoding="utf-8")
    text = re.sub(r"^const DATA =\s*", "", text.strip())
    text = text.rstrip(";\n ")
    # トップレベルキー (FISH: 等) だけ引用符なしなので JSON 化する
    text = re.sub(r"^(\s+)([A-Z_]+):", r'\1"\2":', text, flags=re.M)
    return json.loads(text)

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

        # 泳がせ釣りルート: repo の item id 列を優先し、日本語名に解決
        def item_name(ref):
            if isinstance(ref, int):
                it = items.get(str(ref))
                return {"ja": it["name_ja"], "en": it["name_en"].strip()} if it else {"ja": None, "en": str(ref)}
            it = items.get(str(name_to_id.get(str(ref).lower())))
            return {"ja": it["name_ja"], "en": it["name_en"].strip()} if it else {"ja": None, "en": str(ref)}

        if repo_fish and repo_fish.get("bestCatchPath"):
            bait_path = [item_name(i) for i in repo_fish["bestCatchPath"]]
        else:
            bait_path = [item_name(n) for n in (entry.get("bestCatchPath") or [])]

        # 漁師の直感対象 (先に釣る必要のある魚と匹数)
        predators = []
        if repo_fish and repo_fish.get("predators"):
            for pid, count in repo_fish["predators"]:
                predators.append({**item_name(pid), "count": count})
        elif entry.get("predators"):
            for pname, count in entry["predators"].items():
                predators.append({**item_name(pname), "count": count})

        folklore_id = repo_fish.get("folklore") if repo_fish else None
        folklore_info = data["FOLKLORE"].get(str(folklore_id)) if folklore_id else None

        # マップ座標とスケール (ミニマップ表示用)
        map_coords = spot.get("map_coords") if spot else None
        map_scale = None
        if territory_id and str(territory_id) in weather_rates:
            map_scale = weather_rates[str(territory_id)].get("map_scale")

        nushi.append({
            "id": item_id,
            "name": name_en,
            "nameJa": item["name_ja"] if item else None,
            "bigFish": bool(repo_fish and repo_fish.get("bigFish")),
            "baitPath": bait_path,
            "predators": predators,
            "folkloreNameJa": folklore_info["book_ja"] if folklore_info else None,
            "intuitionLength": repo_fish.get("intuitionLength") if repo_fish else None,
            "mapCoords": map_coords[:2] if map_coords else None,
            "mapScale": map_scale,
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
