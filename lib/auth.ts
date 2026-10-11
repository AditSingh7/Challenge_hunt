import { randomBytes } from "node:crypto";
import type { Collection } from "mongodb";
import { cookies } from "next/headers";
import { NO_ID, sessionsCol, toPublicUser, usersCol } from "./db";
import type { SessionDoc } from "./db";
import type { PublicUser, User } from "./types";

export const SESSION_COOKIE = "htp_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const TOUCH_INTERVAL_MS = 60 * 1000;

// Browser-close detection: the client beacons "close" on pagehide and heartbeats
// while the page is alive. A close beacon older than the grace window destroys
// the session on the next check; a session with no heartbeat (crash, kill,
// power loss) is destroyed once it is stale.
const SESSION_STALE_MS = 3 * 60 * 1000;
const CLOSE_GRACE_MS = 45 * 1000;
const HEARTBEAT_TOUCH_MS = 15 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

const globalStore = globalThis as unknown as {
  __htpSweepAt?: number;
};

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const sessions = await sessionsCol();

  await sessions.insertOne({
    _id: token,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    lastSeenAt: new Date().toISOString(),
    closedAt: null,
  });
  await sweepSessions(sessions, true);

  return token;
}

export async function attachSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

function sessionCleanupFilter(now: number) {
  return {
    $or: [
      { expiresAt: { $lte: new Date(now).toISOString() } },
      { closedAt: { $lte: new Date(now - CLOSE_GRACE_MS).toISOString() } },
      { lastSeenAt: { $lte: new Date(now - SESSION_STALE_MS).toISOString() } },
    ],
  };
}

async function sweepSessions(sessions: Collection<SessionDoc>, force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - (globalStore.__htpSweepAt ?? 0) < SWEEP_INTERVAL_MS) return;
  globalStore.__htpSweepAt = now;
  await sessions.deleteMany(sessionCleanupFilter(now));
}

async function loadSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessions = await sessionsCol();
  void sweepSessions(sessions).catch(() => {});

  const session = await sessions.findOne(
    { _id: token },
    { projection: { userId: 1, expiresAt: 1, lastSeenAt: 1, closedAt: 1 } }
  );
  if (!session) return null;

  const now = Date.now();
  if (new Date(session.expiresAt).getTime() < now) return null;

  const closedAt = session.closedAt ? new Date(session.closedAt).getTime() : null;
  if (closedAt !== null && now - closedAt >= CLOSE_GRACE_MS) {
    await sessions.deleteOne({ _id: token });
    return null;
  }

  const lastSeen = session.lastSeenAt ? new Date(session.lastSeenAt).getTime() : now;
  if (now - lastSeen >= SESSION_STALE_MS) {
    await sessions.deleteOne({ _id: token });
    return null;
  }

  const touchSession =
    closedAt !== null || !session.lastSeenAt || now - lastSeen >= HEARTBEAT_TOUCH_MS;

  const users = await usersCol();
  const user = await users.findOne({ id: session.userId }, NO_ID);
  if (!user) return null;
  if (user.banned && user.role !== "admin") return null;

  if (Date.now() - new Date(user.lastSeenAt).getTime() > TOUCH_INTERVAL_MS) {
    user.lastSeenAt = new Date().toISOString();
    await users.updateOne({ id: user.id }, { $set: { lastSeenAt: user.lastSeenAt } });
  }

  if (touchSession) {
    await sessions.updateOne(
      { _id: token },
      { $set: { lastSeenAt: new Date(now).toISOString(), closedAt: null } }
    );
  }

  return user;
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const user = await loadSessionUser();
  return user ? toPublicUser(user) : null;
}

export async function getSessionUserRecord(): Promise<User | null> {
  return loadSessionUser();
}

export async function heartbeatSession(mode: "ping" | "resume"): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const sessions = await sessionsCol();
  const now = Date.now();

  const session = await sessions.findOne(
    { _id: token },
    { projection: { expiresAt: 1, lastSeenAt: 1, closedAt: 1 } }
  );
  if (!session) return false;

  if (new Date(session.expiresAt).getTime() < now) {
    await sessions.deleteOne({ _id: token });
    return false;
  }

  const closedAt = session.closedAt ? new Date(session.closedAt).getTime() : null;
  if (mode === "ping" && closedAt !== null && now - closedAt >= CLOSE_GRACE_MS) {
    await sessions.deleteOne({ _id: token });
    return false;
  }

  const lastSeen = session.lastSeenAt ? new Date(session.lastSeenAt).getTime() : now;
  if (mode === "ping" && now - lastSeen >= SESSION_STALE_MS) {
    await sessions.deleteOne({ _id: token });
    return false;
  }

  await sessions.updateOne(
    { _id: token },
    { $set: { lastSeenAt: new Date(now).toISOString(), closedAt: null } }
  );
  return true;
}

export async function markSessionClosed(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const sessions = await sessionsCol();
  await sessions.updateOne({ _id: token }, { $set: { closedAt: new Date().toISOString() } });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const sessions = await sessionsCol();
    await sessions.deleteOne({ _id: token });
  }

  // Clear the cookie with the exact attributes it was set with so nothing survives.
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}
