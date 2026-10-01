import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Àjọ",
    short_name: "Àjọ",
    description: "Save on your own, or in èsúsú groups with people you trust.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#038641",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
