import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mundial Soccer 2026 Tracker",
    short_name: "Mundial 2026",
    description: "Portal personal del Mundial de Futbol 2026. Segueix els partits, grups i resultats en català.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
