import { useState } from "react";
import "./TestCaseViewer.css";

export default function TestCaseViewer({ testCases = [], results = [] }) {
  const [active, setActive] = useState(0);

  if (!testCases.length) {
    return <p className="text-dim">No sample test cases provided.</p>;
  }

  const current = testCases[active];
  const currentResult = results[active];

  return (
    <div className="testcase-viewer">
      <div className="testcase-tabs">
        {testCases.map((_, idx) => (
          <button
            key={idx}
            className={`testcase-tab ${idx === active ? "active" : ""}`}
            onClick={() => setActive(idx)}
          >
            Case {idx + 1}
            {results[idx] && (
              <span
                className={`tc-dot ${results[idx].passed ? "pass" : "fail"}`}
              />
            )}
          </button>
        ))}
      </div>

      <div className="testcase-body">
        <div className="testcase-block">
          <span className="testcase-label">Input</span>
          <pre className="mono testcase-pre">{current.input}</pre>
        </div>
        <div className="testcase-block">
          <span className="testcase-label">Expected Output</span>
          <pre className="mono testcase-pre">{current.expected}</pre>
        </div>

        {currentResult && (
          <div className="testcase-block">
            <span className="testcase-label">Your Output</span>
            <pre
              className={`mono testcase-pre ${currentResult.passed ? "pass" : "fail"}`}
            >
              {currentResult.actual}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
