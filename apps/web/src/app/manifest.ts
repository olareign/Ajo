import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Àjọ",
    short_name: "Àjọ",
    description: "Save on your own, or in èsúsú groups with people you trust.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#057a3f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
