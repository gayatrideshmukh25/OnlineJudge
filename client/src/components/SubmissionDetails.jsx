import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiCpu,
  FiFileText,
} from "react-icons/fi";
import Loading from "./Loading.jsx";
import Sidebar from "./Sidebar.jsx";
import submissionService from "../services/submissionService";
import { formatDate, statusBadgeClass } from "../utils/helpers";
import "./SubmissionDetails.css";

export default function SubmissionDetails() {
  const { id } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setNotFound(false);
    submissionService
      .getSubmissionById(id)
      .then((data) => {
        if (mounted) setSubmission(data.submission ?? data);
      })
      .catch(() => {
        if (mounted) {
          setSubmission(null);
          setNotFound(true);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <Loading fullscreen label="Loading submission..." />;

  if (notFound || !submission) {
    return (
      <div className="container page-enter submission-details-page">
        <div className="empty-state">
          <h3>Submission not found</h3>
          <p>It may have been removed or the link is incorrect.</p>
          <Link to="/submissions" className="btn btn-outline">
            <FiArrowLeft /> Back to submissions
          </Link>
        </div>
      </div>
    );
  }
  const handleGetAIReview = async () => {
    try {
      setReviewLoading(true);

      const response = await aiService.getReview({
        submissionId: id,
      });

      setAiReview(response?.result ?? null);

      if (!response?.result) {
        toast.error("Review was not returned. Please try again.");
      } else {
        toast.success("AI review generated successfully!");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to generate AI review.",
      );
    } finally {
      setReviewLoading(false);
    }
  };
  const submissionId = submission.id ?? submission._id ?? id;
  const problem = submission.problem;

  return (
    <div className="container page-enter submission-details-page">
      <div className="dashboard-layout">
        <Sidebar />

        <main className="submission-details-content">
          <Link to="/submissions" className="back-link">
            <FiArrowLeft /> Back to submissions
          </Link>

          <div className="submission-details-heading">
            <div>
              <p className="eyebrow mono" style={{ marginBottom: 3 }}>
                SUBMISSION #{submissionId}
              </p>
              <br />
              {problem?.id && (
                <Link
                  to={`/problems/${problem.id}`}
                  className="problem-context-link"
                >
                  <h1>{problem?.title || "Submission details"}</h1>
                </Link>
              )}
              <p className="text-dim">
                Submitted {formatDate(submission.createdAt)}
              </p>
            </div>
            <span className={statusBadgeClass(submission.status)}>
              {submission.status || "Unknown"}
            </span>
          </div>

          <div className="submission-meta-grid">
            <div className="submission-meta-item">
              <FiFileText />
              <div>
                <span className="meta-label">Language</span>
                <strong className="mono">{submission.language || "—"}</strong>
              </div>
            </div>
            <div className="submission-meta-item">
              <FiClock />
              <div>
                <span className="meta-label">Runtime</span>
                <strong className="mono">
                  {submission.runtime != null
                    ? `${submission.runtime} ms`
                    : "—"}
                </strong>
              </div>
            </div>
            <div className="submission-meta-item">
              <FiCpu />
              <div>
                <span className="meta-label">Memory</span>
                <strong className="mono">
                  {submission.memory != null ? `${submission.memory} MB` : "—"}
                </strong>
              </div>
            </div>
            <div className="submission-meta-item">
              <FiCheckCircle />
              <div>
                <span className="meta-label">Test cases</span>
                <strong className="mono">
                  {submission.passed != null && submission.total != null
                    ? `${submission.passed} / ${submission.total} passed`
                    : "—"}
                </strong>
              </div>
            </div>
          </div>

          <section className="code-panel">
            <div className="code-panel-header">
              <h2>Submitted code</h2>
              <span className="mono text-dim">
                {submission.language || "code"}
              </span>
            </div>
            <pre className="submission-code">
              <code>{submission.code || "No code available."}</code>
            </pre>
          </section>
          <br />
          <section className="code-panel">
            <div className="code-panel-header">
              <h2>AI Review For Code</h2>
            </div>

            <div className="ai-review-content">
              {aiReview ? (
                <ReactMarkdown>{submission?.aiReview?.result}</ReactMarkdown>
              ) : (
                <div>
                  <p>AI review is not available for this submission.</p>

                  <button
                    type="button"
                    onClick={handleGetAIReview}
                    disabled={reviewLoading}
                  >
                    {reviewLoading ? "Generating Review..." : "Get AI Review"}
                  </button>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
