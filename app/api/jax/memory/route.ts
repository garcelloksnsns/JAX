import { NextRequest, NextResponse } from "next/server"
import { authenticatedUser, sameOrigin } from "@/lib/server/jax-auth"
import { forgetPreference, listPreferences } from "@/lib/server/jax-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  const user = authenticatedUser(request)
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 })
  return NextResponse.json({ preferences: listPreferences(user) }, { headers: { "Cache-Control": "no-store" } })
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 })
  const user = authenticatedUser(request)
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 })
  const body: unknown = await request.json().catch(() => null)
  const id = (body as { id?: unknown } | null)?.id
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 })
  return NextResponse.json({ deleted: forgetPreference(user, id) }, { headers: { "Cache-Control": "no-store" } })
}
