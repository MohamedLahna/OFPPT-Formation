import api from '../utils/api';

export const getDashboardStats = () => api.get('/admin/dashboard');
export const getUsers = () => api.get('/admin/users');
export const getUser = (id) => api.get(`/admin/users/${id}`);
export const createUser = (data) => api.post('/admin/users', data);
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const suspendUser = (id) => api.patch(`/admin/users/${id}/suspend`);
export const reactivateUser = (id) => api.patch(`/admin/users/${id}/reactivate`);
export const resetUserPassword = (id) => api.post(`/admin/users/${id}/reset-password`);
