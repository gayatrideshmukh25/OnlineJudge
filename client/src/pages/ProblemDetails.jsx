import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import toast from "react-hot-toast";
import { FiPlay, FiSend } from "react-icons/fi";
import problemService from "../services/problemService";
import submissionService from "../services/submissionService";
import userCodeService from "../services/userCodeService";
import CodeEditor from "../components/CodeEditor.jsx";
import TestCaseViewer from "../components/TestCaseViewer.jsx";
import Loading from "../components/Loading.jsx";
import { DEFAULT_TEMPLATES } from "../utils/constants";
import { difficultyBadgeClass, statusBadgeClass } from "../utils/helpers";
import "./ProblemDetails.css";

export default function ProblemDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const userId = user?.id || user?._id || user?.user?.id || user?.user?._id;
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testCases, setTestCases] = useState([]);

  const [language, setLanguage] = useState("java");
  const [code, setCode] = useState(DEFAULT_TEMPLATES[language]);
  useEffect(() => {
    const loadUserCode = async () => {
      if (authLoading) return;

      if (!isAuthenticated) {
        setCode(DEFAULT_TEMPLATES[language]);
        return;
      }

      try {
        const result = await userCodeService.getUserCode({
          problemId: id,
          language,
        });
        console.log(result.userCode.code);
        if (result?.userCode?.code) {
          setCode(result.userCode.code);
        } else {
          setCode(DEFAULT_TEMPLATES[language]);
        }
      } catch (error) {
        console.error("Failed to load user code:", error);
        setCode(DEFAULT_TEMPLATES[language]);
      }
    };

    loadUserCode();
  }, [authLoading, id, isAuthenticated, language]);
  // const [code, setCode] = useState(() => {
  //   const savedCode = userCodeService.getUserCode({ problemId: id, language });
  //   // const savedCode = localStorage.getItem(`code-${userId}-${id}-${language}`);
  //   return savedCode?.code || DEFAULT_TEMPLATES[language];
  // });

  const handleLanguageChange = (lang) => {
    if (isAuthenticated) {
      userCodeService.saveUserCode({ problemId: id, language, code });
    }

    setLanguage(lang);
    setCode(DEFAULT_TEMPLATES[lang]);
  };

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [result, setResult] = useState(null);
  const [testResults, setTestResults] = useState([]);

  const requireLogin = () => {
    if (isAuthenticated) return true;

    toast.error("Please log in to run or submit code.");
    navigate("/login", { state: { from: location } });
    return false;
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    problemService
      .getProblemById(id)
      .then((data) => {
        if (mounted) {
          setProblem(data.problem ?? data);
          setTestCases(data.testCases ?? []);
        }
      })
      .catch(() => {
        if (mounted) setProblem(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleRun = async () => {
    if (!requireLogin()) return;

    setRunning(true);
    setConsoleOutput("Running against sample test cases…");
    setResult(null);
    setTestResults([]);

    try {
      const judgeResult = await submissionService.runCode({
        problemId: id,
        code,
        language,
      });
      console.log("RUN RESULT:", judgeResult);
      console.log("RUN TEST RESULTS:", judgeResult.result.testResults);

      setTestResults(judgeResult.result.testResults ?? []);

      setConsoleOutput(judgeResult.result.output || "Run complete.");
      setResult(judgeResult.result ?? judgeResult);
    } catch (err) {
      setConsoleOutput("Failed to run your code. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!requireLogin()) return;

    setSubmitting(true);

    setResult(null);
    setTestResults([]);
    setConsoleOutput("Submitting your solution…");

    try {
      // STEP 1: Create official submission
      const submission = await submissionService.createSubmission({
        problemId: id,
        code,
        language,
      });
      console.log("Submission created:", submission);

      const submissionId =
        submission.id ??
        submission._id ??
        submission.submission?.id ??
        submission.submission?._id;

      console.log("Submission ID:", submissionId);
      // STEP 2: Judge official submission
      const judgeResult = await submissionService.judgeSubmission(submissionId);
      console.log("Judge result:", judgeResult);
      console.log(
        "Judge test results:",
        judgeResult?.result?.testResults,
        judgeResult,
        judgeResult?.result?.status,
      );
      // STEP 3: Display result
      setResult(judgeResult);

      setTestResults(judgeResult.testResults ?? []);

      setConsoleOutput(judgeResult.output || "Submission judged.");

      // STEP 4: Toast
      if (judgeResult.result.status === "Accepted") {
        toast.success("Accepted! 🎉");
      } else {
        toast.error(judgeResult.status || "Submission failed");
      }
    } catch (err) {
      setConsoleOutput("Failed to submit your code.");
    } finally {
      setSubmitting(false);
    }
  };
  // const handleSubmit = async () => {
  //   setSubmitting(true);
  //   setResult(null);
  //   try {
  //     const submission = await submissionService.createSubmission({
  //       problemId: id,
  //       code,
  //       language,
  //       mode: "submit",
  //     });
  //     const judgeResult = await submissionService.judgeSubmission(
  //       submission.id ?? submission._id,
  //     );
  //     setResult(judgeResult);
  //     if (judgeResult.status === "Accepted") {
  //       toast.success("Accepted! 🎉");
  //     } else {
  //       toast.error(judgeResult.status || "Submission failed");
  //     }
  //   } catch (err) {
  //     // handled globally
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };

  if (loading) return <Loading fullscreen label="Loading problem…" />;

  if (!problem) {
    return (
      <div className="container empty-state">
        <h3>Problem not found</h3>
        <p>It may have been removed or the link is incorrect.</p>
      </div>
    );
  }

  return (
    <div className="container page-enter problem-details">
      <div className="pd-layout">
        <div className="pd-statement">
          <div className="pd-title-row">
            <h1>{problem.title}</h1>
            <span className={difficultyBadgeClass(problem.difficulty)}>
              {problem.difficulty}
            </span>
          </div>

          <div className="pd-tags">
            {(problem.tags ?? []).map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>

          <section className="pd-section">
            <h3>Description</h3>
            <p>{problem.description}</p>
          </section>

          {(problem.examples ?? []).map((ex, idx) => (
            <section key={idx} className="pd-section">
              <h3>Example {idx + 1}</h3>
              <pre className="mono pd-example">
                Input: {ex.input}
                Output: {ex.output}
                {ex.explanation ? `Explanation: ${ex.explanation}` : ""}
              </pre>
            </section>
          ))}

          <section className="pd-section">
            <h3>Constraints</h3>
            <ul className="pd-constraints">
              {(problem.constraints ?? []).map((c, idx) => (
                <li key={idx} className="mono">
                  {c}
                </li>
              ))}
            </ul>
          </section>

          <section className="pd-section">
            <h3>Sample Test Cases</h3>
            <TestCaseViewer testCases={testCases ?? []} results={testResults} />
          </section>
        </div>

        <div className="pd-workspace">
          <CodeEditor
            code={code}
            onChange={setCode}
            language={language}
            onLanguageChange={handleLanguageChange}
            height="440px"
          />

          <div className="pd-actions">
            <button
              className="btn btn-outline"
              onClick={handleRun}
              disabled={running || submitting}
            >
              <FiPlay /> {running ? "Running…" : "Run"}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={running || submitting}
            >
              <FiSend /> {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>

          <div className="window-card pd-console">
            <div className="window-chrome">
              <span className="window-dot red" />
              <span className="window-dot yellow" />
              <span className="window-dot green" />
              <span className="window-title">console output</span>
            </div>
            <pre className="mono pd-console-body">
              {consoleOutput || "Run your code to see output here."}
            </pre>
          </div>

          {result && (
            <div className="window-card pd-result">
              <div className="pd-result-header">
                <span className={statusBadgeClass(result.status)}>
                  {result.status}
                </span>
                <span className="text-dim mono">
                  {" "}
                  error: {result.error || "—"}
                </span>
                <span className="text-dim mono">
                  Runtime: {result.runtime ?? "—"} ms · Memory:{" "}
                  {result.memory ?? "—"} MB
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
