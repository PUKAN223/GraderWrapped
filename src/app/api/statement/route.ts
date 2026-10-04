import { cmsUrl, CONTEST, extractStatementPath, fetchCms, isLoginPage } from "@/lib/cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const task = new URL(request.url).searchParams.get("task") ?? "";
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(task)) return new Response("Invalid task", { status: 400 });
  const cookie = request.headers.get("cookie") ?? "";
  const path = `/${CONTEST}/tasks/${encodeURIComponent(task)}/description`;
  try {
    const description = await fetchCms(path, cookie);
    const html = await description.text();
    if (isLoginPage(html)) return new Response("Log in to the grader first.", { status: 401 });
    if (!description.ok) return new Response("Statement page unavailable.", { status: 502 });
    const statementPath = extractStatementPath(task, html, cmsUrl(path));
    if (!statementPath) return new Response("No PDF statement found for this task.", { status: 404 });
    const pdf = await fetchCms(statementPath, cookie);
    if (!pdf.ok) return new Response("Statement PDF unavailable.", { status: 502 });
    const contentType = pdf.headers.get("content-type") ?? "";
    if (/text\/html/i.test(contentType)) return new Response("The grader did not return a PDF.", { status: 502 });
    return new Response(pdf.body, { headers: { "content-type": "application/pdf", "content-disposition": "inline", "cache-control": "private, no-store" } });
  } catch { return new Response("Cannot reach the grader on the local network.", { status: 502 }); }
}
