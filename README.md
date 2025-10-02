# Suggester

Spaced repetition for your Markdown notes mirrored from a filtered GitHub repo.

## Overview

- Mirror repo: push only allowlisted Markdown files from your private vault
- Chunking: lowest-level Markdown headers become review units
- Scheduling: SM-2 algorithm
- Email: daily digest at 9am Europe/Zurich via Resend
- Hosting: Next.js on Vercel, Postgres (Neon/Supabase)

## Setup

1. Create a mirror repo (private). Add a deploy key or repo-scoped PAT.
2. In your main vault repo, add `.export-allowlist` with include patterns (globs). Example:

```
notes/**/*.md
zettelkasten/**/*.md
```

3. Add the GitHub Action to export only allowlisted files and force-push to the mirror.
4. Deploy this app to Vercel.
5. Configure environment variables:

```
DATABASE_URL=postgres://...
GITHUB_MIRROR_REPO=owner/mirror-repo
GITHUB_MIRROR_BRANCH=main
GITHUB_TOKEN=ghp_...
INGEST_TOKEN=some-long-random
EMAIL_TOKEN=some-long-random
RESEND_API_KEY=re_...
EMAIL_FROM=Your Name <sender@yourdomain.com>
EMAIL_TO=hxuanqiang@ethz.ch
TIMEZONE=Europe/Zurich
DAILY_SEND_HOUR=9
APP_BASE_URL=https://your-app.vercel.app
DAILY_NEW_LIMIT=20
```

6. Set Vercel Cron to call email endpoint daily at 07:00 UTC (which is 09:00 Zurich during standard time; adjust for DST):

- Path: `/api/email`
- Method: `POST`
- Header: `Authorization: Bearer $EMAIL_TOKEN`
- Schedule: `0 7 * * *`

7. Optionally add a cron for ingestion (or trigger via workflow webhook):

- Path: `/api/ingest`
- Method: `POST`
- Header: `Authorization: Bearer $INGEST_TOKEN`

## API

- `POST /api/ingest` → pulls mirror and upserts chunks
- `GET /api/due?limit=50` → returns due items
- `POST /api/review` body: `{ id, grade: 0|1|2|3, responseMs? }`
- `POST /api/email` → sends daily digest

## Development

- `pnpm dev` or `npm run dev`
- Ensure `DATABASE_URL` is set; `lib/db.migrate()` runs on first ingest.

## Notes

- Chunk ID is `file_path#slug(lowest-header)`
- Upper-level content (not under the deepest heading) is ignored as requested.
- If a chunk’s content hash changes, it’s upserted without resetting state; you can change this policy later.
