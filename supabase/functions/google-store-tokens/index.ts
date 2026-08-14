// ==============================================================================
// google-store-tokens
// ------------------------------------------------------------------------------
// Called once from the client right after a successful Google sign-in
// (see supabase.ts -> captureGoogleTokensOnSignIn). Supabase's client SDK only
// hands back `provider_refresh_token` on the very first consent, so we grab it
// here and persist it server-side — this is the token that lets the backend
// sync Calendar/Tasks later without the user needing to stay signed in.
//
// Deploy: supabase functions deploy google-store-tokens
// Secrets needed (once): supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...
// ==============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Client bound to the caller's own JWT — used only to verify who they are.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { provider_refresh_token, provider_token } = await req.json();
    if (!provider_refresh_token) {
      // Nothing to store (e.g. user had already granted consent before and Google
      // didn't re-issue a refresh token). Not an error — just a no-op.
      return new Response(JSON.stringify({ stored: false, reason: 'no refresh token in this session' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service-role client — bypasses RLS, required to write into the locked-down
    // google_tokens table (which has RLS enabled with no policies for normal users).
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const expiresAt = new Date(Date.now() + 55 * 60 * 1000).toISOString();

    const { error: upsertError } = await adminClient
      .from('google_tokens')
      .upsert({
        user_id: user.id,
        refresh_token: provider_refresh_token,
        access_token: provider_token ?? null,
        access_token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) throw upsertError;

    await adminClient.from('profiles').update({ google_connected: true }).eq('id', user.id);

    return new Response(JSON.stringify({ stored: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('google-store-tokens error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
