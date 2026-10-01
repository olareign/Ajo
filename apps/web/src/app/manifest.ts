import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Àjọ",
    short_name: "Àjọ",
    description: "Save on your own, or in èsúsú groups with people you trust.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6fb",
    theme_color: "#222f78",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
