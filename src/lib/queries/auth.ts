import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, unwrap, unwrapWrapped } from "../api";
import { clearSession, setSession, updateUserInSession } from "../session";
import type { AuthPayload, User } from "../types";

export interface LoginInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput): Promise<AuthPayload> {
  return unwrap(http.post<{ data: AuthPayload }>("/auth/login", input));
}

export async function fetchMe(): Promise<User> {
  return unwrapWrapped(http.get<{ data: { user: User } }>("/auth/me"), "user");
}

export interface UpdateMeInput {
  name?: string;
  email?: string;
}

export async function updateMe(input: UpdateMeInput): Promise<User> {
  return unwrapWrapped(http.patch<{ data: { user: User } }>("/auth/me", input), "user");
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await http.patch("/auth/me/password", input);
}

export function useMeQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const user = await fetchMe();
      updateUserInSession(user);
      return user;
    },
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoginMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (payload) => {
      // FASE 4c: payload ya no trae token (vive en cookies httpOnly del BFF).
      setSession({ user: payload.user });
      void qc.setQueryData(["me"], payload.user);
    },
  });
}

/** Cierra sesión en la API (revoca la Session) y limpia el caché local. */
export async function logout(): Promise<void> {
  try {
    await http.post("/auth/logout");
  } catch {
    // Aunque la API falle, el cierre local continúa.
  } finally {
    clearSession();
  }
}

export function useProfileMutations() {
  const qc = useQueryClient();
  const updateProfile = useMutation({
    mutationFn: updateMe,
    onSuccess: (user) => {
      updateUserInSession(user);
      void qc.setQueryData(["me"], user);
    },
  });
  const changePass = useMutation({ mutationFn: changePassword });
  return { updateProfile, changePass };
}
