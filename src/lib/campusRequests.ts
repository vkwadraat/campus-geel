import { supabase } from "./supabase";

/**
 * Aanvraag van een andere campus om toegevoegd te worden aan BlokHub.
 * Wordt opgeslagen in de Supabase-tabel `campus_requests`.
 * Alleen moderators kunnen de aanvragen nadien lezen (zie SQL + RLS).
 */
export type NewCampusRequest = {
  campusName: string;
  contactName: string;
  email: string;
  programmes?: string;
  message?: string;
};

export async function submitCampusRequest(input: NewCampusRequest): Promise<void> {
  const { error } = await supabase.from("campus_requests").insert({
    campus_name: input.campusName,
    contact_name: input.contactName,
    email: input.email,
    programmes: input.programmes ?? null,
    message: input.message ?? null,
    // created_by en created_at worden door de database ingevuld (defaults).
  });

  if (error) throw error;
}
