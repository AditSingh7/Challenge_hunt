import { NextRequest, NextResponse } from "next/server";
import { challengesCol, nowISO, teamsCol, usersCol } from "@/lib/db";
import { getSessionUserRecord } from "@/lib/auth";
import { firstDiffLine, normalizeOutput } from "@/lib/judge";
import { broadcastLeaderboard } from "@/lib/leaderboard";
import { broadcast } from "@/lib/events";
import { getChallengeWindow } from "@/lib/challenge-window";

type Ctx = { params: Promise<{ id: string }> };

const MAX_PATTERN_LENGTH = 20000;

export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await getSessionUserRecord();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  if (user.role !== "admin") {
    const window = await getChallengeWindow();
    if (!window.open) {
      return NextResponse.json(
        { error: "The challenge window is closed. Pattern checks are disabled right now." },
        { status: 403 }
      );
    }
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const pattern = String(body?.pattern ?? "");

  if (!pattern.trim()) return NextResponse.json({ error: "Type the pattern before verifying." }, { status: 400 });
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return NextResponse.json({ error: `Pattern exceeds ${MAX_PATTERN_LENGTH} characters.` }, { status: 400 });
  }

  const challenge = await (await challengesCol()).findOne(
    { id },
    { projection: { _id: 0, sampleOutput: 1, patternPoints: 1 } }
  );
  if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });

  const users = await usersCol();
  const fresh = await users.findOne(
    { id: user.id },
    { projection: { _id: 0, solved: 1, patterns: 1, teamId: 1 } }
  );
  if (!fresh) return NextResponse.json({ error: "Account not found." }, { status: 401 });

  const alreadyVerified = (fresh.patterns ?? []).includes(id) || fresh.solved.includes(id);
  const matches = normalizeOutput(pattern) === normalizeOutput(challenge.sampleOutput);

  if (!matches && !alreadyVerified) {
    const line = firstDiffLine(pattern, challenge.sampleOutput);
    return NextResponse.json({
      verified: false,
      error: `Pattern mismatch at line ${line}. Reread the problem statement and adjust your pattern.`,
    });
  }

  if (alreadyVerified) return NextResponse.json({ verified: true, earned: 0 });

  // First verified pattern — award the Stage 1 share of the points (once per team).
  const reward = challenge.patternPoints ?? 0;
  let earned = 0;
  const team = fresh.teamId
    ? await (await teamsCol()).findOne({ id: fresh.teamId }, { projection: { _id: 0 } })
    : null;

  if (team) {
    const awarded = await (await teamsCol()).updateOne(
      { id: team.id, patterns: { $ne: id } },
      { $push: { patterns: id }, $inc: { score: reward } }
    );
    if (awarded.matchedCount > 0) {
      earned = reward;
      await users.updateOne(
        { id: user.id, patterns: { $ne: id } },
        { $push: { patterns: id }, $inc: { score: reward }, $set: { lastSeenAt: nowISO() } }
      );
    }
  } else {
    const awarded = await users.updateOne(
      { id: user.id, patterns: { $ne: id } },
      { $push: { patterns: id }, $inc: { score: reward }, $set: { lastSeenAt: nowISO() } }
    );
    if (awarded.matchedCount > 0) earned = reward;
  }

  if (earned > 0) {
    broadcastLeaderboard();
    broadcast({ type: "stats" });
  }

  return NextResponse.json({ verified: true, earned });
}
