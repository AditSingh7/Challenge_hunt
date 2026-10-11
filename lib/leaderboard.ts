import { broadcast } from "./events";
import { NO_ID, challengesCol, teamsCol, usersCol } from "./db";
import { challengeCode, type LeaderboardRow } from "./types";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export async function getLeaderboardRows(selfId?: string): Promise<LeaderboardRow[]> {
  const teams = await teamsCol();
  const users = await usersCol();
  const challenges = await challengesCol();
  const now = Date.now();

  const [allTeams, challengeDocs] = await Promise.all([
    teams.find({}, NO_ID).toArray(),
    challenges.find({}, { projection: { _id: 0, id: 1, number: 1 } }).toArray(),
  ]);
  if (!allTeams.length) return [];

  const codeById = new Map<string, string>();
  for (const challenge of challengeDocs) {
    if (typeof challenge.number === "number") codeById.set(challenge.id, challengeCode(challenge.number));
  }

  const memberDocs = await users
    .find(
      { teamId: { $in: allTeams.map((team) => team.id) } },
      { projection: { _id: 0, teamId: 1, username: 1, lastSeenAt: 1, tabViolations: 1 } }
    )
    .toArray();

  const byTeam = new Map<string, typeof memberDocs>();
  for (const member of memberDocs) {
    if (!member.teamId) continue;
    const list = byTeam.get(member.teamId) ?? [];
    list.push(member);
    byTeam.set(member.teamId, list);
  }

  const standings = allTeams
    .map((team) => {
      const memberDocsForTeam = byTeam.get(team.id) ?? [];
      const members = memberDocsForTeam
        .map((member) => member.username)
        .sort((a, b) => a.localeCompare(b));
      const lastSeenAt = memberDocsForTeam.reduce<string>(
        (latest, member) =>
          new Date(member.lastSeenAt).getTime() > new Date(latest).getTime() ? member.lastSeenAt : latest,
        team.createdAt
      );
      const online = memberDocsForTeam.some(
        (member) => now - new Date(member.lastSeenAt).getTime() < ONLINE_WINDOW_MS
      );
      const warnings = memberDocsForTeam.reduce(
        (total, member) => total + (typeof member.tabViolations === "number" ? member.tabViolations : 0),
        0
      );
      const solvedIds = team.solved
        .map((id) => codeById.get(id))
        .filter((code): code is string => Boolean(code))
        .sort((a, b) => a.localeCompare(b));
      return { team, members, lastSeenAt, online, solves: team.solved.length, warnings, solvedIds };
    })
    .sort((a, b) => {
      if (b.team.score !== a.team.score) return b.team.score - a.team.score;
      if (b.solves !== a.solves) return b.solves - a.solves;
      return a.team.name.localeCompare(b.team.name);
    });

  return standings.map((row, index) => ({
    rank: index + 1,
    teamName: row.team.name,
    teamSlug: row.team.slug,
    members: row.members,
    score: row.team.score,
    solves: row.solves,
    solvedIds: row.solvedIds,
    warnings: row.warnings,
    status: row.online ? "Online" : "Offline",
    isSelf: selfId ? row.team.memberIds.includes(selfId) : false,
    lastSeenAt: row.lastSeenAt,
    group: `${row.members.length} ${row.members.length === 1 ? "player" : "players"}`,
  }));
}

export function broadcastLeaderboard() {
  broadcast({ type: "leaderboard" });
}
