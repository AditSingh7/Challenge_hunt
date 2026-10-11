import { NextRequest, NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/auth";
import { broadcast } from "@/lib/events";
import { addTeamMember, createTeam, getTeamMembers, getTeamOf } from "@/lib/teams";

export async function GET() {
  const user = await getSessionUserRecord();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const team = await getTeamOf(user);
  if (!team) return NextResponse.json({ team: null, members: [] });

  const members = await getTeamMembers(team);
  return NextResponse.json({
    team,
    members: members.map((member) => ({
      id: member.id,
      username: member.username,
      role: member.role,
      isLeader: member.id === team.leaderId,
      isSelf: member.id === user.id,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserRecord();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const result = await createTeam(user, String(body.name ?? ""), body.slug ? String(body.slug) : undefined);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  broadcast({ type: "leaderboard" });
  broadcast({ type: "users" });
  broadcast({ type: "stats" });

  return NextResponse.json({ team: result.value }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUserRecord();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const result = await addTeamMember(user, String(body.username ?? ""));
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  broadcast({ type: "leaderboard" });
  broadcast({ type: "users" });
  broadcast({ type: "stats" });

  return NextResponse.json({ team: result.value.team });
}
