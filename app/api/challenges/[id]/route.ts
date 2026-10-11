import { NextRequest, NextResponse } from "next/server";
import { challengesCol, submissionsCol, usersCol } from "@/lib/db";
import { getSessionUserRecord } from "@/lib/auth";
import { starterTemplates } from "@/lib/templates";
import { broadcast } from "@/lib/events";
import { validateChallengeInput } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const user = await getSessionUserRecord();
  if (!user) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  if (user.role !== "admin") {
    return { error: NextResponse.json({ error: "Administrator access required." }, { status: 403 }) };
  }
  return { user };
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const parsed = validateChallengeInput(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const challenges = await challengesCol();
  const existing = await challenges.findOne({ id }, { projection: { _id: 0 } });
  if (!existing) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });

  const codeTemplates = {
    ...starterTemplates(),
    ...existing.codeTemplates,
    ...(parsed.value.codeTemplates ?? {}),
  };

  const updated = {
    ...existing,
    title: parsed.value.title,
    category: parsed.value.category,
    difficulty: parsed.value.difficulty,
    points: parsed.value.points,
    patternPoints: parsed.value.patternPoints,
    codePoints: parsed.value.codePoints,
    desc: parsed.value.desc,
    sampleOutput: parsed.value.sampleOutput,
    codeTemplates,
  };

  await challenges.updateOne(
    { id },
    {
      $set: {
        title: updated.title,
        category: updated.category,
        difficulty: updated.difficulty,
        points: updated.points,
        patternPoints: updated.patternPoints,
        codePoints: updated.codePoints,
        desc: updated.desc,
        sampleOutput: updated.sampleOutput,
        codeTemplates,
      },
    }
  );

  broadcast({ type: "challenges" });
  broadcast({ type: "stats" });
  return NextResponse.json({ challenge: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;

  const challenges = await challengesCol();
  const removed = await challenges.findOneAndDelete({ id }, { projection: { _id: 0 } });
  if (!removed) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });

  await (await usersCol()).updateMany(
    { $or: [{ solved: id }, { patterns: id }] },
    [
      {
        $set: {
          solved: {
            $filter: {
              input: { $ifNull: ["$solved", []] },
              as: "solvedId",
              cond: { $ne: ["$$solvedId", id] },
            },
          },
          patterns: {
            $filter: {
              input: { $ifNull: ["$patterns", []] },
              as: "patternId",
              cond: { $ne: ["$$patternId", id] },
            },
          },
          score: { $max: [0, { $subtract: [{ $ifNull: ["$score", 0] }, removed.points] }] },
        },
      },
    ]
  );

  await (await submissionsCol()).deleteMany({ challengeId: id });

  broadcast({ type: "challenges" });
  broadcast({ type: "leaderboard" });
  broadcast({ type: "submissions" });
  broadcast({ type: "stats" });
  return NextResponse.json({ ok: true });
}
