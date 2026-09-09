import api from "./api";

const problemService = {
  getProblems: (params) => api.get("/problems", { params }).then((r) => r.data),
  getProblemById: (id) => api.get(`/problems/${id}`).then((r) => r.data),
  createProblem: (payload) =>
    api.post("/problems", payload).then((r) => r.data),
  updateProblem: (id, payload) =>
    api.put(`/problems/${id}`, payload).then((r) => r.data),
  deleteProblem: (id) => api.delete(`/problems/${id}`).then((r) => r.data),
};

export default problemService;
