import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLeaderboardRows } from "@/lib/leaderboard";
import { getChallengeWindow } from "@/lib/challenge-window";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();

  if (user?.role !== "admin") {
    const window = await getChallengeWindow();
    // Hidden before the event opens; visible while live and after it ends (final results).
    if (!window.open && !window.expired) {
      return NextResponse.json(
        { error: "The leaderboard is not available until the event window is open." },
        { status: 403 }
      );
    }
  }

  const rows = await getLeaderboardRows(user?.id);
  return NextResponse.json({ rows, me: user ? { id: user.id, score: user.score, solvedCount: user.solvedCount } : null });
}
