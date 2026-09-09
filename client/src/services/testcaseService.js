import api from "./api";

const testcaseService = {
  getTestCases: (problemId) =>
    api.get(`/testcases/${problemId}`).then((r) => r.data),
  addTestCase: (problemId, payload) =>
    api.post(`/testcases/${problemId}`, payload).then((r) => r.data),
  updateTestCase: (id, payload) =>
    api.put(`/testcases/${id}`, payload).then((r) => r.data),
  deleteTestCase: (id) => api.delete(`/testcases/${id}`).then((r) => r.data),
};

export default testcaseService;
