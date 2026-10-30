import "server-only"

import { createHash, randomBytes, randomUUID } from "node:crypto"
import { chmodSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"

export type StoredMessage = { id: string; role: "user" | "assistant"; text: string; createdAt: number }
let database: DatabaseSync | undefined

function db(): DatabaseSync {
  if (database) return database
  const path = resolve(process.env.JAX_DB_PATH || "./data/jax.sqlite")
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  database = new DatabaseSync(path)
  chmodSync(path, 0o600)
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_user_time ON messages(user_id, created_at);
    CREATE TABLE IF NOT EXISTS preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, text)
    );
  `)
  return database
}

const hash = (token: string) => createHash("sha256").update(token).digest("hex")

export function createSession(): { token: string; expiresAt: number } {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
  db().prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(hash(token), "owner", expiresAt)
  return { token, expiresAt }
}

export function sessionUser(token: string | undefined): string | null {
  if (!token || token.length > 128) return null
  const row = db().prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?").get(hash(token)) as { user_id: string; expires_at: number } | undefined
  if (!row) return null
  if (row.expires_at <= Date.now()) { revokeSession(token); return null }
  return row.user_id
}

export function revokeSession(token: string | undefined): void {
  if (token) db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hash(token))
}

export function listMessages(userId: string): StoredMessage[] {
  const rows = db().prepare("SELECT id, role, text, created_at FROM messages WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 40").all(userId) as { id: string; role: StoredMessage["role"]; text: string; created_at: number }[]
  return rows.reverse().map(({ id, role, text, created_at }) => ({ id, role, text, createdAt: created_at }))
}

export function appendExchange(userId: string, userText: string, answer: string): StoredMessage[] {
  const timestamp = Date.now()
  const messages: StoredMessage[] = [
    { id: randomUUID(), role: "user", text: userText, createdAt: timestamp },
    { id: randomUUID(), role: "assistant", text: answer, createdAt: timestamp + 1 },
  ]
  db().exec("BEGIN IMMEDIATE")
  try {
    const insert = db().prepare("INSERT INTO messages (id, user_id, role, text, created_at) VALUES (?, ?, ?, ?, ?)")
    for (const message of messages) insert.run(message.id, userId, message.role, message.text, message.createdAt)
    db().exec("COMMIT")
  } catch (error) { db().exec("ROLLBACK"); throw error }
  return messages
}

export type Preference = { id: string; text: string; createdAt: number }

export function listPreferences(userId: string): Preference[] {
  const rows = db().prepare("SELECT id, text, created_at FROM preferences WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(userId) as { id: string; text: string; created_at: number }[]
  return rows.map(({ id, text, created_at }) => ({ id, text, createdAt: created_at }))
}

export function rememberPreference(userId: string, text: string): Preference | null {
  const value = text.trim().slice(0, 200)
  if (value.length < 3 || /\b(senha|token|chave de api|api key|cart[aã]o|cpf)\b/i.test(value)) return null
  const item = { id: randomUUID(), text: value, createdAt: Date.now() }
  const result = db().prepare("INSERT OR IGNORE INTO preferences (id, user_id, text, created_at) VALUES (?, ?, ?, ?)").run(item.id, userId, item.text, item.createdAt)
  return result.changes ? item : null
}

export function forgetPreference(userId: string, id: string): boolean {
  return Boolean(db().prepare("DELETE FROM preferences WHERE user_id = ? AND id = ?").run(userId, id).changes)
}
