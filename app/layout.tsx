import type React from "react"
import type { Metadata, Viewport } from "next"
import { Space_Grotesk, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import "@/styles/jax-mobile.css"

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-heading", display: "swap" })
const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" })

export const metadata: Metadata = {
  title: "JAX · Seu espaço, em qualquer tela",
  description: "Converse com JAX no Android ou no PC. Comandos por texto e voz, janelas por toque e atalhos para seus projetos. Integrações externas dependem de conexão e autorização.",
  applicationName: "JAX",
  manifest: "/manifest.webmanifest",
  generator: "JAX / v0",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#080c12",
  colorScheme: "dark",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${inter.variable} ${spaceGrotesk.variable}`}>{children}<Analytics /></body></html>
}
