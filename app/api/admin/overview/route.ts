import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/auth";
import { challengesCol, sessionsCol, submissionsCol, usersCol } from "@/lib/db";
import { availableRuntimes } from "@/lib/judge";
import { getLeaderboardRows } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getSessionUserRecord();
  if (!admin) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (admin.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const users = await usersCol();
  const challenges = await challengesCol();
  const submissions = await submissionsCol();
  const sessions = await sessionsCol();

  const now = new Date().toISOString();

  const [
    totalUsers,
    totalChallenges,
    totalSubmissions,
    passedSubmissions,
    activeSessions,
    totals,
    runtimes,
    leaderboard,
  ] = await Promise.all([
    users.countDocuments(),
    challenges.countDocuments(),
    submissions.countDocuments(),
    submissions.countDocuments({ status: "passed" }),
    sessions.countDocuments({ expiresAt: { $gte: now } }),
    users
      .aggregate<{ totalSolves: number; pointsAwarded: number }>([
        {
          $group: {
            _id: null,
            totalSolves: { $sum: { $size: { $ifNull: ["$solved", []] } } },
            pointsAwarded: { $sum: { $ifNull: ["$score", 0] } },
          },
        },
      ])
      .toArray(),
    availableRuntimes(),
    getLeaderboardRows(admin.id),
  ]);

  const totalsDoc = totals[0];

  const [userList, submissionList] = await Promise.all([
    users
      .find({}, { projection: { _id: 0, passwordHash: 0, salt: 0 } })
      .sort({ createdAt: 1, _id: 1 })
      .toArray(),
    submissions.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1, _id: -1 }).limit(30).toArray(),
  ]);

  return NextResponse.json({
    stats: {
      users: totalUsers,
      challenges: totalChallenges,
      totalSolves: totalsDoc?.totalSolves ?? 0,
      submissions: totalSubmissions,
      passRate: totalSubmissions ? Math.round((passedSubmissions / totalSubmissions) * 100) : 0,
      pointsAwarded: totalsDoc?.pointsAwarded ?? 0,
      activeSessions,
    },
    runtimes,
    users: userList.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      score: u.score,
      solves: u.solved.length,
      bot: Boolean(u.bot),
      banned: Boolean(u.banned),
      warnings: typeof u.tabViolations === "number" ? u.tabViolations : 0,
      createdAt: u.createdAt,
      lastSeenAt: u.lastSeenAt,
    })),
    submissions: submissionList,
    leaderboard,
  });
}
