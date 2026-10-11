import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/auth";
import { nowISO, sessionsCol, teamsCol, usersCol } from "@/lib/db";
import { broadcast } from "@/lib/events";
import { broadcastLeaderboard } from "@/lib/leaderboard";

const MAX_ATTEMPTS = 2;

async function announceWarning(username: string, teamId: string | undefined, violations: number, banned: boolean) {
  let teamName: string | null = null;
  if (teamId) {
    const team = await (await teamsCol()).findOne({ id: teamId }, { projection: { _id: 0, name: 1 } });
    teamName = team?.name ?? null;
  }

  broadcast({ type: "warning", username, teamName, violations, banned });
  broadcast({ type: "users" });
  broadcastLeaderboard();
  broadcast({ type: "stats" });
}

export async function POST() {
  const user = await getSessionUserRecord();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  if (user.role === "admin") {
    return NextResponse.json({ banned: false, ignored: true });
  }

  if (user.banned) {
    return NextResponse.json({ banned: true, message: "You are Banned" }, { status: 403 });
  }

  const users = await usersCol();
  const fresh = await users.findOneAndUpdate(
    { id: user.id },
    { $inc: { tabViolations: 1 } },
    {
      returnDocument: "after",
      projection: { id: 1, role: 1, username: 1, teamId: 1, tabViolations: 1 },
    }
  );

  if (!fresh) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (fresh.role === "admin") {
    return NextResponse.json({ banned: false, ignored: true, leftAttempts: MAX_ATTEMPTS });
  }

  const violations = fresh.tabViolations ?? 1;

  if (violations > MAX_ATTEMPTS) {
    await users.updateOne(
      { id: user.id, role: { $ne: "admin" } },
      { $set: { banned: true, bannedAt: nowISO() } }
    );
    await (await sessionsCol()).deleteMany({ userId: user.id });

    await announceWarning(fresh.username, fresh.teamId, violations, true);
    return NextResponse.json(
      { banned: true, violations, message: "You are Banned" },
      { status: 403 }
    );
  }

  await announceWarning(fresh.username, fresh.teamId, violations, false);

  return NextResponse.json({
    banned: false,
    violations,
    leftAttempts: Math.max(0, MAX_ATTEMPTS - violations + 1),
  });
}
