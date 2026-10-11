import { NextRequest, NextResponse } from "next/server";
import { NO_ID, nowISO, settingsCol } from "@/lib/db";
import { getSessionUserRecord } from "@/lib/auth";
import { broadcast } from "@/lib/events";

export const dynamic = "force-dynamic";

const TIMER_ID = "timer";
const CHALLENGES_ID = "challenges";
const MAX_DURATION_MINUTES = 10080; // 7 days

async function readTimer() {
  const doc = await (await settingsCol()).findOne({ id: TIMER_ID }, NO_ID);
  return doc && doc.startsAt ? { startsAt: doc.startsAt } : null;
}

async function readChallengesWindow() {
  const doc = await (await settingsCol()).findOne({ id: CHALLENGES_ID }, NO_ID);
  return { visible: !!doc?.visible, endsAt: doc?.endsAt ?? null };
}

// Public: the homepage countdown and the challenges gate both need it.
export async function GET() {
  const [timer, challenges] = await Promise.all([readTimer(), readChallengesWindow()]);
  return NextResponse.json(
    { timer, challenges },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(req: NextRequest) {
  const admin = await getSessionUserRecord();
  if (!admin) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (admin.role !== "admin") {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const settings = await settingsCol();

  // ---- Challenge visibility window (admin enables + sets solve duration) ----
  if ("challengesVisible" in body) {
    if (body.challengesVisible !== true) {
      await settings.updateOne(
        { id: CHALLENGES_ID },
        { $set: { id: CHALLENGES_ID, visible: false, endsAt: null, updatedAt: nowISO() } },
        { upsert: true }
      );
      broadcast({ type: "settings" });
      broadcast({ type: "challenges" });
      return NextResponse.json({ ok: true, challenges: { visible: false, endsAt: null } });
    }

    const durationMinutes = Number(body.durationMinutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_DURATION_MINUTES) {
      return NextResponse.json(
        { error: `Solve time must be a whole number between 1 and ${MAX_DURATION_MINUTES} minutes.` },
        { status: 400 }
      );
    }

    const endsAt = new Date(Date.now() + durationMinutes * 60_000).toISOString();
    await settings.updateOne(
      { id: CHALLENGES_ID },
      { $set: { id: CHALLENGES_ID, visible: true, endsAt, updatedAt: nowISO() } },
      { upsert: true }
    );
    broadcast({ type: "settings" });
    broadcast({ type: "challenges" });
    return NextResponse.json({ ok: true, challenges: { visible: true, endsAt } });
  }

  // ---- Homepage start-time countdown ----
  const startsAtRaw = body.startsAt ?? null;

  if (startsAtRaw === null) {
    await settings.updateOne(
      { id: TIMER_ID },
      { $set: { id: TIMER_ID, startsAt: null, updatedAt: nowISO() } },
      { upsert: true }
    );
    broadcast({ type: "settings" });
    return NextResponse.json({ ok: true, timer: null });
  }

  const startDate = new Date(String(startsAtRaw));
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Provide a valid start time." }, { status: 400 });
  }

  const startsAt = startDate.toISOString();
  await settings.updateOne(
    { id: TIMER_ID },
    { $set: { id: TIMER_ID, startsAt, updatedAt: nowISO() } },
    { upsert: true }
  );

  broadcast({ type: "settings" });
  return NextResponse.json({ ok: true, timer: { startsAt } });
}
