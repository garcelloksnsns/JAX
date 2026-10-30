import { NextRequest, NextResponse } from "next/server"
import { ownerConfigured, passwordMatches, sameOrigin, SESSION_COOKIE } from "@/lib/server/jax-auth"
import { createSession } from "@/lib/server/jax-store"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 })
  if (!ownerConfigured()) return NextResponse.json({ error: "Configure JAX_OWNER_PASSWORD no servidor." }, { status: 503 })
  if (Number(request.headers.get("content-length") || 0) > 4096) return NextResponse.json({ error: "Pedido muito grande." }, { status: 413 })
  const body: unknown = await request.json().catch(() => null)
  const password = (body as { password?: unknown } | null)?.password
  if (typeof password !== "string" || password.length > 1024 || !passwordMatches(password)) return NextResponse.json({ error: "Senha inválida." }, { status: 401 })
  const { token, expiresAt } = createSession()
  const response = NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } })
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", path: "/", expires: new Date(expiresAt) })
  return response
}
