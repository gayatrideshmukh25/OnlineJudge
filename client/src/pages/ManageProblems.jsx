import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import AdminSidebar from "../components/AdminSidebar.jsx";
import Loading from "../components/Loading.jsx";
import problemService from "../services/problemService";
import { difficultyBadgeClass } from "../utils/helpers";
import { DIFFICULTIES } from "../utils/constants";
import "./Admin.css";

const emptyForm = {
  title: "",
  difficulty: "Easy",
  description: "",
  constraints: "",
};

export default function ManageProblems() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadProblems = () => {
    setLoading(true);
    problemService
      .getProblems()
      .then((data) => setProblems(data.problems ?? data ?? []))
      .catch(() => setProblems([]))
      .finally(() => setLoading(false));
  };

  useEffect(loadProblems, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (problem) => {
    setEditing(problem);
    setForm({
      title: problem.title || "",
      difficulty: problem.difficulty || "Easy",
      tags: (problem.tags || []).join(", "),
      description: problem.description || "",
      constraints: (problem.constraints || []).join("\n"),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title,
      difficulty: form.difficulty,
      description: form.description,
      constraints: form.constraints
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean),
    };

    try {
      if (editing) {
        await problemService.updateProblem(editing.id || editing._id, payload);
        toast.success("Problem updated");
      } else {
        await problemService.createProblem(payload);
        toast.success("Problem created");
      }
      setModalOpen(false);
      loadProblems();
    } catch (err) {
      // handled globally
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (problem) => {
    if (!window.confirm(`Delete "${problem.title}"? This cannot be undone.`))
      return;
    try {
      await problemService.deleteProblem(problem.id || problem._id);
      toast.success("Problem deleted");
      loadProblems();
    } catch (err) {
      // handled globally
    }
  };

  return (
    <div className="container page-enter admin-page">
      <div className="admin-layout">
        <AdminSidebar />

        <div className="admin-content">
          <div className="admin-toolbar">
            <h1>Manage Problems</h1>
            <button className="btn btn-primary" onClick={openCreate}>
              <FiPlus /> Add Problem
            </button>
          </div>

          {loading ? (
            <Loading label="Loading problems…" />
          ) : problems.length === 0 ? (
            <div className="empty-state">
              <h3>No problems yet</h3>
              <p>Click "Add Problem" to create your first one.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Difficulty</th>
                    <th>Acceptance</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {problems.map((p) => (
                    <tr key={p.id || p._id}>
                      <td>{p.title}</td>
                      <td>
                        <span className={difficultyBadgeClass(p.difficulty)}>
                          {p.difficulty}
                        </span>
                      </td>
                      <td className="text-dim">
                        {(p.tags || []).join(", ") || "—"}
                      </td>
                      <td className="mono text-dim">{p.acceptance ?? "—"}%</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            onClick={() => openEdit(p)}
                            title="Edit"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            className="icon-btn danger"
                            onClick={() => handleDelete(p)}
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? "Edit Problem" : "Add Problem"}</h2>
              <button
                className="modal-close"
                onClick={() => setModalOpen(false)}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Title</label>
                <input
                  className="input"
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label>Difficulty</label>
                  <select
                    className="select"
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, difficulty: e.target.value }))
                    }
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Description</label>
                <textarea
                  className="textarea"
                  required
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>

              <div className="field">
                <label>Constraints (one per line)</label>
                <textarea
                  className="textarea"
                  placeholder={"1 <= n <= 10^5\n-10^9 <= arr[i] <= 10^9"}
                  value={form.constraints}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, constraints: e.target.value }))
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving…"
                    : editing
                      ? "Save Changes"
                      : "Create Problem"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
