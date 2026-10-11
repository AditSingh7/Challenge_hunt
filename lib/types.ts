export type Role = "admin" | "user";
export type Category = string;
export type Difficulty = "Easy" | "Medium" | "Hard";
export type Language = "java" | "c";

export const CATEGORIES: Category[] = ["Matrix", "Pyramid", "Numerical"];
export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
export const LANGUAGES: Language[] = ["java", "c"];

export const LANGUAGE_LABELS: Record<Language, string> = {
  java: "Java (OpenJDK)",
  c: "C (GCC)",
};

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: Role;
  score: number;
  solved: string[];
  createdAt: string;
  lastSeenAt: string;
  bot?: boolean;
  banned?: boolean;
  bannedAt?: string;
  tabViolations?: number;
  teamId?: string;
  patterns?: string[];
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  leaderId: string;
  memberIds: string[];
  solved: string[];
  patterns?: string[];
  score: number;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  score: number;
  solvedCount: number;
  createdAt: string;
  lastSeenAt: string;
}

export function challengeCode(number: number): string {
  return String(number).padStart(3, "0");
}

export interface Challenge {
  id: string;
  number: number;
  title: string;
  category: Category;
  difficulty: Difficulty;
  points: number;
  patternPoints?: number;
  codePoints?: number;
  desc: string;
  sampleOutput: string;
  codeTemplates: Record<Language, string>;
  createdAt: string;
}

export interface Submission {
  id: string;
  userId: string;
  username: string;
  challengeId: string;
  challengeTitle: string;
  language: Language;
  status: JudgeStatus;
  points: number;
  durationMs: number;
  createdAt: string;
}

export type JudgeStatus =
  | "passed"
  | "failed"
  | "error"
  | "timeout"
  | "runtime-unavailable";

export interface JudgeResult {
  status: JudgeStatus;
  output: string;
  expected: string;
  stderr: string;
  runtime: string;
  durationMs: number;
  message: string;
}

export interface LeaderboardRow {
  rank: number;
  teamName: string;
  teamSlug: string;
  members: string[];
  score: number;
  solves: number;
  solvedIds: string[];
  warnings: number;
  status: "Online" | "Offline";
  isSelf: boolean;
  lastSeenAt: string;
  group: string;
}

export interface EventTimerSettings {
  startsAt: string | null;
  updatedAt: string;
}
