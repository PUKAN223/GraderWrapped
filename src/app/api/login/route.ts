import { browserCookie, CONTEST, cookieHeader, fetchCms, formToken } from "@/lib/cms";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let credentials: { username?: string; password?: string };
  try { credentials = await request.json(); }
  catch { return Response.json({ error: "Invalid login request." }, { status: 400 }); }
  const username = credentials.username?.trim() ?? "";
  const password = credentials.password ?? "";
  if (!username || !password) return Response.json({ error: "Enter your username and password." }, { status: 400 });
  try {
    const loginPage = await fetchCms(`/${CONTEST}`, "");
    const token = formToken(await loginPage.text());
    if (!token) return Response.json({ error: "Could not start a grader login session." }, { status: 502 });
    const bootstrapCookies = loginPage.headers.getSetCookie();
    const body = new URLSearchParams({ username, password, _xsrf: token });
    const result = await fetchCms(`/${CONTEST}/login`, cookieHeader("", bootstrapCookies), { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    const loginCookies = result.headers.getSetCookie();
    const authenticated = loginCookies.some((cookie) => /^OCOM2569_login=(?!""|;)/.test(cookie));
    if (!authenticated) return Response.json({ error: "Login failed. Check your username and password." }, { status: 401 });
    const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
    for (const cookie of [...bootstrapCookies, ...loginCookies]) {
      if (/^(?:OCOM2569_login|_xsrf)=/.test(cookie)) headers.append("set-cookie", browserCookie(cookie));
    }
    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch { return Response.json({ error: "Cannot reach the grader on the local network." }, { status: 502 }); }
}
