import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
    if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { initData } = await req.json();
    if (!initData) {
      return new Response(JSON.stringify({ error: 'initData is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and verify Telegram initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      return new Response(JSON.stringify({ error: 'Missing hash in initData' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build data-check-string (sorted, excluding hash)
    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // HMAC verification using bot token
    const secretKey = createHmac('sha256', 'WebAppData').update(TELEGRAM_API_KEY).digest();
    const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) {
      return new Response(JSON.stringify({ error: 'Invalid Telegram signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check auth_date is not too old (allow 1 hour)
    const authDate = parseInt(params.get('auth_date') ?? '0');
    if (Date.now() / 1000 - authDate > 3600) {
      return new Response(JSON.stringify({ error: 'initData expired' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract user info
    const userParam = params.get('user');
    if (!userParam) {
      return new Response(JSON.stringify({ error: 'No user in initData' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tgUser = JSON.parse(userParam);
    const telegramId = tgUser.id as number;
    const firstName = tgUser.first_name ?? 'User';
    const username = tgUser.username ?? '';
    const email = `tg_${telegramId}@telegram.local`;

    // Find existing profile by telegram_id
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .single();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.user_id;
    } else {
      // Create new user
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: {
          display_name: firstName,
          telegram_id: telegramId,
          telegram_username: username,
        },
      });

      if (createErr) throw createErr;
      userId = newUser.user!.id;

      // Update profile with telegram_id
      await supabase
        .from('profiles')
        .update({ telegram_id: telegramId, display_name: firstName })
        .eq('user_id', userId);

      // Set default customer role
      await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'customer' });
    }

    // Generate magic link for session
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkErr) throw linkErr;

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) throw new Error('Failed to generate session token');

    return new Response(JSON.stringify({
      token_hash: tokenHash,
      email,
      telegram_id: telegramId,
      first_name: firstName,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('telegram-auth error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
