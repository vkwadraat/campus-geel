import { useState, type FormEvent } from "react";
import { supabase, isKuLeuvenEmail } from "./lib/supabase.ts";

type Mode = "login" | "register" | "reset";

const DOMAIN_ERROR = "Gebruik je KU Leuven-mailadres (@student.kuleuven.be of @kuleuven.be).";

function translateError(message: string) {
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) return "Onjuist e-mailadres of wachtwoord.";
  if (m.includes("email not confirmed")) return "Bevestig eerst je e-mailadres via de link in je mailbox.";
  if (m.includes("already registered")) return "Dit e-mailadres heeft al een account. Log in.";
  if (m.includes("password should be")) return "Je wachtwoord moet minstens 8 tekens hebben.";
  if (m.includes("database error")) return DOMAIN_ERROR;
  if (m.includes("rate limit")) return "Te veel pogingen. Probeer het over enkele minuten opnieuw.";

  return "Er ging iets mis. Probeer het opnieuw.";
}

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setInfo("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");

    // Netjes melden in de browser; de echte controle gebeurt in Supabase.
    if (!isKuLeuvenEmail(email)) {
      setError(DOMAIN_ERROR);
      return;
    }

    if (mode !== "reset" && password.length < 8) {
      setError("Je wachtwoord moet minstens 8 tekens hebben.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }

      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;

        // Met e-mailbevestiging aan is er nog geen sessie.
        if (!data.session) {
          setInfo("Check je mailbox en klik op de bevestigingslink om je account te activeren.");
        }
      }

      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setInfo("Als dit adres bestaat, ontvang je een mail om je wachtwoord te wijzigen.");
      }
    } catch (err) {
      setError(translateError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "login" ? "Inloggen" : mode === "register" ? "Account maken" : "Wachtwoord vergeten";

  const submitLabel =
    mode === "login" ? "Inloggen" : mode === "register" ? "Account maken" : "Stuur resetlink";

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit} noValidate>
        <div className="login-brand">
          <span className="login-mark" aria-hidden="true">🎓</span>
          <strong>Studico</strong>
        </div>

        <h1>{title}</h1>
        <p className="login-sub">
          Alleen voor studenten en medewerkers van KU Leuven.
        </p>

        <label>
          <span>KU Leuven-mailadres</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="r0123456@student.kuleuven.be"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        {mode !== "reset" && (
          <label>
            <span>Wachtwoord</span>
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="Minstens 8 tekens"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}

        {error && <div className="login-error" role="alert">{error}</div>}
        {info && <div className="login-info" role="status">{info}</div>}

        <button type="submit" className="primary-button login-submit" disabled={busy}>
          {busy ? "Even geduld…" : submitLabel}
        </button>

        <div className="login-links">
          {mode === "login" && (
            <>
              <button type="button" onClick={() => switchMode("register")}>
                Nog geen account? Maak er een
              </button>
              <button type="button" onClick={() => switchMode("reset")}>
                Wachtwoord vergeten
              </button>
            </>
          )}

          {mode !== "login" && (
            <button type="button" onClick={() => switchMode("login")}>
              Terug naar inloggen
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
