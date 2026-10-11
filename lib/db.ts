import type { Collection } from "mongodb";
import { getDatabase } from "./mongo";
import type { Challenge, Submission, Team, User } from "./types";

export { CI } from "./mongo";

export interface SessionDoc {
  _id: string;
  userId: string;
  expiresAt: string;
  lastSeenAt?: string;
  closedAt?: string | null;
}

export interface SettingsDoc {
  id: string;
  startsAt?: string | null;
  visible?: boolean;
  endsAt?: string | null;
  updatedAt: string;
}

export async function usersCol(): Promise<Collection<User>> {
  return (await getDatabase()).collection<User>("users");
}

export async function challengesCol(): Promise<Collection<Challenge>> {
  return (await getDatabase()).collection<Challenge>("challenges");
}

export async function teamsCol(): Promise<Collection<Team>> {
  return (await getDatabase()).collection<Team>("teams");
}

export async function sessionsCol(): Promise<Collection<SessionDoc>> {
  return (await getDatabase()).collection<SessionDoc>("sessions");
}

export async function submissionsCol(): Promise<Collection<Submission>> {
  return (await getDatabase()).collection<Submission>("submissions");
}

export async function settingsCol(): Promise<Collection<SettingsDoc>> {
  return (await getDatabase()).collection<SettingsDoc>("settings");
}

export const NO_ID = { projection: { _id: 0 } } as const;

export function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    score: user.score,
    solvedCount: user.solved.length,
    createdAt: user.createdAt,
    lastSeenAt: user.lastSeenAt,
  };
}
