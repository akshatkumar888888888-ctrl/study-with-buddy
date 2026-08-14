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
