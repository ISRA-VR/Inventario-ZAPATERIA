import axios from "axios";

export const login = (data) => {
  return axios.post(
    "http://localhost:3001/api/auth/login",
    data
  );
};
