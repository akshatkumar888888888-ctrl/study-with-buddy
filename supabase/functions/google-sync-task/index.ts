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
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import {
  refreshAccessToken, getOrCreateTaskList, upsertGoogleTask, deleteGoogleTask,
  upsertCalendarEvent, deleteCalendarEvent,
} from '../_shared/google.ts';

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
