import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { authenticatedUser, sameOrigin } from "@/lib/server/jax-auth"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 })
  if (!authenticatedUser(request)) return NextResponse.json({ error: "Faça login." }, { status: 401 })
  if (Number(request.headers.get("content-length") || 0) > 20000) return NextResponse.json({ error: "Pedido muito grande." }, { status: 413 })
  const body: unknown = await request.json().catch(() => null)
  const tool = (body as { tool?: unknown } | null)?.tool
  if (typeof tool !== "string" || tool.length > 100) return NextResponse.json({ error: "Ferramenta inválida." }, { status: 400 })
  return NextResponse.json({ requestId: randomUUID(), tool, status: "unavailable", verified: false, error: "Esta ferramenta ainda não possui integração autorizada." }, { status: 501, headers: { "Cache-Control": "no-store" } })
}
