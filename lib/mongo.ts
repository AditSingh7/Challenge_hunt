import { randomUUID } from "node:crypto";
import type { CollationOptions, Db, MongoClient } from "mongodb";
import { MongoClient as MongoClientCtor } from "mongodb";
import { hashPassword } from "./password";
import type { User } from "./types";

const DEFAULT_DB_NAME = "hack_the_pattern";

export const CI: CollationOptions = { locale: "en", strength: 2 };

const globalStore = globalThis as unknown as {
  __htpMongoClient?: Promise<MongoClient>;
  __htpMongoInit?: Promise<void>;
};

function connectionString(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not configured. Add your MongoDB Atlas connection string to .env.local."
    );
  }
  return uri;
}

export function mongoClient(): Promise<MongoClient> {
  if (!globalStore.__htpMongoClient) {
    const pending = new MongoClientCtor(connectionString(), {
      maxPoolSize: 10,
      retryWrites: true,
    }).connect();
    globalStore.__htpMongoClient = pending.catch((error) => {
      globalStore.__htpMongoClient = undefined;
      throw error;
    });
  }
  return globalStore.__htpMongoClient;
}

export async function getDatabase(): Promise<Db> {
  const client = await mongoClient();
  const db = client.db(process.env.MONGODB_DB_NAME?.trim() || DEFAULT_DB_NAME);

  if (!globalStore.__htpMongoInit) {
    globalStore.__htpMongoInit = initialize(db).catch((error) => {
      globalStore.__htpMongoInit = undefined;
      throw error;
    });
  }
  await globalStore.__htpMongoInit;

  return db;
}

async function initialize(db: Db): Promise<void> {
  const users = db.collection<User>("users");
  const challenges = db.collection("challenges");
  const sessions = db.collection("sessions");
  const submissions = db.collection("submissions");
  const teams = db.collection("teams");

  await Promise.all([
    users.createIndex({ id: 1 }, { unique: true }),
    users.createIndex({ username: 1 }, { unique: true, collation: CI }),
    users.createIndex({ email: 1 }, { unique: true, collation: CI }),
    users.createIndex({ score: -1 }),
    users.createIndex({ teamId: 1 }),
    challenges.createIndex({ id: 1 }, { unique: true }),
    challenges.createIndex({ number: 1 }, { unique: true, sparse: true }),
    challenges.createIndex({ createdAt: 1, _id: 1 }),
    sessions.createIndex({ userId: 1 }),
    sessions.createIndex({ expiresAt: 1 }),
    submissions.createIndex({ createdAt: -1 }),
    submissions.createIndex({ userId: 1 }),
    submissions.createIndex({ challengeId: 1 }),
    teams.createIndex({ id: 1 }, { unique: true }),
    teams.createIndex({ name: 1 }, { unique: true, collation: CI }),
    teams.createIndex({ slug: 1 }, { unique: true, collation: CI }),
  ]);

  await ensureAdmin(db);
  await backfillChallengeNumbers(db);
}

async function backfillChallengeNumbers(db: Db): Promise<void> {
  const challenges = db.collection<{ id: string; number?: number; createdAt: string }>("challenges");
  const ordered = await challenges
    .find({}, { projection: { _id: 1, number: 1 } })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();

  const used = new Set<number>();
  for (const doc of ordered) {
    if (typeof doc.number === "number") used.add(doc.number);
  }
  if (used.size === ordered.length) return;

  let next = 1;
  for (const doc of ordered) {
    if (typeof doc.number === "number") continue;
    while (used.has(next)) next += 1;
    await challenges.updateOne({ _id: doc._id }, { $set: { number: next } });
    used.add(next);
  }
}

async function ensureAdmin(db: Db): Promise<void> {
  const username = process.env.ADMIN_USERNAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !email || !password) return;

  const users = db.collection<User>("users");
  const now = new Date().toISOString();

  const existing = await users.findOne({ $or: [{ username }, { email }] }, { collation: CI });
  if (existing) {
    if (existing.role !== "admin") {
      await users.updateOne({ id: existing.id }, { $set: { role: "admin" } });
    }
    return;
  }

  const { salt, hash } = hashPassword(password);
  const admin: User = {
    id: `u-${randomUUID()}`,
    username,
    email,
    passwordHash: hash,
    salt,
    role: "admin",
    score: 0,
    solved: [],
    createdAt: now,
    lastSeenAt: now,
  };

  try {
    await users.insertOne(admin);
  } catch (error) {
    const duplicate = typeof error === "object" && error !== null && "code" in error && error.code === 11000;
    if (!duplicate) throw error;
  }
}
