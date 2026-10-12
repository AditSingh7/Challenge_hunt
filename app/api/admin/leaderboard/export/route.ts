import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLeaderboardRows } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

function xml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textCell(value: unknown): string {
  return `<Cell><Data ss:Type="String">${xml(value)}</Data></Cell>`;
}

function numberCell(value: number): string {
  return `<Cell><Data ss:Type="Number">${Number.isFinite(value) ? value : 0}</Data></Cell>`;
}

export async function GET() {
  const user = await getSessionUser();
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const rows = await getLeaderboardRows(user.id);
  const headers = [
    "Rank", "Team Name", "Team Slug", "Members", "Group", "Member Count", "Score",
    "Completed Challenges", "Solved Challenge IDs", "Warnings", "Status", "Last Activity",
  ];
  const headerRow = `<Row>${headers.map(textCell).join("")}</Row>`;
  const dataRows = rows.map((row) => `<Row>${[
    numberCell(row.rank),
    textCell(row.teamName),
    textCell(row.teamSlug),
    textCell(row.members.join(", ")),
    textCell(row.group),
    numberCell(row.members.length),
    numberCell(row.score),
    numberCell(row.solves),
    textCell(row.solvedIds.join(", ")),
    numberCell(row.warnings),
    textCell(row.status),
    textCell(row.lastSeenAt),
  ].join("")}</Row>`).join("");
  const workbook = `<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Leaderboard"><Table>${headerRow}${dataRows}</Table></Worksheet></Workbook>`;

  return new Response(workbook, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leaderboard-report.xls"',
      "Cache-Control": "no-store",
    },
  });
}
