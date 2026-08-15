// ==============================================================================
// google-sync-task
// ------------------------------------------------------------------------------
// Called from the client right after a task is created, toggled done/pending,
// or deleted. Pushes that single change out to both Google Tasks (so it shows
// in Calendar's Tasks panel) and a companion all-day Calendar event.
//
// Body: { taskId: string, action: 'upsert' | 'delete' }
//
// Deploy: supabase functions deploy google-sync-task
// ==============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Shared CORS headers so the browser (running on a different origin than
// the Supabase project) is allowed to call these Edge Functions directly.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function handleOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

// ==============================================================================
// SHARED GOOGLE TASKS + GOOGLE CALENDAR HELPERS (used by all edge functions)
// ==============================================================================
// This file talks to Google's REST APIs directly (no SDK needed on Deno).
// It never sees a browser session — it always operates with a server-held
// refresh token that was captured once at sign-in time (see google-store-tokens).

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

export interface GoogleTokenRow {
  user_id: string;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  tasklist_id: string | null;
}

/**
 * Exchange a stored refresh token for a fresh access token.
 * Google access tokens are short-lived (~1hr); refresh tokens last until revoked.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google token refresh failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const expiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString();
  return { accessToken: data.access_token, expiresAt };
}

/** Small wrapper around fetch that adds the Google Bearer token and parses JSON. */
async function googleFetch(accessToken: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`Google API error ${res.status} at ${url}: ${text}`);
  }
  return json;
}

// ------------------------------------------------------------------
// GOOGLE TASKS API (tasks.googleapis.com) — these show up inside
// Google Calendar's built-in "Tasks" side panel automatically.
// ------------------------------------------------------------------

/** Find (or create) the "Study with Buddy" task list so we don't dump tasks into the user's default list. */
export async function getOrCreateTaskList(accessToken: string, existingId: string | null): Promise<string> {
  if (existingId) {
    try {
      await googleFetch(accessToken, `https://tasks.googleapis.com/tasks/v1/users/@me/lists/${existingId}`);
      return existingId;
    } catch {
      // Fall through and recreate — the list may have been deleted in Google Tasks.
    }
  }

  const lists = await googleFetch(accessToken, 'https://tasks.googleapis.com/tasks/v1/users/@me/lists');
  const found = (lists.items || []).find((l: any) => l.title === 'Study with Buddy');
  if (found) return found.id;

  const created = await googleFetch(accessToken, 'https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    method: 'POST',
    body: JSON.stringify({ title: 'Study with Buddy' }),
  });
  return created.id;
}

