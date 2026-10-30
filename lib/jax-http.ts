import { standaloneFetch } from "./jax-standalone"

export const isStandalone = process.env.NEXT_PUBLIC_JAX_STANDALONE === "1"

export function jaxFetch(input: string, init?: RequestInit): Promise<Response> {
  return isStandalone ? standaloneFetch(input, init) : fetch(input, init)
}
