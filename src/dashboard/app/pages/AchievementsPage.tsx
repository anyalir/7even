import { useEffect, useState } from "react";
import { BadgeCard } from "../components/BadgeCard.js";
import { AchievementTimeline } from "../components/AchievementTimeline.js";

type BadgeInfo = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earned: boolean;
  earnedAt: string | null;
};

type EarnedBadge = {
  badgeId: string;
  earnedAt: string;
  context?: Record<string, unknown>;
};

type Objective = {
  id: string;
  name: string;
  status: string;
  keyResults: Array<{
    id: string;
    name: string;
    status: string;
    tasks: Array<{
      id: string;
      name: string;
      status: string;
      assignee?: { email: string; githubUsername?: string };
    }>;
  }>;
};

export function AchievementsPage() {
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [earned, setEarned] = useState<EarnedBadge[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);

  useEffect(() => {
    fetch("/api/badges")
      .then((r) => r.json())
      .then((data: { earned: EarnedBadge[]; available: BadgeInfo[] }) => {
        setBadges(data.available);
        setEarned(data.earned);
      })
      .catch(() => {});

    fetch("/api/objectives")
      .then((r) => r.json())
      .then((objs: Objective[]) => setObjectives(objs))
      .catch(() => {});
  }, []);

  const earnedBadges = badges.filter((b) => b.earned);
  const unearnedBadges = badges.filter((b) => !b.earned);
  const achievedObjectives = objectives.filter((o) => o.status === "done");

  // Group earned badges by person (from task assignees in objectives)
  const badgesByPerson = new Map<string, BadgeInfo[]>();
  for (const badge of earnedBadges) {
    // Find assignees from tasks — attribute badge to all contributors
    const assignees = new Set<string>();
    for (const obj of objectives) {
      for (const kr of obj.keyResults) {
        for (const t of kr.tasks) {
          if (t.assignee?.email) assignees.add(t.assignee.email);
        }
      }
    }
    if (assignees.size === 0) assignees.add("Team");
    for (const person of assignees) {
      const existing = badgesByPerson.get(person) ?? [];
      existing.push(badge);
      badgesByPerson.set(person, existing);
    }
  }

  // Build timeline entries
  const timelineEntries = earned.map((e) => {
    const badgeDef = badges.find((b) => b.id === e.badgeId);
    return {
      badgeIcon: badgeDef?.icon ?? "🏅",
      badgeName: badgeDef?.name ?? e.badgeId,
      earnedAt: e.earnedAt,
      context: e.context
        ? String(e.context.objectiveName ?? e.context.krName ?? "")
        : undefined,
    };
  });

  // Progress stats
  const totalObj = objectives.length;
  const doneObj = achievedObjectives.length;
  const totalKr = objectives.flatMap((o) => o.keyResults).length;
  const doneKr = objectives.flatMap((o) => o.keyResults).filter((kr) => kr.status === "done").length;

  return (
    <div>
      <h1
        style={{
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 16,
        }}
      >
        ACHIEVED OBJECTIVES
      </h1>

      {/* Progress overview */}
      <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
        <ProgressBar label="OBJECTIVES" done={doneObj} total={totalObj} color="var(--color-coral)" />
        <ProgressBar label="KEY RESULTS" done={doneKr} total={totalKr} color="var(--color-sage)" />
      </div>

      {/* Achieved objectives showcase */}
      {achievedObjectives.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="lcars-divider" style={{ color: "var(--color-coral)" }}>
            COMPLETED
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {achievedObjectives.map((obj) => (
              <div key={obj.id} className="lcars-card" style={{ minWidth: 200 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  {obj.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {obj.keyResults.length} KR{obj.keyResults.length !== 1 ? "s" : ""} completed
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-person badge showcase */}
      <div className="lcars-divider" style={{ color: "var(--color-sage)" }}>
        HALL OF FAME
      </div>
      {badgesByPerson.size === 0 ? (
        <div style={{ color: "var(--text-muted)", marginBottom: 24 }}>
          No badges earned yet.
        </div>
      ) : (
        Array.from(badgesByPerson.entries()).map(([person, personBadges]) => (
          <div key={person} style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
                color: "var(--color-amber)",
              }}
            >
              {person}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {personBadges.map((b) => (
                <BadgeCard
                  key={b.id}
                  icon={b.icon}
                  name={b.name}
                  description={b.description}
                  earned
                  earnedAt={b.earnedAt}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Unearned badges */}
      {unearnedBadges.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="lcars-divider" style={{ color: "var(--text-muted)" }}>
            AVAILABLE
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {unearnedBadges.map((b) => (
              <BadgeCard
                key={b.id}
                icon={b.icon}
                name={b.name}
                description={b.description}
                earned={false}
                earnedAt={null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Achievement timeline */}
      <div className="lcars-divider" style={{ color: "var(--color-blue)" }}>
        TIMELINE
      </div>
      <AchievementTimeline entries={timelineEntries} />
    </div>
  );
}

function ProgressBar({
  label,
  done,
  total,
  color,
}: {
  label: string;
  done: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-muted)",
          marginBottom: 4,
        }}
      >
        {label}: {done}/{total}
      </div>
      <div style={{ height: "var(--bar-width)", background: "var(--bg-surface)", width: "100%" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}
