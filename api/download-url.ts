// api/download-url.ts
// Geeft voor een lijst bestanden tijdelijke download-/kijklinks (presigned URLs) uit R2.
// Alleen ingelogde gebruikers krijgen links.
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
    const items: Array<{ key: string; fileName?: string }> = Array.isArray(body.items)
      ? body.items
      : [];

    const client = r2();
    const bucket = process.env.R2_BUCKET as string;
    const urls: Record<string, string> = {};

    await Promise.all(
      items.map(async (it) => {
        if (!it || !it.key) return;
        const name = (it.fileName || "bestand").replace(/"/g, "");
        const url = await getSignedUrl(
          client,
          new GetObjectCommand({
            Bucket: bucket,
            Key: it.key,
            ResponseContentDisposition: `inline; filename="${name}"`,
          }),
          { expiresIn: 60 * 60 * 2 } // 2 uur geldig
        );
        urls[it.key] = url;
      })
    );

    return res.status(200).json({ urls });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Serverfout" });
  }
}
