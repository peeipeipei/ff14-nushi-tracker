import type { MetadataRoute } from "next";

const SITE_URL = "https://ff14-nushi-tracker.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, freq: "hourly" },
    { path: "/guide", priority: 0.9, freq: "monthly" },
    { path: "/list", priority: 0.9, freq: "weekly" },
    { path: "/bait", priority: 0.8, freq: "weekly" },
    { path: "/achievements", priority: 0.8, freq: "weekly" },
    { path: "/spot", priority: 0.6, freq: "weekly" },
    { path: "/tech", priority: 0.5, freq: "monthly" },
    { path: "/about", priority: 0.5, freq: "monthly" },
  ];
  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
