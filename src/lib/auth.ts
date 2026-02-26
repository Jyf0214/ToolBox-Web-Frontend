/**
 * 极简 Auth 管理工具
 */

const AUTH_KEY = 'toolbox_auth_data';

export interface AuthData {
  token: string;
  user: {
    username: string;
    role: 'USER' | 'ADMIN';
  };
}

export const setAuth = (data: AuthData) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  }
};

export const getAuth = (): AuthData | null => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  }
  return null;
};

export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = '/';
  }
};

export const getAuthHeader = (): Record<string, string> => {
  const auth = getAuth();
  return auth ? { 'Authorization': `Bearer ${auth.token}` } : {};
};
