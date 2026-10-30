import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JAX · Seu espaço", short_name: "JAX", description: "Seu workspace de conversa no Android e no PC.",
    lang: "pt-BR", start_url: "/", scope: "/", display: "standalone", orientation: "any",
    background_color: "#080c12", theme_color: "#080c12",
    icons: [{ src: "/jax-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }, { src: "/jax-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/jax-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
  }
}
