import "server-only"

import { createHash, timingSafeEqual } from "node:crypto"
import type { NextRequest } from "next/server"
import { sessionUser } from "./jax-store"

export const SESSION_COOKIE = "jax_session"
export const ownerConfigured = () => Boolean(process.env.JAX_OWNER_PASSWORD && process.env.JAX_OWNER_PASSWORD.length >= 16)

export function passwordMatches(value: string): boolean {
  const password = process.env.JAX_OWNER_PASSWORD
  if (!password || password.length < 16) return false
  const actual = createHash("sha256").update(value).digest()
  const expected = createHash("sha256").update(password).digest()
  return timingSafeEqual(actual, expected)
}

export function authenticatedUser(request: NextRequest): string | null {
  if (!ownerConfigured()) return null
  return sessionUser(request.cookies.get(SESSION_COOKIE)?.value)
}

export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return !request.headers.get("sec-fetch-site") || request.headers.get("sec-fetch-site") === "same-origin"
  try { return new URL(origin).origin === request.nextUrl.origin } catch { return false }
}
