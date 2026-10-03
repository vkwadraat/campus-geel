import { supabase } from "./supabase";
import type { CourseMaterial, MaterialStatus, MaterialType } from "../data/curriculum";

// Bestanden staan nu op Cloudflare R2. De info over elk bestand (vak, titel,
// status, moderatie) blijft gewoon in Supabase staan, dus de beveiliging en
// moderatie zijn identiek aan vroeger. De eigenlijke uploads/downloads lopen
// via onze eigen /api-functies, die veilige tijdelijke links voor R2 maken.

export type NewMaterialInput = {
  courseId: string;
  courseName: string;
  courseCode: string;
  type: MaterialType;
  title: string;
  description?: string;
  file: File;
};

type Row = {
  id: string;
  course_id: string;
  course_name: string;
  course_code: string;
  type: MaterialType;
  title: string;
  description: string | null;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  file_path: string;
  uploaded_by: string;
  uploaded_at: string;
  status: MaterialStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

function toMaterial(row: Row, fileUrl: string): CourseMaterial {
  return {
    id: row.id,
    courseId: row.course_id,
    courseName: row.course_name,
    courseCode: row.course_code,
    type: row.type,
    title: row.title,
    description: row.description ?? undefined,
    fileName: row.file_name,
    fileType: row.file_type ?? undefined,
    fileSize: row.file_size ?? undefined,
    fileUrl,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    status: row.status,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
  } as CourseMaterial;
}

/** Authorization-header met het login-token, voor onze eigen /api-functies. */
async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Niet ingelogd");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/** Haalt materiaal op. De beveiliging in Supabase bepaalt wat jij te zien krijgt. */
export async function fetchMaterials(): Promise<CourseMaterial[]> {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return [];

  // Vraag in één keer download-/kijklinks op voor alle bestanden.
  let urls: Record<string, string> = {};
  try {
    const res = await fetch("/api/download-url", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        items: rows.map((r) => ({ key: r.file_path, fileName: r.file_name })),
      }),
    });
    if (res.ok) {
      const json = await res.json();
      urls = json.urls ?? {};
    }
  } catch {
    // Zonder links tonen we de items nog steeds; de link blijft dan leeg.
  }

  return rows.map((row) => toMaterial(row, urls[row.file_path] ?? ""));
}

export async function uploadMaterial(input: NewMaterialInput): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Niet ingelogd");

  // 1) Veilige upload-link van onze server.
  const linkRes = await fetch("/api/upload-url", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ fileName: input.file.name, fileType: input.file.type }),
  });
  if (!linkRes.ok) throw new Error("Kon geen upload-link aanmaken");
  const { uploadUrl, key } = await linkRes.json();

  // 2) Bestand rechtstreeks naar Cloudflare R2 (de browser zet zelf het juiste type).
  const put = await fetch(uploadUrl, { method: "PUT", body: input.file });
  if (!put.ok) throw new Error("Uploaden naar de opslag is mislukt");

  // 3) Info in Supabase bewaren (moderatie + beveiliging ongewijzigd).
  const { error: insertError } = await supabase.from("materials").insert({
    course_id: input.courseId,
    course_name: input.courseName,
    course_code: input.courseCode,
    type: input.type,
    title: input.title,
    description: input.description ?? null,
    file_name: input.file.name,
    file_type: input.file.type || null,
    file_size: input.file.size,
    file_path: key,
  });

  if (insertError) throw insertError;
}

/** Alleen moderators slagen hierin; voor anderen weigert Supabase het. */
export async function reviewMaterial(
  id: string,
  status: "approved" | "rejected",
  reason?: string
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("materials")
    .update({
      status,
      reviewed_by: userData.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      rejection_reason: status === "rejected" ? reason ?? null : null,
    })
    .eq("id", id)
    .select("id");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Geen toestemming of materiaal niet gevonden");
}

export async function removeMaterial(id: string): Promise<void> {
  const { data: row } = await supabase
    .from("materials")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabase.from("materials").delete().eq("id", id).select("id");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Geen toestemming of materiaal niet gevonden");

  // Bestand ook uit R2 verwijderen (moderator-only endpoint).
  if (row?.file_path) {
    try {
      await fetch("/api/delete-object", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ key: row.file_path }),
      });
    } catch {
      // De rij is al weg; een achtergebleven bestand is niet kritiek.
    }
  }
}

/** Verwijdert het eigen account volledig: bestanden, rijen, profiel en login. */
export async function deleteMyAccount(): Promise<void> {
  const res = await fetch("/api/delete-account", {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    let msg = "Verwijderen is mislukt";
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      // geen JSON-body; standaardmelding gebruiken
    }
    throw new Error(msg);
  }
}

/* ---------------------------------------------------------------------------
   LIKES — studenten kunnen materiaal "nuttig" vinden; meeste likes bovenaan.
   --------------------------------------------------------------------------- */

/** Haalt per materiaal het aantal likes op + welke de huidige gebruiker gaf. */
export async function fetchLikes(): Promise<{ counts: Record<string, number>; mine: string[] }> {
  const { data, error } = await supabase.from("material_likes").select("material_id, user_id");
  if (error || !data) return { counts: {}, mine: [] };

  const { data: userData } = await supabase.auth.getUser();
  const myId = userData.user?.id;

  const counts: Record<string, number> = {};
  const mine: string[] = [];
  for (const row of data as { material_id: string; user_id: string }[]) {
    counts[row.material_id] = (counts[row.material_id] ?? 0) + 1;
    if (myId && row.user_id === myId) mine.push(row.material_id);
  }
  return { counts, mine };
}

export async function likeMaterial(materialId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Niet ingelogd");
  const { error } = await supabase.from("material_likes").insert({ material_id: materialId });
  // Dubbele like (zelfde gebruiker) negeren we.
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
}

export async function unlikeMaterial(materialId: string): Promise<void> {
  const { error } = await supabase.from("material_likes").delete().eq("material_id", materialId);
  if (error) throw error;
}