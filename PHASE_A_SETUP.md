# THE CUT — Phase A Setup (no terminal required)

This delivers: Supabase schema, Next.js/PWA scaffold, analytics write pipeline,
and a working Vercel deploy. Follow these steps in order.

## 1. Create the GitHub repo

1. Go to github.com → **New repository** → name it `the-cut` → **Create repository**.
2. On the empty repo page, click **uploading an existing file**.
3. Drag the entire unzipped project folder (everything inside this delivery,
   keeping the folder structure — `app/`, `lib/`, `public/`, `supabase/`, plus
   the root files like `package.json`) into the upload box. GitHub's web
   uploader preserves subfolder paths when you drag folders in.
4. Commit directly to `main`.

## 2. Create the Supabase project

1. Go to supabase.com → **New project**. Pick a name, a database password
   (save it somewhere safe — you won't need it day-to-day), and a region
   close to your main audience.
2. Once it's provisioned, go to **SQL Editor** → **New query**.
3. Open `supabase/migrations/0001_phase_a_core_schema.sql` from the repo,
   copy its entire contents, paste into the SQL editor, and click **Run**.
   You should see "Success. No rows returned."
4. Go to **Table Editor** and confirm you now see tables like `players`,
   `dailies`, `cutoffs`, `attempts`, `analytics_events`, etc.
5. Go to **Project Settings → API**. You'll need three values in the next step:
   - **Project URL**
   - **anon public** key
   - **service_role** key (click "Reveal" — keep this one secret, never share it)

## 3. Deploy to Vercel

1. Go to vercel.com → **Add New → Project** → **Import** your `the-cut`
   GitHub repo.
2. Before deploying, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service_role key
   - `ATTEMPT_TOKEN_SECRET` = any long random string (e.g. mash the keyboard
     for 40+ characters — this isn't used yet in Phase A but Phase C needs
     it, easiest to set once now)
3. Click **Deploy**.
4. Once deployed, open the live URL. You should see the "THE CUT" placeholder
   page. This confirms the full pipeline — GitHub → Vercel build → Supabase
   connection — works end to end.

## 4. Sanity-check the API routes

- Visit `https://<your-vercel-url>/api/daily` — with no Daily published yet,
  it should return `{"status":"no_daily_live"}`.
- The analytics pipeline fires automatically on page load (`session_started`
  event). After a minute, check Supabase → Table Editor → `analytics_events`
  — you should see a row appear once you've loaded the live site at least once.

## What's intentionally not here yet

- No actual Daily can be created yet — there's no admin UI to generate one
  (that's Phase C/G). The schema and cutoff-freezing design from the
  architecture doc are in place and ready for it.
- No microgames are playable yet (Phase B).
- Icons are placeholders — see `public/icons/README.txt`.

Once this is deployed and confirmed working, let me know and I'll start
Phase B: the microgame engine contract plus the first three playable games.
