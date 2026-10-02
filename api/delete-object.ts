// api/delete-object.ts
// Verwijdert een bestand uit R2. Alleen moderators mogen dit.
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

function r2() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const header = req.headers.authorization || req.headers.Authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Niet ingelogd" });

    // Client met de token van de gebruiker -> is_moderator() draait als die gebruiker.
    const sb = createClient(
      (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string,
      (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) as string,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: userData } = await sb.auth.getUser(token);
    if (!userData.user) return res.status(401).json({ error: "Niet ingelogd" });

    const { data: isMod } = await sb.rpc("is_moderator");
    if (!isMod) return res.status(403).json({ error: "Geen moderator" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const key = String(body.key || "");
    if (!key) return res.status(400).json({ error: "Geen bestand opgegeven" });

    await r2().send(
      new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET as string, Key: key })
    );

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Serverfout" });
  }
}
