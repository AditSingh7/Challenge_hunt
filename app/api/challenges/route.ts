import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { challengesCol, nowISO, teamsCol } from "@/lib/db";
import { getSessionUserRecord } from "@/lib/auth";
import { starterTemplates } from "@/lib/templates";
import { broadcast } from "@/lib/events";
import { validateChallengeInput } from "@/lib/validate";
import { availableRuntimes } from "@/lib/judge";
import { getChallengeWindow } from "@/lib/challenge-window";
import type { Challenge } from "@/lib/types";

export async function GET() {
  const user = await getSessionUserRecord();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  if (user.role !== "admin") {
    const window = await getChallengeWindow();
    if (!window.open) {
      return NextResponse.json(
        { error: "Challenges are locked until the admin opens the event window." },
        { status: 403 }
      );
    }
  }

  const challenges = await challengesCol();
  const [list, runtimes, team] = await Promise.all([
    challenges.find({}, { projection: { _id: 0 } }).sort({ createdAt: 1, _id: 1 }).toArray(),
    availableRuntimes(),
    user.teamId
      ? (await teamsCol()).findOne({ id: user.teamId }, { projection: { _id: 0, solved: 1, patterns: 1 } })
      : Promise.resolve(null),
  ]);

  const visibleChallenges = user.role !== "admin" && user.optionalChallengeId
    ? list.filter((challenge) => (challenge.number !== 3 && challenge.number !== 4) || challenge.id === user.optionalChallengeId)
    : list;
  const visibleIds = new Set(visibleChallenges.map((challenge) => challenge.id));
  const personalOptionalIds = new Set(
    user.role === "admin" ? [] : visibleChallenges.filter((challenge) => challenge.number === 3 || challenge.number === 4).map((challenge) => challenge.id)
  );
  const sharedSolved = team ? team.solved.filter((id) => visibleIds.has(id) && !personalOptionalIds.has(id)) : [];
  const sharedPatterns = team?.patterns?.filter((id) => visibleIds.has(id) && !personalOptionalIds.has(id)) ?? [];

  return NextResponse.json({
    challenges: visibleChallenges,
    solved: team
      ? [...new Set([...sharedSolved, ...user.solved.filter((id) => personalOptionalIds.has(id))])]
      : user.solved.filter((id) => visibleIds.has(id)),
    patterns: team
      ? [...new Set([...sharedPatterns, ...(user.patterns ?? []).filter((id) => personalOptionalIds.has(id))])]
      : [...new Set([...(user.patterns ?? [])])].filter((id) => visibleIds.has(id)),
    optionalChallengeId: user.optionalChallengeId ?? null,
    role: user.role,
    runtimes,
  });
}

export async function POST(req: NextRequest) {
  const admin = await getSessionUserRecord();
  if (!admin) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (admin.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const parsed = validateChallengeInput(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const challenges = await challengesCol();
  const latest = await challenges
    .find({}, { projection: { number: 1 } })
    .sort({ number: -1 })
    .limit(1)
    .next();
  const nextNumber = typeof latest?.number === "number" ? latest.number + 1 : 1;

  const challenge: Challenge = {
    id: `c-${randomUUID()}`,
    number: nextNumber,
    title: parsed.value.title,
    category: parsed.value.category,
    difficulty: parsed.value.difficulty,
    points: parsed.value.points,
    patternPoints: parsed.value.patternPoints,
    codePoints: parsed.value.codePoints,
    desc: parsed.value.desc,
    sampleOutput: parsed.value.sampleOutput,
    codeTemplates: { ...starterTemplates(), ...(parsed.value.codeTemplates ?? {}) },
    createdAt: nowISO(),
  };

  await challenges.insertOne(challenge);

  broadcast({ type: "challenges" });
  broadcast({ type: "stats" });

  return NextResponse.json({ challenge }, { status: 201 });
}
