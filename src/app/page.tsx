"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import dynamic from "next/dynamic";
import { ArrowUpRight, BookOpen, Braces, CheckCircle2, ChevronRight, CircleDashed, Code2, FileCode2, FileText, History, LoaderCircle, LogOut, Moon, RefreshCw, Search, Send, Sun, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const CodeEditor = dynamic(() => import("@/components/code-editor").then((module) => module.CodeEditor), { ssr: false });

type Theme = "dark" | "light";
type Task = { name: string; score: number | null; maxScore: number | null; pending: boolean };
type Overview = { authenticated: boolean; tasks: Task[]; total: number | null; maxTotal: number | null; error?: string };
type Submission = { id: string; at: string; status: string; score: number | null; maxScore: number | null; pending: boolean };
type TaskDetail = { task: string; submissions: Submission[] };
type ResultDetails = { task: string; id: string; compilation: string; testcases: { index: string; outcome: string; message: string; kind: string }[] };
type Draft = { code: string; filename: string };
const CONTEST = "OCOM2569";
const DRAFT_KEY = "ocom2569-code-drafts";

function formatScore(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function Home() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<Theme>("dark");
  const [themeReady, setThemeReady] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [draftsReady, setDraftsReady] = useState(false);
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [watching, setWatching] = useState<{ task: string; priorId: string | null; until: number } | null>(null);
  const [resultDetails, setResultDetails] = useState<ResultDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const activeTaskRef = useRef<string | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setThemeReady(true);
    try { const stored = localStorage.getItem(DRAFT_KEY); if (stored) setDrafts(JSON.parse(stored)); } catch { /* Ignore invalid local drafts. */ }
    setDraftsReady(true);
  }, []);
  useEffect(() => { if (themeReady) { document.documentElement.classList.toggle("dark", theme === "dark"); localStorage.setItem("grader-theme", theme); } }, [theme, themeReady]);
  useEffect(() => { if (draftsReady) localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts)); }, [drafts, draftsReady]);
  useEffect(() => { activeTaskRef.current = activeTask; setSubmitMessage(""); setWatching(null); }, [activeTask]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/overview", { cache: "no-store" });
      const result = await response.json() as Overview;
      setOverview(result);
      if (response.ok && result.tasks.length) setActiveTask((current) => result.tasks.some((task) => task.name === current) ? current : result.tasks[0].name);
      if (response.status === 401) { setActiveTask(null); setTaskDetail(null); }
    } catch { setOverview({ authenticated: false, tasks: [], total: null, maxTotal: null, error: "Cannot reach the wrapper server." }); }
    finally { setLoading(false); }
  }, []);

  const loadTask = useCallback(async (task: string): Promise<TaskDetail | null> => {
    setTaskLoading(true);
    try {
      const response = await fetch(`/api/task?task=${encodeURIComponent(task)}`, { cache: "no-store" });
      const result = await response.json() as TaskDetail;
      if (!response.ok) return null;
      if (activeTaskRef.current === task) setTaskDetail(result);
      return result;
    } catch { return null; }
    finally { if (activeTaskRef.current === task) setTaskLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (overview?.authenticated && activeTask) { activeTaskRef.current = activeTask; setTaskDetail(null); void loadTask(activeTask); } }, [activeTask, overview?.authenticated, loadTask]);
  useEffect(() => {
    if (!watching) return;
    const interval = window.setInterval(async () => {
      if (Date.now() > watching.until) { setWatching(null); return; }
      const result = await loadTask(watching.task);
      const newest = result?.submissions[0];
      if (newest && newest.id !== watching.priorId && !newest.pending) { setWatching(null); void refresh(); setSubmitMessage("Grading finished. Your score is up to date."); }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [watching, loadTask, refresh]);

  const tasks = overview?.tasks ?? [];
  const filtered = useMemo(() => tasks.filter((task) => task.name.toLowerCase().includes(query.toLowerCase())), [tasks, query]);
  const selected = tasks.find((task) => task.name === activeTask);
  const draft = activeTask ? drafts[activeTask] ?? { code: "", filename: `${activeTask}.cpp` } : { code: "", filename: "main.cpp" };
  const graded = tasks.filter((task) => task.score !== null).length;
  const perfect = tasks.filter((task) => task.score !== null && task.maxScore !== null && task.score >= task.maxScore).length;
  const progress = overview?.total !== null && overview?.total !== undefined && overview.maxTotal ? Math.min(100, Math.max(0, overview.total / overview.maxTotal * 100)) : 0;

  function updateDraft(patch: Partial<Draft>) {
    if (!activeTask) return;
    setDrafts((current) => ({ ...current, [activeTask]: { code: current[activeTask]?.code ?? "", filename: current[activeTask]?.filename ?? `${activeTask}.cpp`, ...patch } }));
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginBusy(true); setLoginError("");
    try {
      const response = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setLoginError(result.error ?? "Could not sign in."); return; }
      setPassword("");
      await refresh();
    } catch { setLoginError("The grader is unavailable on this network."); }
    finally { setLoginBusy(false); }
  }

  async function signOut() {
    await fetch("/api/logout", { method: "POST" });
    setOverview({ authenticated: false, tasks: [], total: null, maxTotal: null });
    setActiveTask(null); setTaskDetail(null); setPassword("");
  }

  async function uploadCode(file: File | undefined) {
    if (!file) return;
    if (!/\.(?:cpp|cc|cxx|c\+\+|C)$/.test(file.name)) { setSubmitMessage("Choose a C++ source file (.cpp, .cc, .cxx, .c++, or .C)."); return; }
    if (file.size > 2_000_000) { setSubmitMessage("Source file is larger than 2 MB."); return; }
    updateDraft({ code: await file.text(), filename: file.name });
    setSubmitMessage(`${file.name} loaded into the editor.`);
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTask || !draft.code.trim() || submitting) return;
    setSubmitting(true); setSubmitMessage("");
    const priorId = taskDetail?.submissions[0]?.id ?? null;
    try {
      const form = new FormData();
      form.set("task", activeTask); form.set("code", draft.code); form.set("filename", draft.filename);
      const response = await fetch("/api/submit", { method: "POST", body: form });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setSubmitMessage(result.error ?? "The submission failed."); return; }
      setSubmitMessage("Submitted to CMS. Waiting for grading…");
      setWatching({ task: activeTask, priorId, until: Date.now() + 90_000 });
      void loadTask(activeTask);
    } catch { setSubmitMessage("Could not reach the grader. Try again."); }
    finally { setSubmitting(false); }
  }

  async function openDetails(id: string) {
    if (!activeTask) return;
    setResultDetails(null); setDetailsLoading(true); setDetailsOpen(true);
    try {
      const response = await fetch(`/api/details?task=${encodeURIComponent(activeTask)}&id=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (response.ok) setResultDetails(await response.json() as ResultDetails);
    } finally { setDetailsLoading(false); }
  }

  function switchTheme(event: React.MouseEvent<HTMLButtonElement>) {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const viewDocument = document as Document & { startViewTransition?: (update: () => void) => { ready: Promise<void> } };
    if (!viewDocument.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setTheme(next); return; }
    const x = event.clientX || window.innerWidth / 2;
    const y = event.clientY || window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = viewDocument.startViewTransition(() => { flushSync(() => setTheme(next)); document.documentElement.classList.toggle("dark", next === "dark"); });
    void transition.ready.then(() => document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { duration: 450, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" }));
  }

  return <div className="contest-app">
    <aside className="task-sidebar">
      <div className="contest-brand"><span className="contest-brand-mark"><Braces size={17} /></span><div><strong>OCOM2569</strong><span>Contest workspace</span></div></div>
      <div className="sidebar-intro"><div className="sidebar-kicker">Total score</div><div className="total-score" key={overview?.total ?? "empty"}>{loading && !overview ? <LoaderCircle className="animate-spin" /> : formatScore(overview?.total ?? null)}<span>/ {formatScore(overview?.maxTotal ?? null)}</span></div><div className="progress-track" role="progressbar" aria-label="Total score progress" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div><p>{overview?.authenticated ? `${graded} scored · ${perfect} full score` : "Sign in to see your progress"}</p></div>
      <div className="sidebar-list-head"><strong>Problems</strong><span>{tasks.length}</span></div>
      {tasks.length > 6 && <div className="sidebar-search"><Search size={15} /><Input aria-label="Search problems" placeholder="Search problems" value={query} onChange={(event) => setQuery(event.target.value)} /></div>}
      <div className="task-list">{filtered.map((task) => <button type="button" className={`task-item ${task.name === activeTask ? "selected" : ""}`} key={task.name} onClick={() => setActiveTask(task.name)}><span className="task-index">{String(tasks.indexOf(task) + 1).padStart(2, "0")}</span><span className="task-label"><strong>{task.name}</strong><small>{task.score === null ? "No score yet" : `${formatScore(task.score)} / ${formatScore(task.maxScore)}`}</small></span>{task.score !== null && task.maxScore !== null && task.score >= task.maxScore ? <CheckCircle2 className="task-state complete" size={15} /> : <CircleDashed className="task-state" size={15} />}</button>)}{!filtered.length && <div className="task-list-empty">{loading ? "Loading problems…" : tasks.length ? "No matching problems." : "Problems appear after login."}</div>}</div>
    </aside>

    <div className="content-column">
      <header className="contest-header"><div className="breadcrumb"><span>Contest</span><ChevronRight size={14} /><strong>{selected?.name ?? CONTEST}</strong></div><div className="contest-header-actions">{overview?.authenticated && <Badge className="contest-connection"><span className="connection-dot" /> Connected</Badge>}<Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button>{overview?.authenticated && <Button variant="ghost" size="sm" onClick={() => void signOut()}><LogOut /> Sign out</Button>}<Button variant="outline" size="icon" className="theme-button" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"} onClick={switchTheme}>{theme === "dark" ? <Sun /> : <Moon />}</Button></div></header>
      <main className="contest-main">
        {!overview?.authenticated ? <Card className="login-card"><div className="login-icon"><Code2 size={23} /></div><h1>Sign in to OCOM2569</h1><p>Use your existing grader account.</p><form onSubmit={signIn}><label htmlFor="username">Username</label><Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /><label htmlFor="password">Password</label><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />{loginError && <div className="form-error" role="alert">{loginError}</div>}<Button className="login-submit" type="submit" disabled={loginBusy}>{loginBusy ? <LoaderCircle className="animate-spin" /> : null} Sign in</Button></form></Card> : <>
          <Card className="page-heading"><div className="page-heading-copy"><div className="heading-icon"><BookOpen size={20} /></div><div><h1>{selected?.name ?? CONTEST}</h1><p>Read the task, write C++, and submit from here.</p></div></div>{selected && <div className="task-score-box"><span>Task score</span><strong>{formatScore(selected.score)} <small>/ {formatScore(selected.maxScore)}</small></strong></div>}</Card>
          {overview.error && <div className="connection-error" role="alert">{overview.error}</div>}
          {activeTask && <><div className="workspace-grid">
            <Card className="work-panel statement-panel"><div className="work-panel-head"><div><FileText size={16} /><strong>Statement</strong><span>Official PDF</span></div><Button variant="ghost" size="sm" asChild><a href={`/api/statement?task=${encodeURIComponent(activeTask)}`} target="_blank" rel="noopener noreferrer"><ArrowUpRight /> Open</a></Button></div><iframe title={`${activeTask} statement PDF`} key={activeTask} src={`/api/statement?task=${encodeURIComponent(activeTask)}`} className="statement-frame" /></Card>
            <div className="right-stack"><Card className="work-panel editor-panel"><div className="work-panel-head"><div><FileCode2 size={16} /><strong>Solution</strong><span>C++11 / g++</span></div><Button variant="outline" size="sm" onClick={() => uploadRef.current?.click()}><Upload /> Upload .cpp</Button></div><form onSubmit={submitCode} className="editor-form"><div className="editor-meta"><span>{draft.filename}</span><span>Draft saved in this browser</span></div><CodeEditor task={activeTask} value={draft.code} theme={theme} onChange={(code) => updateDraft({ code })} /><div className="editor-footer"><span>{draft.code.split("\n").length} lines · {new TextEncoder().encode(draft.code).length.toLocaleString()} bytes</span><Button type="submit" disabled={submitting || !draft.code.trim()}>{submitting ? <LoaderCircle className="animate-spin" /> : <Send />} Submit to grader</Button></div>{submitMessage && <div className="submit-message" role="status">{submitMessage}</div>}</form></Card>
            <Card className="history-panel"><div className="work-panel-head"><div><History size={16} /><strong>Submissions</strong><span>{taskDetail?.submissions.length ?? 0} entries</span></div><Button variant="ghost" size="sm" onClick={() => void loadTask(activeTask)} disabled={taskLoading}><RefreshCw className={taskLoading ? "animate-spin" : ""} /> Refresh</Button></div><div className="history-scroll"><table className="history-table"><thead><tr><th>ID</th><th>Submitted</th><th>Status</th><th className="number">Score</th><th></th></tr></thead><tbody>{taskDetail?.submissions.length ? taskDetail.submissions.map((submission) => <tr key={submission.id}><td className="mono">#{submission.id}</td><td>{submission.at}</td><td><span className={`status ${submission.pending ? "pending" : ""}`}>{submission.status || "Waiting"}</span></td><td className="number mono">{submission.score === null ? "—" : `${formatScore(submission.score)} / ${formatScore(submission.maxScore)}`}</td><td className="number"><Button variant="ghost" size="sm" onClick={() => void openDetails(submission.id)}>Details</Button></td></tr>) : <tr><td colSpan={5} className="empty-history">{taskLoading ? "Loading submissions…" : "No submissions for this problem yet."}</td></tr>}</tbody></table></div></Card></div></div></>}
        </>}
      </main>
    </div>
    <input ref={uploadRef} className="hidden" type="file" accept=".cpp,.cc,.cxx,.c++,.C" onChange={(event) => { void uploadCode(event.target.files?.[0]); event.target.value = ""; }} />
    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}><DialogContent className="result-dialog"><DialogHeader><DialogTitle>Submission details</DialogTitle><DialogDescription>{resultDetails ? `${resultDetails.task} · #${resultDetails.id}` : "Loading result details"}</DialogDescription></DialogHeader>{detailsLoading ? <div className="details-loading"><LoaderCircle className="animate-spin" /> Loading details…</div> : resultDetails ? <><p className="compilation">Compilation: <strong>{resultDetails.compilation || "No output"}</strong></p><div className="testcase-scroll"><table className="history-table"><thead><tr><th>Test</th><th>Outcome</th><th>Details</th></tr></thead><tbody>{resultDetails.testcases.map((testcase, index) => <tr key={`${testcase.index}-${index}`}><td className="mono">{testcase.index}</td><td className={testcase.kind === "correct" ? "correct-outcome" : ""}>{testcase.outcome}</td><td>{testcase.message}</td></tr>)}</tbody></table></div></> : <p className="details-loading">Details are unavailable.</p>}</DialogContent></Dialog>
  </div>;
}
