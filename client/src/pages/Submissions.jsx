import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import SubmissionTable from '../components/SubmissionTable.jsx';
import Loading from '../components/Loading.jsx';
import submissionService from '../services/submissionService';
import './Submissions.css';

export default function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    submissionService
      .getSubmissions()
      .then((data) => {
        if (mounted) setSubmissions(data.submissions ?? data ?? []);
      })
      .catch(() => {
        if (mounted) setSubmissions([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="container page-enter submissions-page">
      <div className="dashboard-layout">
        <Sidebar />
        <div className="submissions-content">
          <h1>Submission History</h1>
          <p className="text-dim" style={{ marginBottom: 24 }}>
            Every run you've submitted, with its verdict, runtime, and memory.
          </p>
          {loading ? <Loading label="Loading submissions…" /> : <SubmissionTable submissions={submissions} />}
        </div>
      </div>
    </div>
  );
}
