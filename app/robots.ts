import type { MetadataRoute } from "next";

const SITE_URL = "https://ff14-nushi-tracker.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // バックアップは各自の記録操作用ページのため検索対象から除外
      disallow: "/backup",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
