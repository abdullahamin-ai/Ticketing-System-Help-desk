import { api } from "@/lib/api";
import { AuthToken, LoginPayload, RegisterPayload, UserRead } from "@/types";

export const authService = {
  async login(payload: LoginPayload): Promise<AuthToken> {
    const { data } = await api.post<AuthToken>("/auth/login", payload);
    return data;
  },
  async register(payload: RegisterPayload): Promise<UserRead> {
    const { data } = await api.post<UserRead>("/auth/register", payload);
    return data;
  },
  async me(): Promise<UserRead> {
    const { data } = await api.get<UserRead>("/users/me");
    return data;
  },
  async changeMyPassword(current_password: string, new_password: string) {
    await api.post("/users/me/password", { current_password, new_password });
  },
};
