import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

// IMPORTANT: Replace with your actual bot username
const BOT_USERNAME = 'your_bot'; // TODO: Update this

Deno.serve(async () => {
  const startTime = Date.now();

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY is not configured');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const WEBAPP_URL = Deno.env.get('WEBAPP_URL') ?? 'https://id-preview--f6a482f8-4c4d-42d9-a42b-07b705db1134.lovable.app';

  let totalProcessed = 0;
  let currentOffset: number;

  const { data: state, error: stateErr } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .single();

  if (stateErr) {
    return new Response(JSON.stringify({ error: stateErr.message }), { status: 500 });
  }

  currentOffset = state.update_offset;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        offset: currentOffset,
        timeout,
        allowed_updates: ['message'],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 502 });
    }

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    for (const update of updates) {
      if (!update.message) continue;
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = msg.text ?? '';

      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        const shopSlug = parts.length > 1 ? parts[1] : null;

        if (shopSlug) {
          const { data: shop } = await supabase
            .from('shops')
            .select('name, slug')
            .eq('slug', shopSlug)
            .single();

          if (shop) {
            // Send Mini App button for the shop
            await sendMessageWithWebApp(
              chatId,
              `🛒 <b>${shop.name}</b>\n\nTap the button below to browse and order:`,
              `Open ${shop.name}`,
              `${WEBAPP_URL}?startapp=${shop.slug}`,
              LOVABLE_API_KEY,
              TELEGRAM_API_KEY,
            );
          } else {
            await sendMessage(chatId, `Welcome! Unfortunately, that shop wasn't found.`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          }
        } else {
          await sendMessageWithWebApp(
            chatId,
            '👋 <b>Welcome to ShopBot!</b>\n\nTap below to open the app.\n\nSellers can manage their shop, customers can browse and order.',
            'Open ShopBot',
            WEBAPP_URL,
            LOVABLE_API_KEY,
            TELEGRAM_API_KEY,
          );
        }
      } else if (text === '/seller' || text === '/dashboard') {
        await sendMessageWithWebApp(
          chatId,
          '🏪 Tap below to open your Seller Dashboard:',
          'Open Dashboard',
          `${WEBAPP_URL}?startapp=dashboard`,
          LOVABLE_API_KEY,
          TELEGRAM_API_KEY,
        );
      } else if (text.startsWith('/shop')) {
        const parts = text.split(' ');
        const slug = parts.length > 1 ? parts[1] : null;
        if (slug) {
          await sendMessageWithWebApp(
            chatId,
            `🛍 Tap below to open the shop:`,
            'Open Shop',
            `${WEBAPP_URL}?startapp=${slug}`,
            LOVABLE_API_KEY,
            TELEGRAM_API_KEY,
          );
        } else {
          await sendMessage(chatId, 'Usage: /shop <slug>', LOVABLE_API_KEY, TELEGRAM_API_KEY);
        }
      } else if (text === '/help') {
        await sendMessage(
          chatId,
          '📖 <b>Commands:</b>\n\n' +
          '/start - Open the Mini App\n' +
          '/seller - Open Seller Dashboard\n' +
          '/shop <slug> - Open a specific shop\n' +
          '/help - Show this help',
          LOVABLE_API_KEY,
          TELEGRAM_API_KEY,
        );
      }
    }

    // Store messages
    const rows = updates
      .filter((u: any) => u.message)
      .map((u: any) => ({
        update_id: u.update_id,
        chat_id: u.message.chat.id,
        text: u.message.text ?? null,
        raw_update: u,
      }));

    if (rows.length > 0) {
      await supabase
        .from('telegram_messages')
        .upsert(rows, { onConflict: 'update_id' });
      totalProcessed += rows.length;
    }

    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase
      .from('telegram_bot_state')
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq('id', 1);

    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed, finalOffset: currentOffset }));
});

async function sendMessage(chatId: number, text: string, lovableKey: string, telegramKey: string) {
  await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

async function sendMessageWithWebApp(
  chatId: number,
  text: string,
  buttonText: string,
  webAppUrl: string,
  lovableKey: string,
  telegramKey: string,
) {
  await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: buttonText, web_app: { url: webAppUrl } },
        ]],
      },
    }),
  });
}
