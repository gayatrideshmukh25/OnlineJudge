import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { FiCode, FiMenu, FiX, FiLogOut, FiUser } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import "./Navbar.css";

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/");
  };

  const links = [
    { to: "/problems", label: "Problems" },
    ...(isAuthenticated ? [{ to: "/dashboard", label: "Dashboard" }] : []),
    ...(isAuthenticated ? [{ to: "/submissions", label: "Submissions" }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <FiCode className="navbar-brand-icon" />
          <span>
            Byte<span className="gradient-text">Judge</span>
          </span>
        </Link>

        <nav className={`navbar-links ${open ? "open" : ""}`}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `navbar-link ${isActive ? "active" : ""}`
              }
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}

          <div className="navbar-auth">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="navbar-user"
                  onClick={() => setOpen(false)}
                >
                  <FiUser />
                  <span>{user?.username || "Profile"}</span>
                </Link>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleLogout}
                >
                  <FiLogOut /> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary btn-sm"
                  onClick={() => setOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>

        <button
          className="navbar-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>
    </header>
  );
}
