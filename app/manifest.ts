import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FFXIV 太公望への道",
    short_name: "太公望への道",
    description:
      "FFXIV のヌシが次に釣れる時間帯を、エオルゼア時間と天候予測からリアルタイムに表示するヌシ釣り支援ツール。",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#050B18",
    theme_color: "#050B18",
    categories: ["games", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "ヌシ一覧", short_name: "一覧", url: "/" },
      { name: "餌別ヌシ一覧", short_name: "餌別", url: "/bait" },
      { name: "ヌシ釣りの始め方", short_name: "始め方", url: "/guide" },
    ],
  };
}
