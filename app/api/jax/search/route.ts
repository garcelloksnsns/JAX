import { NextRequest, NextResponse } from "next/server"
import { authenticatedUser } from "@/lib/server/jax-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SearchResult = { title: string; url: string; snippet: string; source: string }
const clean = (title: unknown, url: unknown, snippet: unknown): SearchResult | null => {
  if (typeof url !== "string") return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:") return null
    return { title: String(title || parsed.hostname).slice(0, 200), url: parsed.href, snippet: String(snippet || "").slice(0, 500), source: parsed.hostname }
  } catch { return null }
}

export async function GET(request: NextRequest) {
  if (!authenticatedUser(request)) return NextResponse.json({ error: "Faça login." }, { status: 401 })
  const query = request.nextUrl.searchParams.get("q")?.trim() || ""
  const news = request.nextUrl.searchParams.get("type") === "news"
  if (!query || query.length > 200) return NextResponse.json({ error: "Pesquisa inválida." }, { status: 400 })
  try {
    let results: SearchResult[] = []
    let provider = ""
    if (process.env.BRAVE_SEARCH_API_KEY) {
      provider = "Brave Search"
      const url = new URL(news ? "https://api.search.brave.com/res/v1/news/search" : "https://api.search.brave.com/res/v1/web/search")
      url.searchParams.set("q", query)
      url.searchParams.set("count", "8")
      const response = await fetch(url, { headers: { "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY, Accept: "application/json" }, signal: AbortSignal.timeout(12000), cache: "no-store" })
      if (!response.ok) throw new Error("SEARCH_FAILED")
      const data = await response.json() as { web?: { results?: { title?: string; url?: string; description?: string }[] }; results?: { title?: string; url?: string; description?: string }[] }
      results = (news ? data.results : data.web?.results || []).map((item) => clean(item.title, item.url, item.description)).filter((item): item is SearchResult => Boolean(item))
    } else if (process.env.TAVILY_API_KEY) {
      provider = "Tavily"
      const response = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, topic: news ? "news" : "general", search_depth: "basic", max_results: 8 }), signal: AbortSignal.timeout(12000), cache: "no-store" })
      if (!response.ok) throw new Error("SEARCH_FAILED")
      const data = await response.json() as { results?: { title?: string; url?: string; content?: string }[] }
      results = (data.results || []).map((item) => clean(item.title, item.url, item.content)).filter((item): item is SearchResult => Boolean(item))
    } else if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
      provider = "Google Programmable Search"
      const url = new URL("https://www.googleapis.com/customsearch/v1")
      url.searchParams.set("key", process.env.GOOGLE_SEARCH_API_KEY)
      url.searchParams.set("cx", process.env.GOOGLE_SEARCH_ENGINE_ID)
      url.searchParams.set("q", query)
      url.searchParams.set("num", "8")
      if (news) url.searchParams.set("dateRestrict", "m1")
      const response = await fetch(url, { signal: AbortSignal.timeout(12000), cache: "no-store" })
      if (!response.ok) throw new Error("SEARCH_FAILED")
      const data = await response.json() as { items?: { title?: string; link?: string; snippet?: string }[] }
      results = (data.items || []).map((item) => clean(item.title, item.link, item.snippet)).filter((item): item is SearchResult => Boolean(item))
    } else return NextResponse.json({ error: "Configure Brave Search, Tavily ou Google Programmable Search no servidor.", code: "SEARCH_NOT_CONFIGURED" }, { status: 503 })
    return NextResponse.json({ query, provider, results: results.slice(0, 8) }, { headers: { "Cache-Control": "no-store" } })
  } catch { return NextResponse.json({ error: "A busca externa falhou. Abra a pesquisa no navegador.", code: "SEARCH_FAILED" }, { status: 502 }) }
}
