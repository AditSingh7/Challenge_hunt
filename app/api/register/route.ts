import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { CI, NO_ID, isDuplicateKey, nowISO, toPublicUser, usersCol } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { broadcast } from "@/lib/events";
import { broadcastLeaderboard } from "@/lib/leaderboard";
import type { User } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const username = String(body.username ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      { error: "Handle must be 3-20 characters using letters, numbers or underscore." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const users = await usersCol();

  const handleTaken = await users.findOne({ username }, { ...NO_ID, collation: CI });
  if (handleTaken) {
    return NextResponse.json({ error: "This handle is already registered." }, { status: 409 });
  }
  const emailTaken = await users.findOne({ email }, { ...NO_ID, collation: CI });
  if (emailTaken) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const { salt, hash } = hashPassword(password);
  const now = nowISO();
  const user: User = {
    id: `u-${randomUUID()}`,
    username,
    email,
    passwordHash: hash,
    salt,
    role: "user",
    score: 0,
    solved: [],
    createdAt: now,
    lastSeenAt: now,
  };

  try {
    await users.insertOne(user);
  } catch (error) {
    if (isDuplicateKey(error)) {
      return NextResponse.json(
        { error: "That handle or email is already registered." },
        { status: 409 }
      );
    }
    throw error;
  }

  broadcast({ type: "users" });
  broadcastLeaderboard();

  // No session is issued on registration — the player must sign in explicitly.
  return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
}
