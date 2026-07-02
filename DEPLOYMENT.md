# GatherKit Vercel Deployment Notes

This is a Vite + React prototype for GatherKit.

## Vercel settings

- Framework preset: `Vite`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

## Current data behavior

This prototype uses Supabase realtime for RSVPs when the Vercel environment variables are present. If they are missing, it falls back to browser `localStorage` for demo use.

## Next Supabase pass

Run `supabase-schema.sql` in your Supabase SQL editor first. The current realtime slice creates:

- `gatherkit_event_rsvps`

Then set these Vercel environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

After setting env vars, redeploy the Vercel project.
