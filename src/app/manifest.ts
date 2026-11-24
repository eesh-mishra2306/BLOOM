import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BLOOM",
    short_name: "BLOOM",
    description: "Period tracking, a companion called Mochi, and safety tools that work offline.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fff9f7",
    theme_color: "#fff9f7",
    orientation: "portrait",
    categories: ["health", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "SOS", short_name: "SOS", url: "/sos?go=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
}
