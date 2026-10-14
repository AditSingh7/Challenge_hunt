import { NextRequest, NextResponse } from "next/server";
import { challengesCol, NO_ID, usersCol } from "@/lib/db";
import { getSessionUserRecord } from "@/lib/auth";
import { getChallengeWindow } from "@/lib/challenge-window";

export async function POST(req: NextRequest) {
  const user = await getSessionUserRecord();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role === "admin") return NextResponse.json({ error: "Only player accounts can lock an optional challenge choice." }, { status: 403 });
  const window = await getChallengeWindow();
  if (!window.open) return NextResponse.json({ error: "Challenges are locked until the event window opens." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const challengeId = typeof body?.challengeId === "string" ? body.challengeId : "";
  const challenge = await (await challengesCol()).findOne({ id: challengeId }, { projection: { _id: 0, id: 1, number: 1 } });
  if (!challenge || (challenge.number !== 3 && challenge.number !== 4)) {
    return NextResponse.json({ error: "Choose challenge 3 or challenge 4." }, { status: 400 });
  }

  const users = await usersCol();
  const saved = await users.findOneAndUpdate(
    { id: user.id, $or: [{ optionalChallengeId: { $exists: false } }, { optionalChallengeId: null }] },
    { $set: { optionalChallengeId: challenge.id } },
    { returnDocument: "after", projection: NO_ID.projection }
  );

  if (saved) return NextResponse.json({ optionalChallengeId: saved.optionalChallengeId });

  const current = await users.findOne({ id: user.id }, { projection: { _id: 0, optionalChallengeId: 1 } });
  if (current?.optionalChallengeId === challenge.id) {
    return NextResponse.json({ optionalChallengeId: current.optionalChallengeId });
  }
  if (current?.optionalChallengeId) {
    return NextResponse.json({ error: "Your optional challenge choice is already locked." }, { status: 409 });
  }
  return NextResponse.json({ error: "Account not found." }, { status: 404 });
}
