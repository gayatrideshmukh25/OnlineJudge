import { useEffect, useState } from "react";
import { FiCheckCircle, FiTrendingUp, FiList } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import submissionService from "../services/submissionService";
import userService from "../services/userService";
import Sidebar from "../components/Sidebar.jsx";
import SubmissionTable from "../components/SubmissionTable.jsx";
import Loading from "../components/Loading.jsx";
import "./Dashboard.css";

export default function Dashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    submissionCount: 0,
    solvedCount: 0,
    acceptanceRate: 0,
    easy: { solved: 0, total: 0 },
    medium: { solved: 0, total: 0 },
    hard: { solved: 0, total: 0 },
  });

  useEffect(() => {
    let mounted = true;
    submissionService
      .getSubmissions({ limit: 5 })
      .then((data) => {
        if (mounted) setSubmissions(data.submissions ?? data ?? []);
      })
      .catch(() => {
        if (mounted) setSubmissions([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    userService.getUserStats().then((data) => {
      if (mounted) {
        setUserStats(data.stats ?? data ?? {});
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const stats = userStats ?? {
    submissionCount: 0,
    solvedCount: 0,
    acceptanceRate: 0,
    easy: { solved: 0, total: 0 },
    medium: { solved: 0, total: 0 },
    hard: { solved: 0, total: 0 },
  };

  return (
    <div className="container page-enter dashboard-page">
      <div className="dashboard-layout">
        <Sidebar />

        <div className="dashboard-content">
          <h1>Welcome back, {user?.username || "coder"} 👋</h1>
          <p className="text-dim dashboard-sub">
            Here's a snapshot of your progress.
          </p>

          <div className="stat-grid">
            <div className="stat-card">
              <FiCheckCircle
                className="stat-icon"
                style={{ color: "var(--success)" }}
              />
              <div>
                <p className="stat-value">{stats.solvedCount}</p>
                <p className="stat-label">Problems Solved</p>
              </div>
            </div>
            <div className="stat-card">
              <FiTrendingUp
                className="stat-icon"
                style={{ color: "var(--primary)" }}
              />
              <div>
                <p className="stat-value">{stats.acceptanceRate}%</p>
                <p className="stat-label">Acceptance Rate</p>
              </div>
            </div>
            <div className="stat-card">
              <FiList
                className="stat-icon"
                style={{ color: "var(--accent)" }}
              />
              <div>
                <p className="stat-value">{stats.submissionCount}</p>
                <p className="stat-label">Total Submissions</p>
              </div>
            </div>
          </div>

          {/* <div className="difficulty-grid">
            {[
              { label: "Easy", data: stats.easy, color: "var(--success)" },
              { label: "Medium", data: stats.medium, color: "var(--warning)" },
              { label: "Hard", data: stats.hard, color: "var(--danger)" },
            ].map((d) => {
              const pct =
                d.data.total > 0
                  ? Math.round((d.data.solved / d.data.total) * 100)
                  : 0;
              return (
                <div key={d.label} className="difficulty-card">
                  <div className="difficulty-top">
                    <span style={{ color: d.color }}>{d.label}</span>
                    <span className="mono text-dim">
                      {d.data.solved}/{d.data.total}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%`, background: d.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div> */}

          <h2 className="dashboard-subheading">Recent Submissions</h2>
          {loading ? (
            <Loading label="Loading submissions…" />
          ) : (
            <SubmissionTable submissions={submissions} />
          )}
        </div>
      </div>
    </div>
  );
}
