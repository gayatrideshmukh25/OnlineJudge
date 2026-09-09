import { NavLink } from 'react-router-dom';
import { FiGrid, FiFileText, FiCheckSquare } from 'react-icons/fi';
import './AdminSidebar.css';

const items = [
  { to: '/admin', label: 'Overview', icon: <FiGrid />, end: true },
  { to: '/admin/problems', label: 'Manage Problems', icon: <FiFileText /> },
  { to: '/admin/testcases', label: 'Manage Test Cases', icon: <FiCheckSquare /> },
];

export default function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <p className="admin-sidebar-label">Admin Panel</p>
      <nav className="admin-sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `admin-sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
