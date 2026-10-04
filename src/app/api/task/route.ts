import { CONTEST, extractSubmissions, extractTaskScore, fetchCms, isLoginPage } from "@/lib/cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const task = new URL(request.url).searchParams.get("task") ?? "";
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(task)) return Response.json({ error: "Invalid problem." }, { status: 400 });
  try {
    const response = await fetchCms(`/${CONTEST}/tasks/${encodeURIComponent(task)}/submissions`, request.headers.get("cookie") ?? "");
    const html = await response.text();
    if (isLoginPage(html)) return Response.json({ error: "Sign in to the grader." }, { status: 401 });
    if (!response.ok) return Response.json({ error: "Could not load submissions." }, { status: 502 });
    return Response.json({ task, score: extractTaskScore(task, html), submissions: extractSubmissions(html) }, { headers: { "cache-control": "no-store" } });
  } catch { return Response.json({ error: "The grader is unavailable." }, { status: 502 }); }
}
