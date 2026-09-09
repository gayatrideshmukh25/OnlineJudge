import { Link } from "react-router-dom";
import { FiCheckCircle } from "react-icons/fi";
import { difficultyBadgeClass } from "../utils/helpers";
import "./ProblemCard.css";

export default function ProblemCard({ problem, solved }) {
  const { _id, id, title, difficulty, acceptance, tags = [] } = problem;
  const problemId = id || _id;

  return (
    <Link to={`/problems/${problemId}`} className="problem-card">
      <div className="problem-card-top">
        <h3 className="problem-card-title">
          {solved && <FiCheckCircle className="solved-icon" title="Solved" />}
          {title}
        </h3>
        <span className={difficultyBadgeClass(difficulty)}>{difficulty}</span>
      </div>

      <div className="problem-card-tags">
        {tags.slice(0, 4).map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
          </span>
        ))}
      </div>

      <div className="problem-card-footer">
        <span className="text-faint mono">
          Acceptance: <span className="text-dim">{acceptance ?? "—"}%</span>
        </span>
      </div>
    </Link>
  );
}