export async function upsertGoogleTask(
  accessToken: string,
  tasklistId: string,
  googleTaskId: string | null,
  fields: { title: string; notes?: string; due?: string; completed: boolean }
) {
  const body: any = {
    title: fields.title,
    notes: fields.notes,
    status: fields.completed ? 'completed' : 'needsAction',
  };
  if (fields.due) body.due = `${fields.due}T00:00:00.000Z`;

  if (googleTaskId) {
    return googleFetch(accessToken, `https://tasks.googleapis.com/tasks/v1/lists/${tasklistId}/tasks/${googleTaskId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
  return googleFetch(accessToken, `https://tasks.googleapis.com/tasks/v1/lists/${tasklistId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteGoogleTask(accessToken: string, tasklistId: string, googleTaskId: string) {
  try {
    await googleFetch(accessToken, `https://tasks.googleapis.com/tasks/v1/lists/${tasklistId}/tasks/${googleTaskId}`, {
      method: 'DELETE',
    });
  } catch {
    // Already gone on Google's side — nothing to do.
  }
}

export async function listGoogleTasks(accessToken: string, tasklistId: string, updatedMin?: string) {
  const params = new URLSearchParams({ showCompleted: 'true', showHidden: 'true', maxResults: '100' });
  if (updatedMin) params.set('updatedMin', updatedMin);
  const data = await googleFetch(accessToken, `https://tasks.googleapis.com/tasks/v1/lists/${tasklistId}/tasks?${params}`);
  return data.items || [];
}

// ------------------------------------------------------------------
// GOOGLE CALENDAR API — a companion all-day event on the primary
// calendar, so the task also shows up in the normal Calendar grid.
// ------------------------------------------------------------------

const SWB_MARKER = 'studyWithBuddy'; // extendedProperties.private key used to find our events back

export async function upsertCalendarEvent(
  accessToken: string,
  googleEventId: string | null,
  fields: { title: string; date: string; completed: boolean; appTaskId: string }
) {
  // All-day events: end date must be one day after start per Google's convention.
  const start = fields.date;
  const endDate = new Date(fields.date + 'T00:00:00Z');
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const end = endDate.toISOString().split('T')[0];

  const body = {
    summary: fields.completed ? `✅ ${fields.title}` : fields.title,
    start: { date: start },
    end: { date: end },
    extendedProperties: { private: { [SWB_MARKER]: 'true', appTaskId: fields.appTaskId } },
  };

  if (googleEventId) {
    return googleFetch(accessToken, `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
  return googleFetch(accessToken, 'https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteCalendarEvent(accessToken: string, googleEventId: string) {
  try {
    await googleFetch(accessToken, `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: 'DELETE',
    });
  } catch {
    // Already gone on Google's side — nothing to do.
  }
}

export async function listSwbCalendarEvents(accessToken: string, updatedMin?: string) {
  const params = new URLSearchParams({
    privateExtendedProperty: `${SWB_MARKER}=true`,
    showDeleted: 'true',
    singleEvents: 'true',
    maxResults: '100',
  });
  if (updatedMin) params.set('updatedMin', updatedMin);
  const data = await googleFetch(accessToken, `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`);
  return data.items || [];
}


Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { taskId, action } = await req.json();
    if (!taskId || !['upsert', 'delete'].includes(action)) {
      return new Response(JSON.stringify({ error: 'taskId and a valid action are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Not connected to Google yet — quietly no-op so task CRUD in the app still works fine.
    const { data: tokenRow } = await admin.from('google_tokens').select('*').eq('user_id', user.id).maybeSingle();
    if (!tokenRow) {
      return new Response(JSON.stringify({ synced: false, reason: 'Google not connected' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: task, error: taskError } = await admin
      .from('tasks').select('*').eq('id', taskId).eq('user_id', user.id).maybeSingle();

    if (action === 'upsert' && (taskError || !task)) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { accessToken, expiresAt } = await refreshAccessToken(tokenRow.refresh_token);
    await admin.from('google_tokens').update({ access_token: accessToken, access_token_expires_at: expiresAt }).eq('user_id', user.id);

    if (action === 'delete') {
      // Task may already be gone from the DB by the time this runs (client deletes
      // optimistically) — so the client instead passes the row's ids directly here
      // via a prior lookup. If it's already gone, this is a no-op either way.
      if (task?.google_task_id) await deleteGoogleTask(accessToken, tokenRow.tasklist_id, task.google_task_id);
      if (task?.google_event_id) await deleteCalendarEvent(accessToken, task.google_event_id);
      return new Response(JSON.stringify({ synced: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // action === 'upsert'
    const tasklistId = await getOrCreateTaskList(accessToken, tokenRow.tasklist_id);
    if (tasklistId !== tokenRow.tasklist_id) {
      await admin.from('google_tokens').update({ tasklist_id: tasklistId }).eq('user_id', user.id);
    }

    const completed = task.status === 'done';

    const gTask = await upsertGoogleTask(accessToken, tasklistId, task.google_task_id, {
      title: task.title,
      notes: `Subject: ${task.category} · Added from Study with Buddy`,
      due: task.date,
      completed,
    });

    const gEvent = await upsertCalendarEvent(accessToken, task.google_event_id, {
      title: task.title,
      date: task.date,
      completed,
      appTaskId: task.id,
    });

    await admin.from('tasks').update({
      google_task_id: gTask.id,
      google_event_id: gEvent.id,
      google_synced_at: new Date().toISOString(),
    }).eq('id', task.id);

    return new Response(JSON.stringify({ synced: true, googleTaskId: gTask.id, googleEventId: gEvent.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('google-sync-task error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
