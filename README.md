# FF14 ヌシ釣りトラッカー

エオルゼア時間と天候予測アルゴリズムから、ヌシ(伝説の魚 / `tug: legendary・heavy`)が
「次に釣れる時間帯」をリアルタイムに計算して一覧表示する Web アプリ。

## 技術構成

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- 完全クライアントサイド計算 (API 不要・静的ホスティング可)

## データ

- `extract_nushi.py` が [ff14-fish-tracker-app](https://github.com/icykoneko/ff14-fish-tracker-app) の
  `private/fishData.yaml` と生成済み `js/app/data.js` から
  `nushi_data.json` (369種) と `weather_rates.json` (ゾーン天候テーブル) を生成する。
- 日本語名・釣り場・天候名はすべて同データ由来。

```bash
# データ再生成
curl -sL -o fishData.yaml https://raw.githubusercontent.com/icykoneko/ff14-fish-tracker-app/master/private/fishData.yaml
curl -sL -o data_repo.js  https://raw.githubusercontent.com/icykoneko/ff14-fish-tracker-app/master/js/app/data.js
pip install pyyaml
python extract_nushi.py
cp nushi_data.json weather_rates.json data/
```

## 開発

```bash
npm install
npm run dev
```

## 主要ロジック

- `lib/eorzeaTime.ts` — リアル⇔エオルゼア時間変換 (ET は 3600/175 倍速)
- `lib/weather.ts` — 天候予測 (23分20秒ごとの決定論ハッシュ) と次窓探索
