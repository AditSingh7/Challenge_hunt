import { NextRequest, NextResponse } from "next/server";
import { sessionsCol, teamsCol, usersCol } from "@/lib/db";
import { getSessionUserRecord } from "@/lib/auth";
import { broadcast } from "@/lib/events";
import { broadcastLeaderboard } from "@/lib/leaderboard";

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
  const { user: admin, error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");
  const users = await usersCol();

  if (action === "reset") {
    const user = await users.findOneAndUpdate(
      { id },
      { $set: { score: 0, solved: [] } },
      { returnDocument: "after", projection: { id: 1, username: 1 } }
    );
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    broadcastLeaderboard();
    broadcast({ type: "users" });
    broadcast({ type: "stats" });
    return NextResponse.json({ ok: true, username: user.username });
  }

  if (action === "toggle-role") {
    if (id === admin!.id) {
      return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
    }
    const current = await users.findOne({ id }, { projection: { id: 1, username: 1, role: 1 } });
    if (!current) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const role = current.role === "admin" ? "user" : "admin";
    await users.updateOne({ id }, { $set: { role } });

    broadcast({ type: "users" });
    return NextResponse.json({ ok: true, username: current.username, role });
  }

  if (action === "unban") {
    const result = await users.updateOne(
      { id },
      { $set: { banned: false, tabViolations: 0 }, $unset: { bannedAt: "" } }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    broadcast({ type: "users" });
    broadcastLeaderboard();
    return NextResponse.json({ ok: true });
  }

  if (action === "clear-warnings") {
    const result = await users.updateOne(
      { id },
      { $set: { tabViolations: 0 } }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    broadcast({ type: "users" });
    broadcastLeaderboard();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { user: admin, error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  if (id === admin!.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const users = await usersCol();
  const removed = await users.findOneAndDelete({ id }, { projection: { username: 1, teamId: 1 } });
  if (!removed) return NextResponse.json({ error: "User not found." }, { status: 404 });

  await (await sessionsCol()).deleteMany({ userId: id });

  if (removed.teamId) {
    const teams = await teamsCol();
    const team = await teams.findOne({ id: removed.teamId });
    if (team) {
      const memberIds = team.memberIds.filter((memberId) => memberId !== id);
      if (memberIds.length === 0) {
        await teams.deleteOne({ id: team.id });
      } else {
        await teams.updateOne(
          { id: team.id },
          { $set: { memberIds, leaderId: team.leaderId === id ? memberIds[0] : team.leaderId } }
        );
      }
    }
  }

  broadcast({ type: "users" });
  broadcastLeaderboard();
  broadcast({ type: "stats" });
  return NextResponse.json({ ok: true, username: removed.username });
}
