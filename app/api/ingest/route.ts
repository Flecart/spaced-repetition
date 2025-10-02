import { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { getDb, migrate } from "@/lib/db";
import { chunkMarkdown } from "@/lib/chunk";
import crypto from "node:crypto";

function normalizeRepo(input: string): string {
  // Accept forms like owner/name or full URLs
  if (input.includes("github.com")) {
    try {
      const u = new URL(input);
      const parts = u.pathname.replace(/^\//, '').split('/');
      if (parts.length >= 2) return `${parts[0]}/${parts[1].replace(/\.git$/, '')}`;
    } catch {}
  }
  return input.replace(/^\//, '').replace(/\.git$/, '');
}

async function fetchMirrorPaths(repo: string, branch: string, token: string): Promise<{ path: string; type: string }[]> {
  const res = await fetch(`https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`Failed to list repo tree: ${res.status}`);
  const data = await res.json();
  return (data.tree || []).filter((t: any) => t.type === "blob").map((t: any) => ({ path: t.path as string, type: t.type as string }));
}

async function fetchFile(repo: string, path: string, token: string, branch: string): Promise<string> {
  const res = await fetch(`https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch)}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`Failed to fetch file ${path}: ${res.status}`);
  return await res.text();
}

export async function POST(req: NextRequest) {
  const cfg = loadConfig();
  const auth = req.headers.get("authorization") || "";
  if (!auth || !auth.startsWith("Bearer ") || auth.slice(7) !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await migrate();
  const db = getDb();

  const repo = normalizeRepo(cfg.githubMirrorRepo);
  const files = await fetchMirrorPaths(repo, cfg.githubBranch, cfg.githubToken);
  const mdFiles = files.filter(f => f.path.endsWith(".md"));

  let upserted = 0;
  for (const f of mdFiles) {
    const content = await fetchFile(repo, f.path, cfg.githubToken, cfg.githubBranch);
    const chunks = chunkMarkdown(f.path, content);

    for (const c of chunks) {
      await db.query(
        `insert into chunks (id, file_path, header_slug, header_path, title, content, content_hash)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (id) do update set title=excluded.title, content=excluded.content, content_hash=excluded.content_hash, header_path=excluded.header_path, updated_at=now()`,
        [c.id, c.filePath, c.headerSlug, c.headerPath, c.title, c.content, c.contentHash]
      );

      await db.query(
        `insert into srs_state (id, repetitions, interval_days, ease_factor, due_at)
         values ($1, 0, 0, 2.5, now())
         on conflict (id) do nothing`,
        [c.id]
      );

      upserted += 1;
    }
  }

  return NextResponse.json({ upserted });
}


