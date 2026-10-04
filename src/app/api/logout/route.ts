export async function POST(): Promise<Response> {
  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  headers.append("set-cookie", "OCOM2569_login=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  headers.append("set-cookie", "_xsrf=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  return new Response(JSON.stringify({ ok: true }), { headers });
}
