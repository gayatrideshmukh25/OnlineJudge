import { Link } from "react-router-dom";
import { FiCode, FiGithub, FiTwitter, FiLinkedin } from "react-icons/fi";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <FiCode /> Byte<span className="gradient-text">Judge</span>
          </div>
          <p className="text-dim">Practice. Submit. Compile your best self.</p>
        </div>

        <div className="footer-links">
          <div>
            <h4>Product</h4>
            <Link to="/problems">Problems</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/submissions">Submissions</Link>
          </div>
          <div>
            <h4>Account</h4>
            <Link to="/login">Login</Link>
            <Link to="/register">Sign Up</Link>
            <Link to="/profile">Profile</Link>
          </div>
        </div>

        <div className="footer-social">
          <a href="#" aria-label="GitHub">
            <FiGithub />
          </a>
          <a href="#" aria-label="Twitter">
            <FiTwitter />
          </a>
          <a href="#" aria-label="LinkedIn">
            <FiLinkedin />
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <span className="text-faint">
            © {new Date().getFullYear()} ByteJudge. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
