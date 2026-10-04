"use client";

import Editor, { loader } from "@monaco-editor/react";

loader.config({ paths: { vs: "/monaco/vs" } });

type CodeEditorProps = {
  task: string;
  value: string;
  theme: "dark" | "light";
  onChange: (value: string) => void;
};

export function CodeEditor({ task, value, theme, onChange }: CodeEditorProps) {
  return <div className="code-editor" aria-label="C++ source code editor">
    <Editor
      path={`${task}.cpp`}
      language="cpp"
      value={value}
      theme={theme === "dark" ? "vs-dark" : "light"}
      onChange={(next) => onChange(next ?? "")}
      loading={<div className="editor-loading">Loading editor…</div>}
      options={{
        automaticLayout: true,
        minimap: { enabled: false },
        fontFamily: "JetBrains Mono, Fira Code, Consolas, monospace",
        fontSize: 13,
        lineHeight: 21,
        tabSize: 2,
        insertSpaces: true,
        scrollBeyondLastLine: false,
        renderLineHighlight: "line",
        smoothScrolling: true,
        padding: { top: 14, bottom: 14 },
      }}
    />
  </div>;
}
