export type TaskStatus = "todo" | "in-progress" | "done";
export type Priority = "high" | "medium" | "low";

export interface Task {
  id: number;
  title: string;
  status: TaskStatus | string;
  date: string | null;
  created_at: string | null;
  owner: string | null;
  priority: Priority | string | null;
  deadline: string | null;
}

export interface Doc {
  id: number;
  title: string;
  doc_type: string;
  content: string;
  created_at: string | null;
}

export interface Blocker {
  id: number;
  title: string;
  description: string | null;
  status: "open" | "resolved" | string;
  created_at: string | null;
}

export interface Decision {
  id: number;
  title: string;
  description: string | null;
  created_at: string | null;
}

export interface Report {
  id: number;
  title: string;
  content: string;
  created_at: string | null;
}

/** A task as the AI understood it, before the user confirms it. */
export interface DraftTask {
  title: string;
  owner: string | null;
  deadline: string | null; // YYYY-MM-DD
  deadline_mentioned: string | null; // the words used in the notes, e.g. "soon"
  priority: Priority | null;
  issues: Partial<Record<"owner" | "deadline" | "priority", string>>;
  duplicate: boolean;
}

export interface DraftStatement {
  text: string;
  duplicate: boolean;
}

export interface ExtractionDraft {
  tasks: DraftTask[];
  blockers: DraftStatement[];
  decisions: DraftStatement[];
  questions: string[];
  message: string;
  complete: boolean;
}
