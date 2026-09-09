import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiX } from "react-icons/fi";
import AdminSidebar from "../components/AdminSidebar.jsx";
import Loading from "../components/Loading.jsx";
import problemService from "../services/problemService";
import testcaseService from "../services/testcaseService";
import "./Admin.css";

const emptyForm = { input: "", expectedOutput: "", isHidden: false };

export default function ManageTestCases() {
  const [problems, setProblems] = useState([]);
  const [selectedProblemId, setSelectedProblemId] = useState("");
  const [testCases, setTestCases] = useState([]);
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [loadingCases, setLoadingCases] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    problemService
      .getProblems()
      .then((data) => {
        const list = data.problems ?? data ?? [];
        setProblems(list);
        if (list.length) setSelectedProblemId(list[0].id || list[0]._id);
      })
      .catch(() => setProblems([]))
      .finally(() => setLoadingProblems(false));
  }, []);

  const loadTestCases = (problemId) => {
    if (!problemId) return;
    setLoadingCases(true);
    console.log("Loading test cases for problem ID:", problemId);
    testcaseService
      .getTestCases(problemId)
      .then((data) => {
        const list = Array.isArray(data?.testCases)
          ? data.testCases
          : Array.isArray(data?.testcases)
            ? data.testcases
            : Array.isArray(data)
              ? data
              : [];
        console.log("Loaded test cases:", list);
        setTestCases(list);
      })
      .catch(() => setTestCases([]))
      .finally(() => setLoadingCases(false));
  };

  useEffect(() => {
    loadTestCases(selectedProblemId);
  }, [selectedProblemId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await testcaseService.addTestCase(selectedProblemId, form);
      toast.success("Test case added");
      setModalOpen(false);
      setForm(emptyForm);
      loadTestCases(selectedProblemId);
    } catch (err) {
      // handled globally
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tc) => {
    if (!window.confirm("Delete this test case?")) return;
    try {
      await testcaseService.deleteTestCase(tc.id || tc._id);
      toast.success("Test case deleted");
      loadTestCases(selectedProblemId);
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
            <h1>Manage Test Cases</h1>
            <button
              className="btn btn-primary"
              onClick={() => setModalOpen(true)}
              disabled={!selectedProblemId}
            >
              <FiPlus /> Add Test Case
            </button>
          </div>

          <div className="field" style={{ maxWidth: 360, marginBottom: 24 }}>
            <label>Problem</label>
            {loadingProblems ? (
              <Loading size="sm" label="" />
            ) : (
              <select
                className="select"
                value={selectedProblemId}
                onChange={(e) => setSelectedProblemId(e.target.value)}
              >
                {problems.map((p) => (
                  <option key={p.id || p._id} value={p.id || p._id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {loadingCases ? (
            <Loading label="Loading test cases…" />
          ) : testCases.length === 0 ? (
            <div className="empty-state">
              <h3>No test cases yet</h3>
              <p>Add sample or hidden test cases for this problem.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Input</th>
                    <th>Expected Output</th>
                    <th>Visibility</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {testCases.map((tc) => (
                    <tr key={tc.id || tc._id}>
                      <td className="mono">{tc.input}</td>
                      <td className="mono">{tc.expectedOutput}</td>
                      <td>
                        <span
                          className={`badge ${tc.isHidden ? "badge-hard" : "badge-easy"}`}
                        >
                          {tc.isHidden ? "Hidden" : "Sample"}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-btn danger"
                            onClick={() => handleDelete(tc)}
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
              <h2>Add Test Case</h2>
              <button
                className="modal-close"
                onClick={() => setModalOpen(false)}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleAdd}>
              <div className="field">
                <label>Input</label>
                <textarea
                  className="textarea"
                  required
                  value={form.input}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, input: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label>Expected Output</label>
                <textarea
                  className="textarea"
                  required
                  value={form.expectedOutput}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expectedOutput: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label className="flex items-center gap-8">
                  <input
                    type="checkbox"
                    checked={form.isHidden}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isHidden: e.target.checked }))
                    }
                  />
                  Hidden test case (not shown to users)
                </label>
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
                  {saving ? "Saving…" : "Add Test Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
