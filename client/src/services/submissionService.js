import api from "./api";

const submissionService = {
  // Submission endpoints — create, fetch, and get a submission by ID.
  createSubmission: (payload) =>
    api.post("/submissions", payload).then((r) => r.data),
  getSubmissions: (params) =>
    api.get("/submissions", { params }).then((r) => r.data),
  getSubmissionById: (id) => api.get(`/submissions/${id}`).then((r) => r.data),

  // Judge endpoints — trigger and poll a run/submit verdict.
  judgeSubmission: (submissionId) =>
    api.post(`/judge/${submissionId}`).then((r) => r.data),
  getJudgeResult: (submissionId) =>
    api.get(`/judge/${submissionId}`).then((r) => r.data),

  // run code without creating a submission
  runCode: (payload) => api.post("/code/run", payload).then((r) => r.data),
};

export default submissionService;
