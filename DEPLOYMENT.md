# GatherKit Vercel Deployment Notes

This is a Vite + React prototype for GatherKit.

## Vercel settings

- Framework preset: `Vite`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

## Current data behavior

This prototype uses Supabase realtime for the active event draft, host record, RSVPs, Run Sheet task checkoffs, and Message Center sent updates when the Vercel environment variables are present. If they are missing, it falls back to browser `localStorage` for demo use.

## Next Supabase pass

Run `supabase-schema.sql` in your Supabase SQL editor first. The current realtime slice creates:

- `gatherkit_hosts`
- `gatherkit_events`
- `gatherkit_event_rsvps`
- `gatherkit_event_tasks`
- `gatherkit_event_messages`

## Roadmap

- Extend the first host-aware model into multiple hosts and host-owned events. Each host should be able to create and manage their own events, while neighbors can RSVP and view the appropriate public event page.
- Add real host identity/permissions before production use. The current prototype has permissive public policies for easy testing; production should use Supabase Auth and row-level security policies that allow hosts to update only their own events.
- Replace the current hardcoded `neighborhood-event` slug with event-specific slugs or routes so each event has its own organizer, RSVP, message log, and run sheet data.

Then set these Vercel environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

After setting env vars, redeploy the Vercel project.
