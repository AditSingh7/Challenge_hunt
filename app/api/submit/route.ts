import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { challengesCol, NO_ID, nowISO, submissionsCol, teamsCol, usersCol } from "@/lib/db";
import { getSessionUserRecord } from "@/lib/auth";
import { judgeCode } from "@/lib/judge";
import { broadcast } from "@/lib/events";
import { broadcastLeaderboard } from "@/lib/leaderboard";
import { getChallengeWindow } from "@/lib/challenge-window";
import { LANGUAGES, type Language, type Submission } from "@/lib/types";

const MAX_CODE_LENGTH = 50000;
const MAX_STORED_SUBMISSIONS = 300;

export async function POST(req: NextRequest) {
  const user = await getSessionUserRecord();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  if (user.role !== "admin") {
    const window = await getChallengeWindow();
    if (!window.open) {
      return NextResponse.json(
        { error: "The challenge window is closed. Submissions are not accepted right now." },
        { status: 403 }
      );
    }
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const challengeId = String(body.challengeId ?? "");
  const language = String(body.language ?? "") as Language;
  const code = String(body.code ?? "");

  if (!LANGUAGES.includes(language)) {
    return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
  }
  if (!code.trim()) return NextResponse.json({ error: "Solution code is empty." }, { status: 400 });
  if (code.length > MAX_CODE_LENGTH) {
    return NextResponse.json({ error: `Solution exceeds ${MAX_CODE_LENGTH} characters.` }, { status: 400 });
  }

  const challenge = await (await challengesCol()).findOne({ id: challengeId }, { projection: { _id: 0 } });
  if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });

  const users = await usersCol();
  const teams = await teamsCol();
  const fresh = await users.findOne({ id: user.id }, NO_ID);
  const team = fresh?.teamId ? await teams.findOne({ id: fresh.teamId }, NO_ID) : null;

  const patternVerified =
    !!fresh &&
    ((fresh.patterns ?? []).includes(challenge.id) ||
      fresh.solved.includes(challenge.id) ||
      (team?.solved ?? []).includes(challenge.id));
  if (!patternVerified) {
    return NextResponse.json(
      { error: "Stage 1 locked: verify your pattern against the problem statement before submitting code." },
      { status: 403 }
    );
  }

  const result = await judgeCode(language, code, challenge.sampleOutput);

  const codeReward = challenge.codePoints ?? challenge.points;
  let earned = 0;

  if (result.status === "passed") {
    if (team) {
      // Points are awarded once per team — no duplicate scores across members.
      const awarded = await teams.updateOne(
        { id: team.id, solved: { $ne: challenge.id } },
        { $push: { solved: challenge.id }, $inc: { score: codeReward } }
      );
      if (awarded.matchedCount > 0) {
        earned = codeReward;
        await users.updateOne(
          { id: user.id, solved: { $ne: challenge.id } },
          {
            $push: { solved: challenge.id },
            $inc: { score: codeReward },
            $set: { lastSeenAt: nowISO() },
          }
        );
      }
    } else {
      const awarded = await users.updateOne(
        { id: user.id, solved: { $ne: challenge.id } },
        {
          $push: { solved: challenge.id },
          $inc: { score: codeReward },
          $set: { lastSeenAt: nowISO() },
        }
      );
      if (awarded.matchedCount > 0) earned = codeReward;
    }
  }

  const submission: Submission = {
    id: `s-${randomUUID()}`,
    userId: user.id,
    username: user.username,
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    language,
    status: result.status,
    points: earned,
    durationMs: result.durationMs,
    createdAt: nowISO(),
  };

  const submissions = await submissionsCol();
  await submissions.insertOne(submission);

  const cutoff = await submissions
    .find({}, { projection: { createdAt: 1 } })
    .sort({ createdAt: -1, _id: -1 })
    .skip(MAX_STORED_SUBMISSIONS - 1)
    .limit(1)
    .next();
  if (cutoff) await submissions.deleteMany({ createdAt: { $lt: cutoff.createdAt } });

  const solved = team
    ? ((await teams.findOne({ id: team.id }, { projection: { _id: 0, solved: 1 } }))?.solved ?? [])
    : ((await users.findOne({ id: user.id }, { projection: { _id: 0, solved: 1 } }))?.solved ?? []);

  if (result.status === "passed") broadcastLeaderboard();
  broadcast({ type: "submissions" });
  broadcast({ type: "stats" });

  return NextResponse.json({
    result,
    earned,
    alreadySolved: result.status === "passed" && earned === 0,
    team: team ? { name: team.name } : null,
    solved,
  });
}
