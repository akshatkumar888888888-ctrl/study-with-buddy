// ==============================================================================
// google-sync-pull
// ------------------------------------------------------------------------------
// Two-way sync pass, called from a "Sync now" button in the app (and can also
// be wired to a Supabase Cron schedule — see README section at the bottom).
//
// 1. PUSH: any local task never synced to Google (google_task_id IS NULL) gets
//    created there.
// 2. PULL: any task/event *created or changed directly in Google* — in either
//    Google Tasks or Google Calendar (e.g. from a phone, or ticking it off in
//    Calendar's task panel) — is pulled back into the app's `tasks` table.
//
// Deploy: supabase functions deploy google-sync-pull
// ==============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import {
  refreshAccessToken, getOrCreateTaskList, upsertGoogleTask,
  upsertCalendarEvent, listGoogleTasks, listSwbCalendarEvents,
} from '../_shared/google.ts';

function guessCategory(notes: string | undefined): 'Physics' | 'Chemistry' | 'Math' | 'English' | 'Other' {
  const match = notes?.match(/Subject:\s*(Physics|Chemistry|Math|English|Other)/i);
  const found = match?.[1];
  const valid = ['Physics', 'Chemistry', 'Math', 'English', 'Other'];
  return (valid.includes(found || '') ? found : 'Other') as any;
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

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: tokenRow } = await admin.from('google_tokens').select('*').eq('user_id', user.id).maybeSingle();
    if (!tokenRow) {
      return new Response(JSON.stringify({ synced: false, reason: 'Google not connected' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { accessToken, expiresAt } = await refreshAccessToken(tokenRow.refresh_token);
    const tasklistId = await getOrCreateTaskList(accessToken, tokenRow.tasklist_id);

    // -------------------- 1. PUSH: local tasks never sent to Google --------------------
    const { data: unsynced } = await admin
      .from('tasks').select('*').eq('user_id', user.id).is('google_task_id', null);

    for (const task of unsynced || []) {
      const completed = task.status === 'done';
      const gTask = await upsertGoogleTask(accessToken, tasklistId, null, {
        title: task.title, notes: `Subject: ${task.category} · Added from Study with Buddy`,
        due: task.date, completed,
      });
      const gEvent = await upsertCalendarEvent(accessToken, null, {
        title: task.title, date: task.date, completed, appTaskId: task.id,
      });
      await admin.from('tasks').update({
        google_task_id: gTask.id, google_event_id: gEvent.id, google_synced_at: new Date().toISOString(),
      }).eq('id', task.id);
    }

    // -------------------- 2. PULL: changes made directly in Google --------------------
    const updatedMin = tokenRow.tasks_last_sync || undefined;
    let pulledIn = 0;
    let pulledUpdates = 0;

    // 2a. Google Tasks -> app (source of truth for completion status)
    const gTasks = await listGoogleTasks(accessToken, tasklistId, updatedMin);
    for (const gTask of gTasks) {
      const { data: match } = await admin.from('tasks').select('*').eq('google_task_id', gTask.id).maybeSingle();

      if (gTask.deleted) {
        if (match) await admin.from('tasks').delete().eq('id', match.id);
        continue;
      }

      const isDone = gTask.status === 'completed';
      const dueDate = gTask.due ? gTask.due.split('T')[0] : new Date().toISOString().split('T')[0];

      if (match) {
        // Existing app task — reconcile status/title from Google's version.
        await admin.from('tasks').update({
          title: gTask.title || match.title,
          status: isDone ? 'done' : 'pending',
          completed_at: isDone ? (match.completed_at || new Date().toISOString()) : null,
        }).eq('id', match.id);
        pulledUpdates++;
      } else {
        // Brand new task, created directly in Google Tasks / Calendar's task panel.
        const { data: created } = await admin.from('tasks').insert({
          user_id: user.id,
          title: gTask.title || 'Untitled task',
          category: guessCategory(gTask.notes),
          status: isDone ? 'done' : 'pending',
          date: dueDate,
          completed_at: isDone ? new Date().toISOString() : null,
          google_task_id: gTask.id,
          google_synced_at: new Date().toISOString(),
        }).select().single();

        if (created) {
          const gEvent = await upsertCalendarEvent(accessToken, null, {
            title: created.title, date: created.date, completed: isDone, appTaskId: created.id,
          });
          await admin.from('tasks').update({ google_event_id: gEvent.id }).eq('id', created.id);
        }
        pulledIn++;
      }
    }

    // 2b. Google Calendar -> app (title/date edits made straight on the calendar grid)
    const gEvents = await listSwbCalendarEvents(accessToken, updatedMin);
    for (const gEvent of gEvents) {
      const appTaskId = gEvent.extendedProperties?.private?.appTaskId;
      if (!appTaskId) continue;
      const { data: match } = await admin.from('tasks').select('*').eq('id', appTaskId).maybeSingle();
      if (!match) continue;

      if (gEvent.status === 'cancelled') continue; // deletion already handled via Google Tasks pass above

      const newDate = gEvent.start?.date;
      const newTitle = (gEvent.summary || '').replace(/^✅\s*/, '');
      if (newDate && (newDate !== match.date || newTitle !== match.title)) {
        await admin.from('tasks').update({ date: newDate || match.date, title: newTitle || match.title }).eq('id', match.id);
        pulledUpdates++;
      }
    }

    await admin.from('google_tokens').update({
      access_token: accessToken,
      access_token_expires_at: expiresAt,
      tasklist_id: tasklistId,
      tasks_last_sync: new Date().toISOString(),
    }).eq('user_id', user.id);

    return new Response(JSON.stringify({
      synced: true, pushed: (unsynced || []).length, pulledIn, pulledUpdates,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('google-sync-pull error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
