import { CONTEST, extractTaskScore, extractTasks, fetchCms, isLoginPage, type TaskScore } from "@/lib/cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const cookie = request.headers.get("cookie") ?? "";
  let home: Response;
  try { home = await fetchCms(`/${CONTEST}`, cookie); }
  catch { return Response.json({ error: "The grader is unavailable on the local network." }, { status: 502 }); }
  const html = await home.text();
  if (isLoginPage(html)) return Response.json({ authenticated: false, tasks: [], total: null, maxTotal: null }, { status: 401 });
  if (!home.ok) return Response.json({ error: `The grader returned ${home.status}.` }, { status: 502 });
  const names = extractTasks(html);
  if (!names.length) return Response.json({ error: "No tasks were found on the grader page." }, { status: 502 });

  const tasks: TaskScore[] = [];
  for (let i = 0; i < names.length; i += 5) {
    const batch = await Promise.all(names.slice(i, i + 5).map(async (name) => {
      try {
        const response = await fetchCms(`/${CONTEST}/tasks/${encodeURIComponent(name)}/submissions`, cookie);
        if (!response.ok) return { name, score: null, maxScore: null, pending: true };
        return extractTaskScore(name, await response.text());
      } catch { return { name, score: null, maxScore: null, pending: true }; }
    }));
    tasks.push(...batch);
  }
  const complete = tasks.every((task) => task.score !== null && task.maxScore !== null);
  return Response.json({
    authenticated: true,
    tasks,
    total: complete ? tasks.reduce((sum, task) => sum + (task.score ?? 0), 0) : null,
    maxTotal: complete ? tasks.reduce((sum, task) => sum + (task.maxScore ?? 0), 0) : null,
    updatedAt: new Date().toISOString(),
  }, { headers: { "cache-control": "no-store" } });
}
