import { CONTEST, cookieHeader, fetchCms, formToken, isLoginPage } from "@/lib/cms";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let fields: FormData;
  try { fields = await request.formData(); }
  catch { return Response.json({ error: "Invalid submission." }, { status: 400 }); }
  const task = String(fields.get("task") ?? "");
  const code = String(fields.get("code") ?? "");
  const givenName = String(fields.get("filename") ?? "");
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(task)) return Response.json({ error: "Invalid problem." }, { status: 400 });
  if (!code.trim()) return Response.json({ error: "Paste or upload C++ code before submitting." }, { status: 400 });
  if (new TextEncoder().encode(code).byteLength > 2_000_000) return Response.json({ error: "Source file is larger than 2 MB." }, { status: 413 });
  const filename = givenName.trim().split(/[\\/]/).pop() || `${task}.cpp`;
  if (!/\.(?:cpp|cc|cxx|c\+\+|C)$/.test(filename)) return Response.json({ error: "Use a C++ source file (.cpp, .cc, .cxx, .c++, or .C)." }, { status: 400 });
  const cookie = request.headers.get("cookie") ?? "";
  try {
    const page = await fetchCms(`/${CONTEST}/tasks/${encodeURIComponent(task)}/submissions`, cookie);
    const html = await page.text();
    if (isLoginPage(html)) return Response.json({ error: "Your grader session expired. Sign in again." }, { status: 401 });
    if (!page.ok) return Response.json({ error: "Could not load the grader submission form." }, { status: 502 });
    const token = formToken(html);
    const inputTags = [...html.matchAll(/<input\b[^>]*type=["']file["'][^>]*>/gi)];
    const fileFields = inputTags.map((match) => match[0].match(/\bname=["']([^"']+)["']/i)?.[1]).filter((name): name is string => Boolean(name));
    if (!token || fileFields.length !== 1) return Response.json({ error: "This problem's submission format is not supported yet." }, { status: 422 });
    const languageSelect = html.match(/<select\b[^>]*name=["']language["'][^>]*>([\s\S]*?)<\/select>/i)?.[1] ?? "";
    if (!/value=["']C\+\+11 \/ g\+\+["']/.test(languageSelect)) return Response.json({ error: "C++11 is not available for this problem." }, { status: 422 });
    const upload = new FormData();
    upload.append("_xsrf", token);
    upload.append("language", "C++11 / g++");
    upload.append(fileFields[0], new Blob([code], { type: "text/plain" }), filename);
    const upstream = await fetchCms(`/${CONTEST}/tasks/${encodeURIComponent(task)}/submit`, cookieHeader(cookie, page.headers.getSetCookie()), { method: "POST", body: upload });
    if (upstream.status >= 300 && upstream.status < 400) return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
    const resultHtml = await upstream.text();
    const message = resultHtml.match(/<div\b[^>]*class=["'][^"']*alert-error[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return Response.json({ error: message || `The grader rejected the submission (${upstream.status}).` }, { status: 422 });
  } catch { return Response.json({ error: "Cannot reach the grader on the local network." }, { status: 502 }); }
}
