export default function manifest() {
  return {
    name: "Villa Dumontel",
    short_name: "Villa Dumontel",
    description: "Area ospiti e gestione di Villa Dumontel, Entrèves · Courmayeur",
    start_url: "/dopo-login",
    scope: "/",
    display: "standalone",
    background_color: "#f6f3ee",
    theme_color: "#2f4739",
    lang: "it",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
