import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

Deno.serve(async () => {
  const startTime = Date.now();

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY is not configured');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Process each message
    for (const update of updates) {
      if (!update.message) continue;
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = msg.text ?? '';

      // Handle /start command
      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        const shopSlug = parts.length > 1 ? parts[1] : null;

        if (shopSlug) {
          // Deep link to a shop
          const { data: shop } = await supabase
            .from('shops')
            .select('name, slug')
            .eq('slug', shopSlug)
            .single();

          const shopUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}`; // will use frontend URL
          const replyText = shop
            ? `🛒 <b>${shop.name}</b>\n\nVisit their shop to browse and order:\n${shopUrl}/shop/${shop.slug}`
            : `Welcome! Unfortunately, that shop wasn't found.`;

          await sendMessage(chatId, replyText, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        } else {
          await sendMessage(
            chatId,
            '👋 Welcome to ShopBot!\n\nAre you a <b>Seller</b> or a <b>Customer</b>?\n\n/seller - Set up your shop\n/customer - Browse shops',
            LOVABLE_API_KEY,
            TELEGRAM_API_KEY,
          );
        }
      } else if (text === '/seller') {
        // Store telegram chat_id for notifications
        await sendMessage(
          chatId,
          '🏪 Great! To set up your shop, visit our website and create an account as a Seller.\n\nOnce you create your shop, come back and send /link to connect your Telegram for order notifications.',
          LOVABLE_API_KEY,
          TELEGRAM_API_KEY,
        );
      } else if (text === '/link') {
        // Link telegram to shop - store chat_id
        const linkCode = chatId.toString();
        await sendMessage(
          chatId,
          `🔗 Your Telegram Link Code: <code>${linkCode}</code>\n\nEnter this code in your Seller Dashboard to receive order notifications here.`,
          LOVABLE_API_KEY,
          TELEGRAM_API_KEY,
        );
      } else if (text === '/customer') {
        await sendMessage(
          chatId,
          '🛍 To browse shops, you need a shop link from a seller.\n\nAsk your seller for their shop link!',
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
