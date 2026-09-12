import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eagle Trade Partner Program",
    short_name: "Eagle TPP",
    description: "Trade capacity scheduling for Eagle Builders trade partners.",
    start_url: "/schedule",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#353432",
    icons: [
      {
        src: "/eagle-tpp-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/eagle-tpp-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/eagle-tpp-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}