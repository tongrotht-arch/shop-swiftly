import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
    if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch order with items
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch shop with telegram_chat_id
    const { data: shop } = await supabase
      .from('shops')
      .select('name, telegram_chat_id')
      .eq('id', order.shop_id)
      .single();

    if (!shop?.telegram_chat_id) {
      return new Response(JSON.stringify({ success: false, reason: 'No telegram_chat_id for shop' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build notification message
    const items = (order as any).order_items ?? [];
    const itemLines = items.map((i: any) =>
      `  • ${i.product_name} × ${i.quantity} — $${Number(i.price_at_time * i.quantity).toFixed(2)}`
    ).join('\n');

    const text = `🛒 <b>New Order!</b>\n\n` +
      `<b>Customer:</b> ${order.customer_name}\n` +
      `<b>Phone:</b> ${order.phone}\n` +
      `<b>Address:</b> ${order.delivery_address}\n\n` +
      `<b>Items:</b>\n${itemLines}\n\n` +
      `<b>Total:</b> $${Number(order.total_amount).toFixed(2)}\n` +
      `<b>Payment:</b> Cash on Delivery`;

    const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: shop.telegram_chat_id,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Telegram API failed [${response.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('order-notify error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
