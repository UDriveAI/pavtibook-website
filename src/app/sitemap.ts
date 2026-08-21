import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://pavtibook.online";
  const routes = [
    "",
    "/features",
    "/pricing",
    "/verify",
    "/contact",
    "/download",
    "/request-demo",
    "/privacy",
    "/terms",
    "/delete-account"
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : route === "/verify" || route === "/pricing" ? 0.9 : 0.8,
  }));
}
