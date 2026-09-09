import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiFileText, FiUsers, FiCheckSquare, FiArrowRight } from 'react-icons/fi';
import AdminSidebar from '../components/AdminSidebar.jsx';
import problemService from '../services/problemService';
import userService from '../services/userService';
import Loading from '../components/Loading.jsx';
import './Admin.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ problems: 0, users: 0, submissions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([problemService.getProblems(), userService.getUsers()]).then(
      ([problemsRes, usersRes]) => {
        if (!mounted) return;
        const problems =
          problemsRes.status === 'fulfilled' ? problemsRes.value.problems ?? problemsRes.value : [];
        const users = usersRes.status === 'fulfilled' ? usersRes.value.users ?? usersRes.value : [];
        setStats({
          problems: Array.isArray(problems) ? problems.length : 0,
          users: Array.isArray(users) ? users.length : 0,
          submissions: 0,
        });
        setLoading(false);
      }
    );
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="container page-enter admin-page">
      <div className="admin-layout">
        <AdminSidebar />

        <div className="admin-content">
          <h1>Admin Overview</h1>
          <p className="text-dim" style={{ marginBottom: 28 }}>
            Manage the problem set and monitor platform activity.
          </p>

          {loading ? (
            <Loading label="Loading overview…" />
          ) : (
            <div className="admin-stat-grid">
              <div className="stat-card">
                <FiFileText className="stat-icon" style={{ color: 'var(--primary)' }} />
                <div>
                  <p className="stat-value">{stats.problems}</p>
                  <p className="stat-label">Total Problems</p>
                </div>
              </div>
              <div className="stat-card">
                <FiUsers className="stat-icon" style={{ color: 'var(--accent)' }} />
                <div>
                  <p className="stat-value">{stats.users}</p>
                  <p className="stat-label">Registered Users</p>
                </div>
              </div>
              <div className="stat-card">
                <FiCheckSquare className="stat-icon" style={{ color: 'var(--warning)' }} />
                <div>
                  <p className="stat-value">{stats.submissions}</p>
                  <p className="stat-label">Total Submissions</p>
                </div>
              </div>
            </div>
          )}

          <div className="admin-quick-links">
            <Link to="/admin/problems" className="admin-quick-card">
              <div>
                <h3>Manage Problems</h3>
                <p className="text-dim">Add, edit, or remove problems from the judge.</p>
              </div>
              <FiArrowRight />
            </Link>
            <Link to="/admin/testcases" className="admin-quick-card">
              <div>
                <h3>Manage Test Cases</h3>
                <p className="text-dim">Add sample or hidden test cases per problem.</p>
              </div>
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
