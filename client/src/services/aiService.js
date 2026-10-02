import api from "./api";

const aiService = {
  getReview: (payload) =>
    api.post("/ai/getReview", payload).then((r) => r.data),
};

export default aiService;
