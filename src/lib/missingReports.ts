import { supabase } from "./supabase";

/**
 * Melding van een student dat er iets ontbreekt (een vak, een opleiding,
 * een campus, …). Wordt opgeslagen in de Supabase-tabel `missing_reports`.
 * Alleen moderators kunnen de meldingen nadien lezen (zie SQL + RLS).
 */
export type NewMissingReport = {
  kind: string; // "vak" | "opleiding" | "campus" | "anders"
  description: string;
  context?: string; // waar de student was (campus · opleiding)
  email?: string;
};

export async function submitMissingReport(input: NewMissingReport): Promise<void> {
  const { error } = await supabase.from("missing_reports").insert({
    kind: input.kind,
    description: input.description,
    context: input.context ?? null,
    email: input.email ?? null,
    // created_by en created_at worden door de database ingevuld (defaults).
  });

  if (error) throw error;
}
