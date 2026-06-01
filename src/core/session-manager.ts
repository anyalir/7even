import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import crypto from "node:crypto";
import { SessionSchema } from "./schemas/session.js";
import type { Session } from "../types/index.js";

export function getSessionsDir(sevenDir: string): string {
  return join(sevenDir, "sessions");
}

export async function createSession(
  sevenDir: string,
  type: "objective-to-kr" | "kr-to-task",
  targetId: string
): Promise<Session> {
  const sessionsDir = getSessionsDir(sevenDir);
  await mkdir(sessionsDir, { recursive: true });

  const now = new Date().toISOString();
  const raw = {
    id: crypto.randomUUID(),
    type,
    targetId,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
    proposals: [],
  };

  const session = SessionSchema.parse(raw);
  const filePath = join(sessionsDir, `${session.id}.json`);
  await writeFile(filePath, JSON.stringify(session, null, 2) + "\n", "utf-8");
  return session;
}

export async function loadSession(
  sevenDir: string,
  sessionId: string
): Promise<Session> {
  const sessionsDir = getSessionsDir(sevenDir);
  // Try exact match first
  try {
    const raw = await readFile(join(sessionsDir, `${sessionId}.json`), "utf-8");
    return SessionSchema.parse(JSON.parse(raw));
  } catch {
    // Fall through to prefix match
  }
  // Prefix match (e.g. "59350ce6" matches "59350ce6-f241-4fb4-...")
  const files = await readdir(sessionsDir);
  const match = files.find((f) => f.startsWith(sessionId) && f.endsWith(".json"));
  if (!match) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  const raw = await readFile(join(sessionsDir, match), "utf-8");
  return SessionSchema.parse(JSON.parse(raw));
}

export async function saveSession(
  sevenDir: string,
  session: Session
): Promise<void> {
  const sessionsDir = getSessionsDir(sevenDir);
  await mkdir(sessionsDir, { recursive: true });

  const updated = { ...session, updatedAt: new Date().toISOString() };
  const validated = SessionSchema.parse(updated);
  const filePath = join(sessionsDir, `${validated.id}.json`);
  await writeFile(filePath, JSON.stringify(validated, null, 2) + "\n", "utf-8");
}

export async function listSessions(
  sevenDir: string,
  status?: string
): Promise<Session[]> {
  const sessionsDir = getSessionsDir(sevenDir);
  let files: string[];
  try {
    files = await readdir(sessionsDir);
  } catch {
    return [];
  }

  const sessions: Session[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(sessionsDir, file), "utf-8");
      const session = SessionSchema.parse(JSON.parse(raw));
      if (!status || session.status === status) {
        sessions.push(session);
      }
    } catch {
      // Skip invalid session files
    }
  }
  return sessions;
}

export async function findActiveSession(
  sevenDir: string,
  targetId: string
): Promise<Session | null> {
  const sessions = await listSessions(sevenDir, "active");
  return sessions.find((s) => s.targetId === targetId) ?? null;
}
