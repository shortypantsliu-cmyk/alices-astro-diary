import { getStore } from "@netlify/blobs";

export default async (req) => {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const token = req.headers.get("x-diary-token");
  if (!process.env.DIARY_SECRET || token !== process.env.DIARY_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Key param ────────────────────────────────────────────────────────────────
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return new Response(JSON.stringify({ error: "Missing key" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const store = getStore("astro-diary");

  // ── GET ──────────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const value = await store.get(key);
    // Return empty defaults when the blob doesn't exist yet,
    // so the app gets [] for sessions and {} for images rather than null.
    const empty = key === "dso-images" ? "{}" : "[]";
    return new Response(value ?? empty, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── POST ─────────────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    const body = await req.text();
    await store.set(key, body);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/data" };
