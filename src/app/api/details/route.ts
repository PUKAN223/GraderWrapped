import { CONTEST, fetchCms, isLoginPage } from "@/lib/cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function textOf(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&#39;|&#x27;/gi, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const task = params.get("task") ?? "";
  const id = params.get("id") ?? "";
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(task) || !/^\d+$/.test(id)) return Response.json({ error: "Invalid submission." }, { status: 400 });
  try {
    const response = await fetchCms(`/${CONTEST}/tasks/${encodeURIComponent(task)}/submissions/${id}/details`, request.headers.get("cookie") ?? "");
    const html = await response.text();
    if (isLoginPage(html)) return Response.json({ error: "Sign in to the grader." }, { status: 401 });
    if (!response.ok) return Response.json({ error: "Result details are unavailable." }, { status: 502 });
    const testcaseRows = [...html.matchAll(/<tr\bclass=["']([^"']+)["'][^>]*>([\s\S]*?)(?=<tr\b|<\/tbody>)/gi)].map((match) => {
      const cell = (name: string) => textOf(match[2].match(new RegExp(`<td\\b[^>]*class=["']${name}["'][^>]*>([\\s\\S]*?)<\\/td>`, "i"))?.[1] ?? "");
      return { index: cell("idx"), outcome: cell("outcome"), message: cell("details"), kind: match[1] };
    }).filter((row) => row.index || row.outcome);
    const compilation = textOf(html.match(/<th>Compilation outcome:<\/th>\s*<td>([\s\S]*?)<\/td>/i)?.[1] ?? "");
    return Response.json({ task, id, compilation, testcases: testcaseRows }, { headers: { "cache-control": "no-store" } });
  } catch { return Response.json({ error: "The grader is unavailable." }, { status: 502 }); }
}
