import { Link } from 'react-router-dom';
import { FiHome } from 'react-icons/fi';
import './StatusPage.css';

export default function NotFound() {
  return (
    <div className="status-page page-enter">
      <p className="status-code mono gradient-text">404</p>
      <h1>Segmentation fault (page not found)</h1>
      <p className="text-dim">
        The page you're looking for doesn't exist, or was moved to a different address.
      </p>
      <Link to="/" className="btn btn-primary">
        <FiHome /> Back to Home
      </Link>
    </div>
  );
}
