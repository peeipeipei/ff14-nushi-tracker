# -*- coding: utf-8 -*-
"""XIVAPI から全ヌシのアイテム説明文を取得し、「オオヌシ」記載の有無で分類して
oonushi_ids.json を出力する。説明文の「ヌシ」記載と bigFish フラグの整合も確認する。"""
import json
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
BATCH = 80

def fetch_rows(ids):
    url = ("https://v2.xivapi.com/api/sheet/Item?rows=" + ",".join(map(str, ids))
           + "&fields=" + urllib.parse.quote("Name@lang(ja),Description@lang(ja)"))
    req = urllib.request.Request(url, headers={"User-Agent": "ff14-nushi-tracker/0.1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))["rows"]

def main():
    nushi = json.loads((HERE / "nushi_data.json").read_text(encoding="utf-8"))
    ids = [f["id"] for f in nushi if f["id"]]
    descs = {}
    for i in range(0, len(ids), BATCH):
        for r in fetch_rows(ids[i:i + BATCH]):
            descs[r["row_id"]] = r["fields"].get("Description@lang(ja)") or ""

    oonushi = sorted(i for i, d in descs.items() if "オオヌシ" in d)
    nushi_marked = sorted(i for i, d in descs.items() if "ヌシ" in d)

    (HERE / "oonushi_ids.json").write_text(
        json.dumps(oonushi, ensure_ascii=False), encoding="utf-8")

    big = {f["id"] for f in nushi if f["bigFish"]}
    print(f"descriptions fetched: {len(descs)}")
    print(f"oonushi (desc): {len(oonushi)}")
    print(f"desc has ヌシ: {len(nushi_marked)}  / bigFish flag: {len(big)}")
    only_desc = set(nushi_marked) - big
    only_flag = big - set(nushi_marked)
    print(f"desc-only: {len(only_desc)} {sorted(only_desc)[:10]}")
    print(f"flag-only: {len(only_flag)} {sorted(only_flag)[:10]}")

if __name__ == "__main__":
    main()
