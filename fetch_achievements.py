# -*- coding: utf-8 -*-
"""XIVAPI v2 から漁師カテゴリ (AchievementCategory=34) のアチーブメント全件を取得し
achievements_data.json を出力する。"""
import json
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://v2.xivapi.com/api/search"
FIELDS = "Name@lang(ja),Name@lang(en),Description@lang(ja),Points,Order,Icon"

def fetch(params):
    url = BASE + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "ff14-nushi-tracker/0.1"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

def main():
    rows = []
    params = {
        "sheets": "Achievement",
        "query": "+AchievementCategory=34",
        "fields": FIELDS,
        "limit": "100",
    }
    data = fetch(params)
    while True:
        rows += data.get("results", [])
        cursor = data.get("next")
        if not cursor or not data.get("results"):
            break
        data = fetch({"cursor": cursor, "limit": "100"})

    out = []
    for r in rows:
        f = r["fields"]
        entry = {
            "id": r["row_id"],
            "nameJa": f.get("Name@lang(ja)"),
            "nameEn": f.get("Name@lang(en)"),
            "descJa": f.get("Description@lang(ja)"),
            "points": f.get("Points"),
            "order": f.get("Order"),
        }
        # 検索APIが言語フィールドを返さない行があるため個別取得で補完
        if not entry["nameJa"]:
            url = (f"https://v2.xivapi.com/api/sheet/Achievement/{entry['id']}"
                   f"?fields={urllib.parse.quote(FIELDS)}")
            req = urllib.request.Request(
                url, headers={"User-Agent": "ff14-nushi-tracker/0.1"})
            with urllib.request.urlopen(req, timeout=30) as res:
                sf = json.loads(res.read().decode("utf-8"))["fields"]
            entry.update({
                "nameJa": sf.get("Name@lang(ja)"),
                "nameEn": sf.get("Name@lang(en)"),
                "descJa": sf.get("Description@lang(ja)"),
                "points": sf.get("Points"),
                "order": sf.get("Order"),
            })
        out.append(entry)
    out.sort(key=lambda a: a["order"] or 0)
    Path("achievements_data.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("fetched:", len(out))
    for a in out[:5]:
        print(a["id"], a["nameJa"])

if __name__ == "__main__":
    main()
