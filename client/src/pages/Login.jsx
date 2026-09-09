import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiCode } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import { isValidEmail } from "../utils/helpers";
import "./Auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (!form.email) next.email = "Email is required";
    else if (!isValidEmail(form.email))
      next.email = "Enter a valid email address";
    if (!form.password) next.password = "Password is required";
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
      const data = await login(form);
      const userRole = String(data?.user?.role ?? "").toLowerCase();
      toast.success("Welcome back!");

      const redirectTo =
        location.state?.from?.pathname ||
        (userRole === "admin" ? "/admin" : "/dashboard");

      navigate(redirectTo, { replace: true });
    } catch (err) {
      // api.js already toasts the error message
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
          <span className="window-title">login.sh</span>
        </div>

        <div className="auth-body">
          <div className="auth-header">
            <FiCode className="auth-icon" />
            <h1>Welcome back</h1>
            <p className="text-dim">Log in to continue solving problems.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
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

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
            >
              {submitting ? "Logging in…" : "Log In"}
            </button>
          </form>

          <p className="auth-footer text-dim">
            Don&apos;t have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
