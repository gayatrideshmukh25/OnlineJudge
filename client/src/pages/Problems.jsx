import { useEffect, useMemo, useState } from "react";
import { FiSearch, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import problemService from "../services/problemService";
import userService from "../services/userService";
import ProblemCard from "../components/ProblemCard.jsx";
import Loading from "../components/Loading.jsx";
import { DIFFICULTIES } from "../utils/constants";
import "./Problems.css";

const PAGE_SIZE = 9;

export default function Problems() {
  const { isAuthenticated } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [page, setPage] = useState(1);
  const [solvedProblemIds, setSolvedProblemIds] = useState(new Set());

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    problemService
      .getProblems()
      .then((data) => {
        if (mounted) setProblems(data.problems ?? data ?? []);
      })
      .catch(() => {
        if (mounted) setProblems([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    const token = localStorage.getItem("token");
    if (isAuthenticated) {
      userService.getUserStats().then((data) => {
        if (mounted) {
          setSolvedProblemIds(new Set(data.stats?.solvedProblemIds ?? []));
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return problems.filter((p) => {
      const matchesSearch = p.title
        ?.toLowerCase()
        .includes(search.toLowerCase());
      const matchesDifficulty =
        difficulty === "All" || p.difficulty === difficulty;
      return matchesSearch && matchesDifficulty;
    });
  }, [problems, search, difficulty]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, difficulty]);

  return (
    <div className="container page-enter problems-page">
      <div className="problems-header">
        <div>
          <h1>Problems</h1>
          <p className="text-dim">
            Sharpen your skills with our curated problem set.
          </p>
        </div>

        <div className="problems-filters">
          <div className="search-box">
            <FiSearch />
            <input
              className="input"
              placeholder="Search problems…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="All">All Difficulties</option>

            {DIFFICULTIES.map((d) => (
              <option key={d} value={d.toUpperCase()}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Loading label="Loading problems…" />
      ) : paginated.length === 0 ? (
        <div className="empty-state">
          <h3>No problems match your filters</h3>
          <p>Try a different search term or difficulty.</p>
        </div>
      ) : (
        <>
          <div className="problems-grid">
            {paginated.map((problem) => (
              <ProblemCard
                key={problem.id || problem._id}
                problem={problem}
                solved={solvedProblemIds.has(problem.id || problem._id)}
              />
            ))}
          </div>

          <div className="pagination">
            <button
              className="btn btn-outline btn-sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <FiChevronLeft /> Prev
            </button>
            <span className="text-dim mono">
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-outline btn-sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <FiChevronRight />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
