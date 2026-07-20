import type { Config } from "tailwindcss";

// デザイントークン: 深海の夜 × 月光 × 釣り針の金
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        abyss: {
          DEFAULT: "#050B18", // 深海の夜(ページ背景)
          900: "#070F22",
          800: "#0A1430", // パネル
          700: "#101D42", // ボーダー・ホバー
          600: "#1A2B5C",
        },
        moonlight: {
          DEFAULT: "#C9D6EA", // 月光(基本テキスト)
          dim: "#7E8FAD",     // 補助テキスト
          faint: "#4A5876",   // 最弱テキスト・罫線
        },
        hookgold: {
          DEFAULT: "#D9A441", // 釣り針の金(アクセント)
          bright: "#F0C46B",
          deep: "#8A6420",
        },
        tide: {
          active: "#3FBF8F", // 開催中
          soon: "#D9A441",   // まもなく
          far: "#4A5876",    // まだ先
        },
      },
      fontFamily: {
        display: ['"Shippori Mincho"', '"Hiragino Mincho ProN"', '"Yu Mincho"', "serif"],
        body: ['"Hiragino Kaku Gothic ProN"', '"Yu Gothic"', "Meiryo", "system-ui", "sans-serif"],
        mono: ['"SFMono-Regular"', "Consolas", "monospace"],
      },
      boxShadow: {
        lantern: "0 0 24px rgba(217, 164, 65, 0.15)",
        deep: "0 8px 32px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
