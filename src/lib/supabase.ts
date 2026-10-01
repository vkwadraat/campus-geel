import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    "Supabase-gegevens ontbreken. Maak een .env-bestand met VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { storage: window.sessionStorage },
});

/** Toegestaan: @student.kuleuven.be en @kuleuven.be */
export function isKuLeuvenEmail(email: string) {
  return /^[^\s@]+@(student\.)?kuleuven\.be$/i.test(email.trim());
}
