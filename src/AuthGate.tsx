import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase.ts";
import Login from "./Login.tsx";
import App from "./App";
import "./login.css";

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="auth-loading">Laden…</div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <App
      userEmail={session.user.email ?? ""}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}
