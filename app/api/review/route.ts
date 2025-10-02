import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { INITIAL_SM2, sm2Schedule } from "@/lib/sm2";

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, grade, responseMs } = body as { id: string; grade: 0 | 1 | 2 | 3; responseMs?: number };
  if (!id || grade === undefined) return NextResponse.json({ error: "id and grade required" }, { status: 400 });

  const state = (
    await db.query(`select repetitions, interval_days, ease_factor from srs_state where id=$1`, [id])
  ).rows[0];

  const prev = state
    ? { repetitions: state.repetitions as number, intervalDays: state.interval_days as number, easeFactor: state.ease_factor as number }
    : INITIAL_SM2;

  const { next, addedDays } = sm2Schedule(prev, grade);
  await db.query(`insert into reviews (chunk_id, grade, response_ms) values ($1,$2,$3)`, [id, grade, responseMs || null]);
  await db.query(
    `insert into srs_state (id, repetitions, interval_days, ease_factor, due_at, last_reviewed_at)
     values ($1,$2,$3,$4, now() + ($5 || ' days')::interval, now())
     on conflict (id) do update set repetitions=excluded.repetitions, interval_days=excluded.interval_days, ease_factor=excluded.ease_factor, due_at=excluded.due_at, last_reviewed_at=excluded.last_reviewed_at`,
    [id, next.repetitions, next.intervalDays, next.easeFactor, String(next.intervalDays)]
  );

  return NextResponse.json({ ok: true, nextDueInDays: next.intervalDays });
}


