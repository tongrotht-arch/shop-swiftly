
-- Singleton table for polling offset
CREATE TABLE public.telegram_bot_state (
  id INT PRIMARY KEY CHECK (id = 1),
  update_offset BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

-- Table for incoming messages
CREATE TABLE public.telegram_messages (
  update_id BIGINT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  text TEXT,
  raw_update JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_messages_chat_id ON public.telegram_messages (chat_id);

ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view telegram messages"
ON public.telegram_messages FOR SELECT TO authenticated USING (true);
