import { buildUrl, fetchWithErrors } from './auth-api';

export interface AdminUser {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  created_at?: string;
}

const USERS_PATH = '/api/auth/users/';

export const getUsers = async (): Promise<AdminUser[]> => {
  const res = await fetchWithErrors(buildUrl(USERS_PATH));
  const data = await res.json();
  return data.users || [];
};

export const createUser = async (payload: Partial<AdminUser> & { password: string }) => {
  const res = await fetchWithErrors(buildUrl(USERS_PATH), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const updateUser = async (id: string, payload: Partial<AdminUser>) => {
  const res = await fetchWithErrors(buildUrl(`${USERS_PATH}${id}/`), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const deleteUser = async (id: string) => {
  const res = await fetchWithErrors(buildUrl(`${USERS_PATH}${id}/`), {
    method: 'DELETE',
  });
  return res.json();
};

export default {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
