import { supabase } from "./supabase";
import type { CourseMaterial, MaterialStatus, MaterialType } from "../data/curriculum";

const BUCKET = "materials";
const URL_LIFETIME_SECONDS = 60 * 60;

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

/** Haalt materiaal op. De beveiliging in Supabase bepaalt wat jij te zien krijgt. */
export async function fetchMaterials(): Promise<CourseMaterial[]> {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Row[];
  const urls = new Map<string, string>();

  if (rows.length > 0) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(
        rows.map((r) => r.file_path),
        URL_LIFETIME_SECONDS
      );

    signed?.forEach((item) => {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    });
  }

  return rows.map((row) => toMaterial(row, urls.get(row.file_path) ?? ""));
}

export async function uploadMaterial(input: NewMaterialInput): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Niet ingelogd");

  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userData.user.id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.file, { contentType: input.file.type || undefined });

  if (uploadError) throw uploadError;

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
    file_path: path,
  });

  if (insertError) {
    // Geen losse bestanden achterlaten als de database-rij mislukt.
    await supabase.storage.from(BUCKET).remove([path]);
    throw insertError;
  }
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

  if (row?.file_path) {
    await supabase.storage.from(BUCKET).remove([row.file_path]);
  }
}