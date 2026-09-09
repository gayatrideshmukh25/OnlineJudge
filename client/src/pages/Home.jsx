import { Link } from "react-router-dom";
import {
  FiZap,
  FiCpu,
  FiBarChart2,
  FiShield,
  FiArrowRight,
} from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import "./Home.css";

const features = [
  {
    icon: <FiCpu />,
    title: "Multi-language judge",
    text: "Write and run solutions in C++, Java, or Python with a full Monaco editor and instant feedback.",
  },
  {
    icon: <FiZap />,
    title: "Real-time verdicts",
    text: "Every submission is compiled and judged against hidden test cases with runtime and memory stats.",
  },
  {
    icon: <FiBarChart2 />,
    title: "Track your growth",
    text: "See acceptance rate, solved counts by difficulty, and full submission history in one dashboard.",
  },
  {
    icon: <FiShield />,
    title: "Built for practice",
    text: "Curated problems with clear constraints, examples, and sample cases so you always know the goal.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="page-enter">
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow mono">$ compile --optimize=skill</span>
            <h1 className="hero-title">
              Where your code meets its{" "}
              <span className="gradient-text">verdict</span>.
            </h1>
            <p className="hero-sub">
              ByteJudge is a focused online judge for practicing data structures
              and algorithms — write code, run it against real test cases, and
              watch your acceptance rate climb.
            </p>
            <div className="hero-actions">
              <Link to="/problems" className="btn btn-primary">
                Start Solving <FiArrowRight />
              </Link>
              {!isAuthenticated && (
                <Link to="/register" className="btn btn-outline">
                  Create free account
                </Link>
              )}
            </div>
          </div>

          <div className="hero-console window-card">
            <div className="window-chrome">
              <span className="window-dot red" />
              <span className="window-dot yellow" />
              <span className="window-dot green" />
              <span className="window-title">judge.log</span>
            </div>
            <pre className="hero-console-body mono">
              {`> submitting solution.cpp
> compiling...           done (0.4s)
> running test 1 / 24     PASS
> running test 2 / 24     PASS
> running test 24 / 24    PASS

Verdict: Accepted
Runtime: 42 ms   Memory: 8.1 MB`}
            </pre>
            <div className="build-bar" />
          </div>
        </div>
      </section>

      <section className="container features">
        <h2 className="section-heading">
          Everything you need to practice seriously
        </h2>
        <div className="feature-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p className="text-dim">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container cta">
        <div className="cta-box">
          <h2>Ready to write your next Accepted?</h2>
          <p className="text-dim">
            Join ByteJudge and start solving problems today — no setup required.
          </p>
          <Link
            to={isAuthenticated ? "/problems" : "/register"}
            className="btn btn-primary"
          >
            {isAuthenticated ? "Browse Problems" : "Get Started Free"}{" "}
            <FiArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}
