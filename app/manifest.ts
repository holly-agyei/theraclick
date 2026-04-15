import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Theraklick",
    short_name: "Theraklick",
    description: "Mental health support for students — counselors, peer mentors, and AI.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0F4F47",
    theme_color: "#0F4F47",
    orientation: "portrait-primary",
    categories: ["health", "education", "lifestyle"],
    icons: [
      {
        src: "/images/theraklick-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/theraklick-logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
