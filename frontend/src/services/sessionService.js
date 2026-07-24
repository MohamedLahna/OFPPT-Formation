import api from '../utils/api';

export const getReportOptions = () => api.get('/reports/options');
export const getSessions = (params = {}) => api.get('/reports/plans', { params });
export const getResponsableSessions = () => api.get('/responsable-formation/sessions');
export const updateResponsableSession = (id, data) => api.put(`/responsable-formation/sessions/${id}`, data);
