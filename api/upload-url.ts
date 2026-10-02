// api/upload-url.ts
// Geeft een veilige, tijdelijke upload-link (presigned URL) voor Cloudflare R2.
// Draait als Vercel-functie op de server; de R2-sleutels blijven hier geheim.
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

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

async function getUser(req: any) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const sb = createClient(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string,
    (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) as string
  );
  const { data } = await sb.auth.getUser(token);
  return data.user ?? null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: "Niet ingelogd" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const fileName = String(body.fileName || "bestand");
    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${user.id}/${randomUUID()}-${safe}`;

    const url = await getSignedUrl(
      r2(),
      new PutObjectCommand({ Bucket: process.env.R2_BUCKET as string, Key: key }),
      { expiresIn: 600 } // 10 minuten om te uploaden
    );

    return res.status(200).json({ uploadUrl: url, key });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Serverfout" });
  }
}
