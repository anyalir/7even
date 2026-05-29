export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: "milestone" | "streak" | "quality" | "custom";
  check: (state: ProjectState) => boolean;
}

export interface ProjectState {
  objectives: Array<{
    id: string;
    status: string;
    name: string;
  }>;
  keyResults: Array<{
    id: string;
    status: string;
    parentId: string;
    name: string;
  }>;
  tasks: Array<{
    id: string;
    status: string;
    parentId: string;
    name: string;
    assignee?: { email: string; githubUsername?: string };
    estimationHistory: Array<{
      date: string;
      spRemaining: number;
      estimator: string;
    }>;
  }>;
}

export interface EarnedBadge {
  badgeId: string;
  earnedAt: string; // ISO date
  context?: Record<string, unknown>; // which O/KR triggered it
}
