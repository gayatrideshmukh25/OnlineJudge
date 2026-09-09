import Editor from "@monaco-editor/react";
import { FiChevronDown } from "react-icons/fi";
import { LANGUAGES } from "../utils/constants";
import "./CodeEditor.css";

export default function CodeEditor({
  code,
  onChange,
  language,
  onLanguageChange,
  height = "500px",
}) {
  const currentLang = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];

  return (
    <div className="window-card code-editor">
      <div className="window-chrome code-editor-chrome">
        <span className="window-dot red" />
        <span className="window-dot yellow" />
        <span className="window-dot green" />
        <span className="window-title">
          solution.
          {currentLang.id === "python"
            ? "py"
            : currentLang.id === "java"
              ? "java"
              : "cpp"}
        </span>

        <div className="lang-select-wrap">
          <select
            className="lang-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
          <FiChevronDown className="lang-select-icon" />
        </div>
      </div>

      <Editor
        key={currentLang.id}
        height={height}
        language={currentLang.monacoId}
        theme="vs-dark"
        value={code}
        onChange={(value) => onChange(value ?? "")}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 16 },
          automaticLayout: true,
          tabSize: 4,
        }}
      />
    </div>
  );
}
