import { NextRequest, NextResponse } from "next/server"
import { authenticatedUser, ownerConfigured } from "@/lib/server/jax-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  return NextResponse.json({ configured: ownerConfigured(), authenticated: Boolean(authenticatedUser(request)) }, { headers: { "Cache-Control": "no-store" } })
}
