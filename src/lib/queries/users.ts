import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, unwrapPage, unwrapWrapped, type PageParams } from "../api";
import type { Paginated, User, UserRole } from "../types";

export interface UsersParams extends PageParams {}

export async function fetchUsers(params: UsersParams): Promise<Paginated<User>> {
  return unwrapPage(http.get<Paginated<User>>("/users", { params }));
}

export interface UserWriteInput {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  active?: boolean;
}

function userPayload(input: Partial<UserWriteInput>): Partial<UserWriteInput> {
  const payload: Partial<UserWriteInput> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.role !== undefined) payload.role = input.role;
  if (input.active !== undefined) payload.active = input.active;
  if (input.email !== undefined && input.email.trim() !== "") {
    payload.email = input.email.trim();
  }
  if (typeof input.password === "string" && input.password !== "") {
    payload.password = input.password;
  }
  return payload;
}

export async function createUser(input: UserWriteInput): Promise<User> {
  return unwrapWrapped(
    http.post<{ data: { user: User } }>("/users", userPayload(input)),
    "user",
  );
}

export async function updateUser(id: string, input: Partial<UserWriteInput>): Promise<User> {
  return unwrapWrapped(
    http.patch<{ data: { user: User } }>(`/users/${id}`, userPayload(input)),
    "user",
  );
}

export async function deleteUser(id: string): Promise<void> {
  await http.delete(`/users/${id}`);
}

export function usersKey(params?: UsersParams) {
  return params ? ["users", params] : ["users"];
}

export function useUsersQuery(params: UsersParams) {
  return useQuery({
    queryKey: usersKey(params),
    queryFn: () => fetchUsers(params),
    placeholderData: (prev) => prev,
  });
}

export function useUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["users"] });
    void qc.invalidateQueries({ queryKey: ["stats"] });
  };
  const create = useMutation({ mutationFn: createUser, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<UserWriteInput> }) =>
      updateUser(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteUser, onSuccess: invalidate });
  return { create, update, remove };
}
