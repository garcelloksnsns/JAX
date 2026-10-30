import { NextRequest, NextResponse } from "next/server"
import { sameOrigin, SESSION_COOKIE } from "@/lib/server/jax-auth"
import { revokeSession } from "@/lib/server/jax-store"

export const runtime = "nodejs"

export function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 })
  revokeSession(request.cookies.get(SESSION_COOKIE)?.value)
  const response = NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } })
  response.cookies.delete(SESSION_COOKIE)
  return response
}
