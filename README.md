# WhenFree MVP

A small Next.js + Supabase app for friend groups to see when everyone is free.

## Included

- Google sign-in through Supabase Auth
- Create a group and share an invite code
- Join a group by invite code
- Recurring weekly busy blocks
- One-time BUSY overrides
- One-time FREE overrides
- All-day exceptions
- CSV schedule import
- Group week view
- Hover any 30-minute slot to see who is free/busy
- Vercel Web Analytics component
- Row Level Security policies

## 1. Install locally

```bash
npm install
cp .env.example .env.local
```

Create a Supabase project, then put the project URL and **publishable key** in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 2. Create the database

In Supabase Dashboard:

1. Open **SQL Editor**.
2. Copy all of `supabase/migrations/001_initial.sql`.
3. Run it.

## 3. Configure Google sign-in

### Google Auth Platform / Google Cloud

1. Create or choose a Google Cloud project.
2. Open Google Auth Platform.
3. Configure Branding and Audience.
4. For scopes, use only:
   - `openid`
   - user email
   - user profile
5. Create an OAuth Client ID with application type **Web application**.
6. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - later, your Vercel production URL such as `https://whenfree.vercel.app`
7. In Supabase Dashboard -> Authentication -> Providers -> Google, copy the Supabase callback URL.
8. Add that exact Supabase callback URL to Google's **Authorized redirect URIs**.
9. Copy the Google Client ID and Client Secret into the Supabase Google provider settings and enable Google.

### Supabase redirect URLs

Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL while local: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

After Vercel deployment, change Site URL to your production domain and add:

- `https://YOUR-DOMAIN/auth/callback`

You can keep localhost as an allowed redirect while developing.

## 4. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## 5. Push to GitHub

```bash
git init
git add .
git commit -m "Initial WhenFree MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Never commit `.env.local`.

## 6. Deploy on Vercel

1. In Vercel, choose **Add New -> Project**.
2. Import the GitHub repository.
3. Vercel should detect Next.js automatically.
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = your production URL
5. Deploy.
6. Copy the final production URL.
7. Add the production URL to Google Authorized JavaScript origins.
8. Add `https://YOUR-DOMAIN/auth/callback` to Supabase Auth redirect URLs.
9. Set Supabase Site URL to the production URL.
10. Redeploy if necessary.

## 7. Turn on Vercel Web Analytics

The code already contains:

```tsx
import { Analytics } from "@vercel/analytics/next";
```

and renders `<Analytics />` in `app/layout.tsx`.

In Vercel Dashboard -> your project -> Analytics, enable Web Analytics. You can then see traffic, pages, referrers, device/browser information, etc.

## CSV schedule format

Example:

```csv
day,start,end
Monday,08:00,09:30
Monday,12:00,13:00
Tuesday,15:00,18:00
Friday,08:00,15:00
```


## Privacy note

This MVP intentionally does **not** store descriptions such as “doctor appointment” or “robotics.” It stores only busy/free time ranges. Row Level Security limits schedule-row access to the owner and people who share a group.

## Microsoft Clarity

Do **not** add Microsoft Clarity if this app targets people under 18. Microsoft states that Clarity should not be used on websites/apps targeting users under 18. Vercel Web Analytics is already included for basic traffic statistics without session replay.

## Good next upgrades

1. Drag-to-paint weekly schedule editor.
2. Screenshot/PDF schedule upload with an AI parser plus a confirmation screen.
3. Calendar event creation after the group picks a time.
4. Group-specific time zones.
5. "Find best times" button.
6. Notifications.
7. Stronger privacy boundary using server-side availability RPCs rather than exposing other members' raw busy/free rows.
