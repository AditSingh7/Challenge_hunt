import { randomUUID } from "node:crypto";
import { CI, NO_ID, challengesCol, isDuplicateKey, nowISO, teamsCol, usersCol } from "./db";
import type { Team, User } from "./types";

export const MAX_TEAM_SIZE = 2;

export type TeamResult<T> = { value: T } | { error: string; status: number };

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export async function getTeamOf(user: User): Promise<Team | null> {
  if (!user.teamId) return null;
  const team = await (await teamsCol()).findOne({ id: user.teamId }, NO_ID);
  return team ?? null;
}

export async function getTeamMembers(team: Team): Promise<User[]> {
  if (!team.memberIds.length) return [];
  return (await usersCol())
    .find({ id: { $in: team.memberIds } }, { ...NO_ID, sort: { username: 1 } })
    .toArray();
}

async function pointsFor(solvedIds: string[], patternIds: string[] = []): Promise<number> {
  const solvedSet = new Set(solvedIds);
  const ids = [...new Set([...solvedIds, ...patternIds])];
  if (!ids.length) return 0;
  const docs = await (await challengesCol())
    .find({ id: { $in: ids } }, { projection: { points: 1, patternPoints: 1 } })
    .toArray();
  return docs.reduce(
    (sum, challenge) => sum + (solvedSet.has(challenge.id) ? challenge.points : (challenge.patternPoints ?? 0)),
    0
  );
}

export async function createTeam(
  user: User,
  rawName: string,
  rawSlug?: string
): Promise<TeamResult<Team>> {
  if (user.teamId) return { error: "You are already registered in a team.", status: 409 };

  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 3 || name.length > 32) {
    return { error: "Team name must be 3-32 characters.", status: 400 };
  }

  const slug = (rawSlug ?? "").trim() ? rawSlug!.trim().toLowerCase() : slugify(name);
  if (!/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/.test(slug)) {
    return {
      error: "Slug must be 3-32 characters using lowercase letters, numbers or hyphens.",
      status: 400,
    };
  }

  const team: Team = {
    id: `t-${randomUUID()}`,
    name,
    slug,
    leaderId: user.id,
    memberIds: [user.id],
    solved: [...new Set(user.solved)],
    patterns: [...new Set(user.patterns ?? [])],
    score: 0,
    createdAt: nowISO(),
  };
  team.score = await pointsFor(team.solved, team.patterns);

  try {
    await (await teamsCol()).insertOne(team);
  } catch (error) {
    if (isDuplicateKey(error)) {
      return { error: "A team with that name or slug already exists.", status: 409 };
    }
    throw error;
  }

  await (await usersCol()).updateOne({ id: user.id }, { $set: { teamId: team.id } });

  return { value: team };
}

export async function addTeamMember(
  leader: User,
  rawUsername: string
): Promise<TeamResult<{ team: Team; member: User }>> {
  if (!leader.teamId) return { error: "Create a team before adding players.", status: 400 };

  const teams = await teamsCol();
  const team = await teams.findOne({ id: leader.teamId }, NO_ID);
  if (!team) return { error: "Team not found.", status: 404 };
  if (team.leaderId !== leader.id) {
    return { error: "Only the team leader can add players.", status: 403 };
  }
  if (team.memberIds.length >= MAX_TEAM_SIZE) {
    return { error: `Team is full — maximum ${MAX_TEAM_SIZE} players.`, status: 409 };
  }

  const username = rawUsername.trim();
  if (!username) return { error: "Enter the player's handle.", status: 400 };

  const users = await usersCol();
  const member = await users.findOne({ username }, { ...NO_ID, collation: CI });
  if (!member) return { error: "No player with that handle was found.", status: 404 };
  if (member.id === leader.id) return { error: "You are already in this team.", status: 409 };
  if (member.teamId) return { error: `${member.username} is already registered in a team.`, status: 409 };

  const solved = [...new Set([...team.solved, ...member.solved])];
  const patterns = [...new Set([...(team.patterns ?? []), ...(member.patterns ?? [])])];
  const score = await pointsFor(solved, patterns);
  const memberIds = [...team.memberIds, member.id];

  await teams.updateOne(
    { id: team.id },
    { $set: { solved, patterns, score, memberIds } }
  );
  await users.updateOne({ id: member.id }, { $set: { teamId: team.id } });

  return { value: { team: { ...team, solved, score, memberIds }, member } };
}
