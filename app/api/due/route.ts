import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 50);
  const rows = (
    await db.query(
      `select c.id, c.file_path, c.title, c.content, s.due_at
       from srs_state s join chunks c on c.id = s.id
       where s.due_at <= now()
       order by s.due_at asc
       limit $1`,
      [limit]
    )
  ).rows;
  return NextResponse.json({ items: rows });
}


