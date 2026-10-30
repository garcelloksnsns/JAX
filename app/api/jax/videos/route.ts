import { NextRequest, NextResponse } from "next/server"
import { authenticatedUser } from "@/lib/server/jax-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (!authenticatedUser(request)) return NextResponse.json({ error: "Faça login." }, { status: 401 })
  const query = request.nextUrl.searchParams.get("q")?.trim() || ""
  if (!query || query.length > 200) return NextResponse.json({ error: "Pesquisa inválida." }, { status: 400 })
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return NextResponse.json({ error: "Configure YOUTUBE_API_KEY para pesquisar vídeos dentro do JAX.", code: "VIDEOS_NOT_CONFIGURED" }, { status: 503 })
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search")
    url.searchParams.set("key", key)
    url.searchParams.set("part", "snippet")
    url.searchParams.set("type", "video")
    url.searchParams.set("maxResults", "8")
    url.searchParams.set("q", query)
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), cache: "no-store" })
    if (!response.ok) throw new Error("VIDEOS_FAILED")
    const data = await response.json() as { items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } } }[] }
    const videos = (data.items || []).flatMap((item) => {
      const id = item.id?.videoId
      if (!id || !/^[\w-]{11}$/.test(id)) return []
      return [{ id, title: String(item.snippet?.title || "Vídeo").slice(0, 200), channel: String(item.snippet?.channelTitle || "").slice(0, 100), url: `https://www.youtube.com/watch?v=${id}`, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` }]
    })
    return NextResponse.json({ query, videos }, { headers: { "Cache-Control": "no-store" } })
  } catch { return NextResponse.json({ error: "A busca de vídeos falhou. Abra o YouTube no navegador.", code: "VIDEOS_FAILED" }, { status: 502 }) }
}
