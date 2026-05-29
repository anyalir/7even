import { describe, it, expect, vi } from "vitest";
import { execSync } from "node:child_process";

// We test getTaskCommits by mocking execSync
vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

// Import after mock
const { getTaskCommits } = await import("../git.js");
const mockedExecSync = vi.mocked(execSync);

describe("getTaskCommits", () => {
  it("parses git log output into commit objects", () => {
    mockedExecSync.mockReturnValueOnce(
      "abc123|2026-01-15T10:00:00Z|feat: add login\ndef456|2026-01-16T11:00:00Z|fix: auth bug\n"
    );

    const commits = getTaskCommits("test-uuid-123");
    expect(commits).toHaveLength(2);
    expect(commits[0]).toEqual({
      hash: "abc123",
      date: "2026-01-15T10:00:00Z",
      message: "feat: add login",
    });
    expect(commits[1]).toEqual({
      hash: "def456",
      date: "2026-01-16T11:00:00Z",
      message: "fix: auth bug",
    });
  });

  it("returns empty array when no matches", () => {
    mockedExecSync.mockReturnValueOnce("");
    expect(getTaskCommits("no-match")).toEqual([]);
  });

  it("returns empty array on git error", () => {
    mockedExecSync.mockImplementationOnce(() => {
      throw new Error("not a git repo");
    });
    expect(getTaskCommits("bad-id")).toEqual([]);
  });
});
