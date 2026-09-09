import api from "./api";

const userCodeService = {
  saveUserCode: ({ problemId, language, code }) =>
    api.put(`/userCode/${problemId}/${language}`, { code }).then((r) => r.data),

  getUserCode: ({ problemId, language }) =>
    api.get(`/userCode/${problemId}/${language}`).then((r) => r.data),
};

export default userCodeService;
