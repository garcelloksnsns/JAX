import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-heading", display: "swap" })
const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" })

export const metadata: Metadata = {
  title: "JAX · Cognitive OS",
  description: "Seu espaço de conversa com JAX: esfera interativa, comandos por texto e voz e janelas controláveis. Ferramentas locais disponíveis mediante conexão e autorização.",
  generator: "JAX / v0",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${inter.variable} ${spaceGrotesk.variable}`}>{children}<Analytics /></body></html>
}
