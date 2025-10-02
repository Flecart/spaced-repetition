import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendDailyEmail } from "@/lib/email";
import { loadConfig } from "@/lib/config";

export async function POST(req: NextRequest) {
  const cfg = loadConfig();
  const auth = req.headers.get("authorization") || "";
  if (!auth || !auth.startsWith("Bearer ") || auth.slice(7) !== process.env.EMAIL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  console.log(JSON.stringify({ event: "email.start" }));
  const due = (
    await db.query(
      `select c.id, c.title from srs_state s join chunks c on c.id = s.id
       where s.due_at <= now() order by s.due_at asc limit 100`
    )
  ).rows as { id: string; title: string }[];

  const list = due.map(d => `<li><a href="${process.env.APP_BASE_URL || ""}/review?id=${encodeURIComponent(d.id)}">${d.title}</a></li>`).join("");
  const html = `<div>
    <p>Here are your due notes for today:</p>
    <ul>${list || "<li>No items due. Have a nice day!</li>"}</ul>
  </div>`;

  const subject = `Suggester – ${due.length} item(s) due`;
  await sendDailyEmail(subject, html);
  console.log(JSON.stringify({ event: "email.done", count: due.length }));
  return NextResponse.json({ sent: true, count: due.length });
}


