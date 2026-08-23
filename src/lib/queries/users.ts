import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, unwrap, unwrapPage, type PageParams } from "../api";
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

export async function createUser(input: UserWriteInput): Promise<User> {
  return unwrap(http.post<{ data: User }>("/users", input));
}

export async function updateUser(id: string, input: Partial<UserWriteInput>): Promise<User> {
  return unwrap(http.patch<{ data: User }>(`/users/${id}`, input));
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
