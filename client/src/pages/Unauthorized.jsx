import { Link } from 'react-router-dom';
import { FiHome, FiLock } from 'react-icons/fi';
import './StatusPage.css';

export default function Unauthorized() {
  return (
    <div className="status-page page-enter">
      <p className="status-code mono gradient-text">403</p>
      <h1><FiLock style={{ verticalAlign: '-3px', marginRight: 8 }} />Access denied</h1>
      <p className="text-dim">
        You don't have permission to view this page. It's restricted to administrators.
      </p>
      <Link to="/" className="btn btn-primary">
        <FiHome /> Back to Home
      </Link>
    </div>
  );
}
