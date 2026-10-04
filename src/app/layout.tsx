import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OCOM2569 — Contestant workspace",
  description: "Live CMS scores, submissions, and inline statements",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.classList.toggle('dark',(localStorage.getItem('grader-theme')||'dark')==='dark')}catch(e){document.documentElement.classList.add('dark')}" }} /></head><body>{children}</body></html>;
}
