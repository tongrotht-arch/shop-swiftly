import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramContextType {
  isTelegram: boolean;
  tgUser: TelegramUser | null;
  startParam: string | null;
  ready: boolean;
  authError: string | null;
}

const TelegramContext = createContext<TelegramContextType>({
  isTelegram: false,
  tgUser: null,
  startParam: null,
  ready: false,
  authError: null,
});

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [isTelegram, setIsTelegram] = useState(false);
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  const [startParam, setStartParam] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initData) {
      // Not inside Telegram
      setReady(true);
      return;
    }

    setIsTelegram(true);
    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user as TelegramUser | undefined;
    if (user) setTgUser(user);

    const sp = tg.initDataUnsafe?.start_param as string | undefined;
    if (sp) setStartParam(sp);

    // Authenticate via backend
    const authenticate = async () => {
      try {
        // Check if already authenticated
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          setReady(true);
          return;
        }

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/telegram-auth`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData }),
          }
        );

        const data = await response.json();
        if (!response.ok) {
          setAuthError(data.error ?? "Auth failed");
          setReady(true);
          return;
        }

        // Set session directly using the tokens from the backend
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionErr) {
          setAuthError(sessionErr.message);
        }
      } catch (err: any) {
        setAuthError(err.message);
      } finally {
        setReady(true);
      }
    };

    authenticate();
  }, []);

  return (
    <TelegramContext.Provider value={{ isTelegram, tgUser, startParam, ready, authError }}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  return useContext(TelegramContext);
}
