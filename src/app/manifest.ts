import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "College Gridiron Nirvana",
    short_name: "Gridiron Nirvana",
    description: "Five seasons. Every team. Every game. A hypothetical 2027–2031 Power Four schedule scenario — not an official schedule.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f3ee",
    theme_color: "#14171a",
  };
}
