import { Pool } from "pg";
import { loadConfig } from "@/lib/config";

let pool: Pool | null = null;

export function getDb(): Pool {
  if (!pool) {
    const { databaseUrl } = loadConfig();
    pool = new Pool({ connectionString: databaseUrl, max: 3, idleTimeoutMillis: 30000 });
  }
  return pool;
}

export async function migrate() {
  const db = getDb();
  await db.query(`
    create table if not exists chunks (
      id text primary key,
      file_path text not null,
      header_slug text not null,
      header_path text[] not null,
      title text not null,
      content text not null,
      content_hash text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists srs_state (
      id text primary key references chunks(id) on delete cascade,
      repetitions int not null default 0,
      interval_days int not null default 0,
      ease_factor real not null default 2.5,
      due_at timestamptz not null default now(),
      last_reviewed_at timestamptz
    );

    create table if not exists reviews (
      id bigserial primary key,
      chunk_id text not null references chunks(id) on delete cascade,
      reviewed_at timestamptz not null default now(),
      grade int not null,
      response_ms int
    );

    create index if not exists idx_srs_due_at on srs_state(due_at);
    create index if not exists idx_chunks_file_path on chunks(file_path);
  `);
}


