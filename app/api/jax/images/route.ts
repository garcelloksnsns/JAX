import { NextRequest, NextResponse } from "next/server"
import { authenticatedUser } from "@/lib/server/jax-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (!authenticatedUser(request)) return NextResponse.json({ error: "Faça login." }, { status: 401 })
  const query = request.nextUrl.searchParams.get("q")?.trim() || ""
  if (!query || query.length > 200) return NextResponse.json({ error: "Pesquisa inválida." }, { status: 400 })
  try {
    let raw: { title?: string; image?: string; source?: string }[] = []
    let provider = ""
    if (process.env.BRAVE_SEARCH_API_KEY) {
      provider = "Brave Search"
      const url = new URL("https://api.search.brave.com/res/v1/images/search")
      url.searchParams.set("q", query)
      url.searchParams.set("count", "8")
      const response = await fetch(url, { headers: { "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY, Accept: "application/json" }, signal: AbortSignal.timeout(12000), cache: "no-store" })
      if (!response.ok) throw new Error("IMAGE_SEARCH_FAILED")
      const data = await response.json() as { results?: { title?: string; properties?: { url?: string }; url?: string }[] }
      raw = (data.results || []).map((item) => ({ title: item.title, image: item.properties?.url, source: item.url }))
    } else if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
      provider = "Google Programmable Search"
      const url = new URL("https://www.googleapis.com/customsearch/v1")
      url.searchParams.set("key", process.env.GOOGLE_SEARCH_API_KEY)
      url.searchParams.set("cx", process.env.GOOGLE_SEARCH_ENGINE_ID)
      url.searchParams.set("q", query)
      url.searchParams.set("searchType", "image")
      url.searchParams.set("num", "8")
      const response = await fetch(url, { signal: AbortSignal.timeout(12000), cache: "no-store" })
      if (!response.ok) throw new Error("IMAGE_SEARCH_FAILED")
      const data = await response.json() as { items?: { title?: string; link?: string; image?: { contextLink?: string } }[] }
      raw = (data.items || []).map((item) => ({ title: item.title, image: item.link, source: item.image?.contextLink }))
    } else return NextResponse.json({ error: "Configure Brave Search ou Google Programmable Search para buscar imagens.", code: "IMAGES_NOT_CONFIGURED" }, { status: 503 })
    const images = raw.flatMap((item) => {
      try {
        const image = new URL(item.image || "")
        const source = new URL(item.source || "")
        if (image.protocol !== "https:" || source.protocol !== "https:") return []
        return [{ title: String(item.title || "Imagem").slice(0, 200), imageUrl: image.href, sourceUrl: source.href }]
      } catch { return [] }
    })
    return NextResponse.json({ query, provider, images }, { headers: { "Cache-Control": "no-store" } })
  } catch { return NextResponse.json({ error: "A busca de imagens falhou.", code: "IMAGES_FAILED" }, { status: 502 }) }
}
