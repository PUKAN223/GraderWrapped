# GraderWrapped

> A focused contest workspace for **OCOM2569**, bringing task statements, C++ submissions, grading results, and progress into one interface.

## ✦ About

**GraderWrapped** is a Next.js wrapper around the existing CMS contestant grader. It does not replace the grader: sign-in, tasks, submissions, and scores all come from CMS.

The goal is to make contest work feel less fragmented. Read the official statement, write a solution, submit it, and follow the result without switching between pages.

---

## ✦ Features

### Contest Overview

* Sign in with an existing CMS contestant account
* Browse and search contest tasks
* See each task's public score and the summed total
* Track graded and full-score tasks

### Problem Workspace

* Read the official PDF statement inline or open it in a new tab
* Write C++ in a Monaco-based editor
* Upload a C++ source file into the editor
* Keep per-task drafts in the current browser's local storage
* Submit solutions directly to CMS

### Grading Results

* View submission history and scores
* Open compilation and testcase details
* Refresh results automatically after a submission finishes grading

### Interface

* Responsive layout
* Light and dark themes
* Locally served Monaco assets; no editor CDN required

---

## ✦ Tech Stack

| Technology | Purpose |
| --- | --- |
| **Next.js** | App Router and server-side API routes |
| **React** | Contest interface |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **shadcn/ui and Radix UI** | UI components |
| **Monaco Editor** | C++ editing |
| **Lucide React** | Icons |
| **Bun** | Package management and local scripts |

---

## ✦ Architecture

```text
GraderWrapped
│
├── Contest UI
│   ├── Task list and total score
│   ├── PDF statement
│   ├── C++ editor and browser-local drafts
│   └── Submission history and details
│
├── Next.js API routes
│   ├── Login and logout
│   ├── Overview and task data
│   ├── Statement and result details
│   └── Submission forwarding
│
└── Existing CMS grader
    ├── Contestant authentication
    ├── Tasks and statements
    └── Grading and scores
```

---

## ✦ Project Structure

```text
src/
├── app/
│   ├── api/          # CMS-facing server routes
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx      # Contest workspace
├── components/
│   ├── code-editor.tsx
│   └── ui/
└── lib/
    └── cms.ts        # CMS URL, session, and HTML helpers

public/monaco/        # Editor assets copied during installation
```

---

## ✦ Getting Started

### Requirements

* Bun and a supported Node.js version for Next.js
* Network access from the **server running GraderWrapped** to the CMS grader
* An existing OCOM2569 contestant account

### Installation

```bash
git clone https://github.com/PUKAN223/GraderWrapped.git
cd GraderWrapped
bun install
```

### Development

```bash
bun run dev
```

Open `http://localhost:3000`. Other devices on the same LAN can use `http://<server-ip>:3000`.

---

## ✦ Environment Variables

`CMS_ORIGIN` is the server-side origin of the CMS grader. It defaults to `http://10.0.2.177:8888`.

```bash
CMS_ORIGIN=http://10.0.2.177:8888 bun run dev
```

For a persistent local setting, add `CMS_ORIGIN=http://10.0.2.177:8888` to `.env.local`. Do not commit secrets or private configuration. The browser calls GraderWrapped's API routes; those routes contact CMS.

---

## ✦ Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the development server |
| `bun run build` | Build the production app with Webpack |
| `bun run start` | Start the production server |
| `bun run typecheck` | Run TypeScript checks |

The `postinstall` script copies Monaco files into `public/monaco`. If install scripts were skipped, run `bun run postinstall` before building. Webpack is used because Turbopack's CSS worker could not open a local port in the development environment.

---

## ✦ Deployment

GraderWrapped is a Next.js app and can be built for Vercel, but **a Vercel deployment cannot reach the default `10.0.2.177` LAN address**. Its server-side API routes must be able to reach the CMS origin for login, statements, scores, and submissions to work.

To deploy on Vercel, provide a CMS endpoint reachable from the deployment and set `CMS_ORIGIN` in the Vercel project's environment variables. Protect that endpoint appropriately; do not expose an unauthenticated grader to the public internet. If CMS must stay LAN-only, run GraderWrapped on a machine on the same LAN instead.

---

## ✦ Data & Sessions

CMS remains the source of truth for accounts, tasks, statements, submissions, and scores. GraderWrapped forwards the CMS session through its own HTTP-only cookies. Code drafts and theme preference are stored only in the browser; the project does not store them in a database.

---

## ✦ Author

**Pukan** · [GitHub](https://github.com/PUKAN223)
