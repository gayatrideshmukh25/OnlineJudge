import { useState } from "react";
import { Link } from "react-router-dom";
import { statusBadgeClass, formatDate } from "../utils/helpers";
import "./SubmissionTable.css";

export default function SubmissionTable({ submissions = [] }) {
  const [expandedProblems, setExpandedProblems] = useState({});

  if (!submissions.length) {
    return (
      <div className="empty-state">
        <h3>No submissions yet</h3>
        <p>Solve a problem to see your submission history here.</p>
      </div>
    );
  }

  // Group submissions by problemId
  const groupedProblems = submissions.reduce((groups, submission) => {
    const problemId = submission.problemId;

    if (!groups[problemId]) {
      groups[problemId] = {
        problem: submission.problem,
        problemId,
        submissions: [],
      };
    }

    groups[problemId].submissions.push(submission);

    return groups;
  }, {});

  const problems = Object.values(groupedProblems);

  const toggleProblem = (problemId) => {
    setExpandedProblems((prev) => ({
      ...prev,
      [problemId]: !prev[problemId],
    }));
  };

  return (
    <div className="table-wrap">
      <table className="submission-table">
        <thead>
          <tr>
            <th></th>
            <th>Problem</th>
            <th>Result</th>
            <th>Submissions</th>
            <th>Last Submission</th>
          </tr>
        </thead>

        <tbody>
          {problems.map((group) => {
            const {
              problem,
              problemId,
              submissions: problemSubmissions,
            } = group;

            // Solved if at least one submission was accepted
            const solved = problemSubmissions.some(
              (submission) =>
                String(submission.status).trim().toUpperCase() === "ACCEPTED",
            );

            const latestSubmission = problemSubmissions[0];
            const latestSubmissionId =
              latestSubmission?.id ?? latestSubmission?._id;

            const isExpanded = expandedProblems[problemId];

            return (
              <>
                {/* Main problem row */}
                <tr key={problemId} className="problem-row">
                  <td>
                    <button
                      type="button"
                      className="expand-button"
                      onClick={() => toggleProblem(problemId)}
                    >
                      {isExpanded ? "▼" : "▶"}
                    </button>
                  </td>

                  <td>
                    <Link
                      to={`/submissions/${latestSubmissionId}`}
                      className="table-link"
                    >
                      {problem?.title || "Unknown Problem"}
                    </Link>
                  </td>

                  <td>
                    <span
                      className={statusBadgeClass(
                        solved ? "ACCEPTED" : "UNSOLVED",
                      )}
                    >
                      {solved ? "ACCEPTED" : "UNSOLVED"}
                    </span>
                  </td>

                  <td className="mono">{problemSubmissions.length}</td>

                  <td className="text-dim">
                    {latestSubmission
                      ? formatDate(latestSubmission.createdAt)
                      : "—"}
                  </td>
                </tr>

                {/* Expanded individual submissions */}
                {isExpanded &&
                  problemSubmissions.map((s) => (
                    <tr key={s.id || s._id} className="submission-detail-row">
                      <td></td>

                      <td className="mono text-faint">
                        <Link
                          to={`/submissions/${s.id || s._id}`}
                          className="table-link"
                        >
                          #{String(s.id || s._id).slice(-6)}
                        </Link>
                      </td>

                      <td>
                        <span className={statusBadgeClass(s.status)}>
                          {s.status}
                        </span>
                      </td>

                      <td className="mono">{s.language}</td>

                      <td className="text-dim">
                        {s.runtime ? `${s.runtime} ms` : "—"}

                        {" • "}

                        {s.memory ? `${s.memory} MB` : "—"}

                        {" • "}

                        {formatDate(s.createdAt)}
                      </td>
                    </tr>
                  ))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// import { Link } from "react-router-dom";
// import { statusBadgeClass, formatDate } from "../utils/helpers";
// import "./SubmissionTable.css";

// export default function SubmissionTable({ submissions = [] }) {
//   console.log("Rendering SubmissionTable with submissions:", submissions);
//   if (!submissions.length) {
//     return (
//       <div className="empty-state">
//         <h3>No submissions yet</h3>
//         <p>Solve a problem to see your submission history here.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="table-wrap">
//       <table className="submission-table">
//         <thead>
//           <tr>
//             <th>ID</th>
//             <th>Problem</th>
//             <th>Language</th>
//             <th>Status</th>
//             <th>Runtime</th>
//             <th>Memory</th>
//             <th>Date</th>
//           </tr>
//         </thead>
//         <tbody>
//           {submissions.map((s) => (
//             <tr key={s.id || s._id}>
//               <td className="mono text-faint">
//                 #{String(s.id || s._id).slice(-6)}
//               </td>
//               <td>
//                 <Link to={`/problems/${s.problemId}`} className="table-link">
//                   {s.problem.title || s.problem?.title || "Unknown Problem"}
//                 </Link>
//               </td>
//               <td className="mono">{s.language}</td>
//               <td>
//                 <span className={statusBadgeClass(s.status)}>{s.status}</span>
//               </td>
//               <td className="mono text-dim">
//                 {s.runtime ? `${s.runtime} ms` : "—"}
//               </td>
//               <td className="mono text-dim">
//                 {s.memory ? `${s.memory} MB` : "—"}
//               </td>
//               <td className="text-dim">{formatDate(s.createdAt)}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }
