import { NextRequest, NextResponse } from "next/server"
import { authenticatedUser } from "@/lib/server/jax-auth"
import { availableProviders } from "@/lib/server/jax-model"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  if (!authenticatedUser(request)) return NextResponse.json({ error: "Faça login." }, { status: 401 })
  return NextResponse.json({ providers: availableProviders() }, { headers: { "Cache-Control": "no-store" } })
}
