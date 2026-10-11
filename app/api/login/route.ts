import { NextRequest, NextResponse } from "next/server";
import { CI, NO_ID, nowISO, toPublicUser, usersCol } from "@/lib/db";
import { attachSessionCookie, createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const identifier = String(body.identifier ?? body.username ?? body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (!identifier || !password) {
    return NextResponse.json({ error: "Handle/email and password are required." }, { status: 400 });
  }

  const users = await usersCol();
  const user = await users.findOne(
    { $or: [{ username: identifier }, { email: identifier }] },
    { ...NO_ID, collation: CI }
  );

  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials. Check your handle and password." }, { status: 401 });
  }

  if (user.banned && user.role !== "admin") {
    return NextResponse.json({ error: "You are Banned. Contact the administrator to restore access." }, { status: 403 });
  }

  user.lastSeenAt = nowISO();
  await users.updateOne({ id: user.id }, { $set: { lastSeenAt: user.lastSeenAt } });

  const token = await createSession(user.id);
  await attachSessionCookie(token);

  return NextResponse.json({ user: toPublicUser(user) });
}
