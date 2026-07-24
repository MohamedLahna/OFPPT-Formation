import api from '../utils/api';

export const login = async (email, password) => {
  const response = await api.post('/login', { email, password });
  const { token, user } = response.data;
  localStorage.setItem('token', token);
  localStorage.setItem('ofppt_user', JSON.stringify(user || {}));
  sessionStorage.setItem('auth', 'true');
  return response.data;
};

export const logout = async () => {
  try {
    await api.post('/logout');
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('ofppt_user');
    sessionStorage.removeItem('auth');
    sessionStorage.removeItem('introSeen');
  }
};

export const getUser = () => api.get('/me');
export const isAuthenticated = () => !!localStorage.getItem('token');
