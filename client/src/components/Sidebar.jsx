import { NavLink } from 'react-router-dom';
import { FiGrid, FiUser, FiList, FiCode } from 'react-icons/fi';
import './Sidebar.css';

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: <FiGrid /> },
  { to: '/problems', label: 'Problems', icon: <FiCode /> },
  { to: '/submissions', label: 'Submissions', icon: <FiList /> },
  { to: '/profile', label: 'Profile', icon: <FiUser /> },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
