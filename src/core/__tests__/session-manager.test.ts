import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createSession,
  loadSession,
  saveSession,
  listSessions,
  findActiveSession,
} from "../session-manager.js";

describe("session-manager", () => {
  let sevenDir: string;

  beforeEach(async () => {
    sevenDir = await mkdtemp(join(tmpdir(), "7even-session-test-"));
  });

  afterEach(async () => {
    await rm(sevenDir, { recursive: true, force: true });
  });

  it("createSession creates file with correct schema", async () => {
    const targetId = crypto.randomUUID();
    const session = await createSession(sevenDir, "objective-to-kr", targetId);

    expect(session.id).toBeDefined();
    expect(session.type).toBe("objective-to-kr");
    expect(session.targetId).toBe(targetId);
    expect(session.status).toBe("active");
    expect(session.proposals).toEqual([]);
    expect(session.createdAt).toBeDefined();
    expect(session.updatedAt).toBeDefined();
  });

  it("loadSession reads back created session", async () => {
    const targetId = crypto.randomUUID();
    const created = await createSession(sevenDir, "kr-to-task", targetId);
    const loaded = await loadSession(sevenDir, created.id);

    expect(loaded).toEqual(created);
  });

  it("saveSession updates session state", async () => {
    const targetId = crypto.randomUUID();
    const session = await createSession(sevenDir, "objective-to-kr", targetId);

    const proposal = {
      id: crypto.randomUUID(),
      description: "Test proposal",
      status: "proposed" as const,
      meceWarnings: [],
    };
    session.proposals.push(proposal);
    session.status = "paused";

    await saveSession(sevenDir, session);
    const loaded = await loadSession(sevenDir, session.id);

    expect(loaded.status).toBe("paused");
    expect(loaded.proposals).toHaveLength(1);
    expect(loaded.proposals[0].description).toBe("Test proposal");
    // updatedAt should be a valid datetime
    expect(loaded.updatedAt).toBeDefined();
  });

  it("listSessions returns all sessions", async () => {
    const t1 = crypto.randomUUID();
    const t2 = crypto.randomUUID();
    await createSession(sevenDir, "objective-to-kr", t1);
    await createSession(sevenDir, "kr-to-task", t2);

    const all = await listSessions(sevenDir);
    expect(all).toHaveLength(2);
  });

  it("listSessions filters by status", async () => {
    const t1 = crypto.randomUUID();
    const t2 = crypto.randomUUID();
    const s1 = await createSession(sevenDir, "objective-to-kr", t1);
    await createSession(sevenDir, "kr-to-task", t2);

    s1.status = "completed";
    await saveSession(sevenDir, s1);

    const active = await listSessions(sevenDir, "active");
    expect(active).toHaveLength(1);

    const completed = await listSessions(sevenDir, "completed");
    expect(completed).toHaveLength(1);
  });

  it("listSessions returns empty array when no sessions dir", async () => {
    const sessions = await listSessions(sevenDir);
    expect(sessions).toEqual([]);
  });

  it("findActiveSession returns active session for target", async () => {
    const targetId = crypto.randomUUID();
    const created = await createSession(sevenDir, "objective-to-kr", targetId);

    const found = await findActiveSession(sevenDir, targetId);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it("findActiveSession returns null when no active session", async () => {
    const found = await findActiveSession(sevenDir, crypto.randomUUID());
    expect(found).toBeNull();
  });

  it("findActiveSession guards concurrent sessions", async () => {
    const targetId = crypto.randomUUID();
    await createSession(sevenDir, "objective-to-kr", targetId);

    // Should find existing active session
    const existing = await findActiveSession(sevenDir, targetId);
    expect(existing).not.toBeNull();
  });
});
