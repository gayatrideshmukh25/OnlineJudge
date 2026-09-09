import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiCode } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import { isValidEmail } from "../utils/helpers";
import "./Auth.css";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (!form.username.trim()) next.username = "Username is required";
    else if (form.username.trim().length < 3)
      next.username = "Must be at least 3 characters";

    if (!form.email) next.email = "Email is required";
    else if (!isValidEmail(form.email))
      next.email = "Enter a valid email address";

    if (!form.password) next.password = "Password is required";
    else if (form.password.length < 6)
      next.password = "Must be at least 6 characters";

    if (form.confirmPassword !== form.password)
      next.confirmPassword = "Passwords do not match";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { confirmPassword, ...payload } = form;
      await register(payload);
      toast.success("Account created — welcome to ByteJudge!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      // handled by api.js interceptor
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page page-enter">
      <div className="auth-card window-card">
        <div className="window-chrome">
          <span className="window-dot red" />
          <span className="window-dot yellow" />
          <span className="window-dot green" />
          <span className="window-title">register.sh</span>
        </div>

        <div className="auth-body">
          <div className="auth-header">
            <FiCode className="auth-icon" />
            <h1>Create your account</h1>
            <p className="text-dim">Start solving problems in seconds.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                className={`input ${errors.username ? "error" : ""}`}
                placeholder="codewarrior"
                value={form.username}
                onChange={handleChange}
              />
              {errors.username && (
                <span className="field-error">{errors.username}</span>
              )}
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className={`input ${errors.email ? "error" : ""}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
              {errors.email && (
                <span className="field-error">{errors.email}</span>
              )}
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className={`input ${errors.password ? "error" : ""}`}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
              />
              {errors.password && (
                <span className="field-error">{errors.password}</span>
              )}
            </div>

            <div className="field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className={`input ${errors.confirmPassword ? "error" : ""}`}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
              />
              {errors.confirmPassword && (
                <span className="field-error">{errors.confirmPassword}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
            >
              {submitting ? "Creating account…" : "Sign Up"}
            </button>
          </form>

          <p className="auth-footer text-dim">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
