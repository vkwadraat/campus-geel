import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase.ts";
import Login from "./Login.tsx";
import App from "./App";
import "./login.css";

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Haal de moderatorstatus op zodra er een sessie is.
  useEffect(() => {
    if (!session) {
      setIsModerator(false);
      return;
    }
    supabase.rpc("is_moderator").then(({ data }) => setIsModerator(Boolean(data)));
  }, [session]);

  if (loading) {
    return <div className="auth-loading">Laden…</div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <App
      userEmail={session.user.email ?? ""}
      isModerator={isModerator}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}
