# GatherKit Vercel Deployment Notes

This is a Vite + React prototype for GatherKit.

## Vercel settings

- Framework preset: `Vite`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

## Current data behavior

This prototype uses Supabase realtime for event drafts, host records, RSVPs, Run Sheet task checkoffs, and Message Center sent updates when the Vercel environment variables are present. If they are missing, it falls back to browser `localStorage` for demo use.

The app now supports multiple event drafts. The Events sidebar view reads from `gatherkit_events`, the organizer can create a new event draft, and RSVP/message/run sheet data follows the selected event slug.

Event-specific URLs are supported with paths like `/e/neighborhood-event` and `/e/event-abc123`. The `vercel.json` rewrite sends direct event links back to the Vite app so refreshes and shared RSVP links work on Vercel.

If someone opens an unknown `/e/:slug` URL, GatherKit shows an event-not-found screen. From there the organizer can create a new event draft using that exact slug or return to the Events list.

## Next Supabase pass

Run `supabase-schema.sql` in your Supabase SQL editor first. The current realtime slice creates:

- `gatherkit_hosts`
- `gatherkit_events`
- `gatherkit_event_rsvps`
- `gatherkit_event_tasks`
- `gatherkit_event_messages`

## Roadmap

- Extend the multi-event model into true multiple hosts and host-owned events. Each host should be able to create and manage their own events, while neighbors can RSVP and view the appropriate public event page.
- Add real host identity/permissions before production use. The current prototype has permissive public policies for easy testing; production should use Supabase Auth and row-level security policies that allow hosts to update only their own events.
- Add separate public RSVP and protected organizer routes once authentication is introduced.

Then set these Vercel environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

After setting env vars, redeploy the Vercel project.
