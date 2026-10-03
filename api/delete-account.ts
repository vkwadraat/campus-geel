// api/delete-account.ts
// Verwijdert het account van de ingelogde gebruiker: zijn bestanden in R2,
// zijn rijen in de database, zijn profiel en zijn login. Een gebruiker kan
// hiermee ALLEEN zichzelf verwijderen (de id komt uit zijn eigen login-token).
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
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

    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string;
    const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    // 1) Wie vraagt dit? (controle op het login-token)
    const userClient = createClient(url, anonKey);
    const { data: userData } = await userClient.auth.getUser(token);
    const user = userData.user;
    if (!user) return res.status(401).json({ error: "Niet ingelogd" });

    // 2) Admin-client (service role) om echt te kunnen verwijderen.
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3) Alle bestanden van deze gebruiker opzoeken en uit R2 wissen.
    const { data: rows } = await admin
      .from("materials")
      .select("file_path")
      .eq("uploaded_by", user.id);

    const keys = (rows ?? [])
      .map((r: any) => r.file_path)
      .filter((k: any): k is string => typeof k === "string" && k.length > 0);

    if (keys.length > 0) {
      await r2().send(
        new DeleteObjectsCommand({
          Bucket: process.env.R2_BUCKET as string,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        })
      );
    }

    // 4) Database opruimen: eerst het materiaal, dan het profiel.
    await admin.from("materials").delete().eq("uploaded_by", user.id);
    await admin.from("profiles").delete().eq("id", user.id);

    // 5) De login zelf verwijderen.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) throw delErr;

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Serverfout" });
  }
}
