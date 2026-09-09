import api from "./api";

const userService = {
  getUsers: () => api.get("/users").then((r) => r.data),
  updateProfile: (payload) => api.put("/users", payload).then((r) => r.data),
  changePassword: (payload) =>
    api.put("/users/change-password", payload).then((r) => r.data),
  deleteAccount: () => api.delete("/users").then((r) => r.data),
  getUserStats: () => api.get("/users/stats").then((r) => r.data),
};

export default userService;
