export const CMS_ORIGIN = process.env.CMS_ORIGIN ?? "http://10.0.2.177:8888";
export const CONTEST = "OCOM2569";

export function cmsUrl(path: string): URL {
  return new URL(path, CMS_ORIGIN);
}

export function upstreamHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of ["cookie", "accept", "accept-language", "content-type", "user-agent", "x-requested-with"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

export async function fetchCms(path: string, cookie: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  return fetch(cmsUrl(path), { ...init, headers, cache: "no-store", redirect: "manual", signal: init.signal ?? AbortSignal.timeout(15000) });
}

export function isLoginPage(html: string): boolean {
  return /name=["']password["']/.test(html) && /\/OCOM2569\/login/.test(html);
}

export function extractTasks(html: string): string[] {
  return [...new Set([...html.matchAll(/\/OCOM2569\/tasks\/([^/"'?<>]+)\/submissions(?=["'?<>])/g)].map((match) => decodeURIComponent(match[1])))];
}

export type TaskScore = { name: string; score: number | null; maxScore: number | null; pending: boolean };

export function extractTaskScore(name: string, html: string): TaskScore {
  const scoreBlock = html.match(/<div\s+id=["']task_score_public["'][\s\S]*?<span\s+class=["']score["']>([\s\S]*?)<\/span>/i);
  const text = scoreBlock?.[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim() ?? "";
  const values = text.match(/([\d,]+(?:\.\d+)?)\s*\/\s*([\d,]+(?:\.\d+)?)/);
  return {
    name,
    score: values ? Number(values[1].replaceAll(",", "")) : null,
    maxScore: values ? Number(values[2].replaceAll(",", "")) : null,
    pending: /task_score_is_partial|loading\.gif/.test(scoreBlock?.[0] ?? "") || !values,
  };
}

export function extractStatementPath(task: string, html: string, descriptionUrl: URL): string | null {
  const href = html.match(/href=["']([^"']*\/statements\/[^"']+)["']/i)?.[1];
  if (!href) return null;
  const url = new URL(href.replaceAll("&amp;", "&"), descriptionUrl);
  if (url.origin !== descriptionUrl.origin || !url.pathname.startsWith(`/${CONTEST}/tasks/${encodeURIComponent(task)}/statements/`)) return null;
  return url.pathname + url.search;
}

export function formToken(html: string): string | null {
  return html.match(/<input\b[^>]*name=["']_xsrf["'][^>]*value=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<input\b[^>]*value=["']([^"']+)["'][^>]*name=["']_xsrf["']/i)?.[1]
    ?? null;
}

export function cookieHeader(existing: string, setCookies: string[]): string {
  const cookies = new Map<string, string>();
  for (const item of existing.split(/;\s*/)) {
    const equals = item.indexOf("=");
    if (equals > 0) cookies.set(item.slice(0, equals), item.slice(equals + 1));
  }
  for (const item of setCookies) {
    const pair = item.split(";", 1)[0];
    const equals = pair.indexOf("=");
    if (equals > 0) cookies.set(pair.slice(0, equals), pair.slice(equals + 1));
  }
  return [...cookies].map(([key, value]) => `${key}=${value}`).join("; ");
}

export function browserCookie(value: string): string {
  const withoutDomain = value.replace(/;\s*Domain=[^;]*/i, "");
  const withPath = /;\s*Path=/i.test(withoutDomain) ? withoutDomain.replace(/;\s*Path=[^;]*/i, "; Path=/") : `${withoutDomain}; Path=/`;
  return /;\s*HttpOnly/i.test(withPath) ? withPath : `${withPath}; HttpOnly; SameSite=Lax`;
}

export type SubmissionSummary = { id: string; at: string; status: string; score: number | null; maxScore: number | null; pending: boolean };

export function extractSubmissions(html: string): SubmissionSummary[] {
  const rows: SubmissionSummary[] = [];
  for (const match of html.matchAll(/<tr\b([^>]*\bdata-submission=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/tr>/gi)) {
    const attributes = match[1];
    const body = match[3];
    const cell = (name: string) => {
      const content = body.match(new RegExp(`<td\\b[^>]*class=["'][^"']*\\b${name}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/td>`, "i"))?.[1] ?? "";
      return content.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&#39;|&#x27;/gi, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    };
    const scoreText = cell("public_score");
    const values = scoreText.match(/([\d,]+(?:\.\d+)?)\s*\/\s*([\d,]+(?:\.\d+)?)/);
    const statusCode = attributes.match(/\bdata-status=["']([^"']+)["']/)?.[1] ?? "";
    rows.push({ id: match[2], at: cell("datetime"), status: cell("status").replace(/\s*details$/i, ""), score: values ? Number(values[1].replaceAll(",", "")) : null, maxScore: values ? Number(values[2].replaceAll(",", "")) : null, pending: statusCode !== "5" && statusCode !== "2" });
  }
  return rows;
}
