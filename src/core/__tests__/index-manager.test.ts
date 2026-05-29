import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  readIndex,
  writeIndex,
  addToIndex,
  removeFromIndex,
  repairIndex,
} from "../index-manager.js";

describe("index-manager", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "7even-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("readIndex returns empty object when no index exists", async () => {
    const index = await readIndex(tempDir);
    expect(index).toEqual({});
  });

  it("writeIndex + readIndex round-trip", async () => {
    const data = {
      "uuid-1": "proposed/my-obj/objective.json",
      "uuid-2": "proposed/my-obj/aspirational/my-kr/kr.json",
    };
    await writeIndex(tempDir, data);
    const result = await readIndex(tempDir);
    expect(result).toEqual(data);
  });

  it("addToIndex adds entry", async () => {
    await writeIndex(tempDir, {});
    await addToIndex(tempDir, "uuid-1", "proposed/obj/objective.json");
    const index = await readIndex(tempDir);
    expect(index["uuid-1"]).toBe("proposed/obj/objective.json");
  });

  it("removeFromIndex removes entry", async () => {
    await writeIndex(tempDir, { "uuid-1": "some/path.json" });
    await removeFromIndex(tempDir, "uuid-1");
    const index = await readIndex(tempDir);
    expect(index["uuid-1"]).toBeUndefined();
  });

  it("repairIndex finds unindexed files and removes orphans", async () => {
    // Create a JSON file not in index
    const subDir = join(tempDir, "proposed", "test-obj");
    await mkdir(subDir, { recursive: true });
    await writeFile(
      join(subDir, "objective.json"),
      JSON.stringify({ id: "real-uuid-1", status: "proposed" }),
      "utf-8"
    );

    // Create index with an orphan entry
    await writeIndex(tempDir, {
      "orphan-uuid": "nonexistent/path.json",
    });

    const result = await repairIndex(tempDir);
    expect(result.added).toContain("real-uuid-1");
    expect(result.removed).toContain("orphan-uuid");

    const index = await readIndex(tempDir);
    expect(index["real-uuid-1"]).toBeDefined();
    expect(index["orphan-uuid"]).toBeUndefined();
  });

  it("repairIndex dry-run returns diff without modifying", async () => {
    const subDir = join(tempDir, "proposed", "test-obj");
    await mkdir(subDir, { recursive: true });
    await writeFile(
      join(subDir, "objective.json"),
      JSON.stringify({ id: "new-uuid", status: "proposed" }),
      "utf-8"
    );

    await writeIndex(tempDir, { "orphan": "gone.json" });

    const result = await repairIndex(tempDir, { dryRun: true });
    expect(result.added).toContain("new-uuid");
    expect(result.removed).toContain("orphan");

    // Index should NOT have changed
    const index = await readIndex(tempDir);
    expect(index["orphan"]).toBe("gone.json");
    expect(index["new-uuid"]).toBeUndefined();
  });
});
