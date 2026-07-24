import api from '../utils/api';

export const getReportOptions = () => api.get('/reports/options');
export const getPlanReport = (params = {}) => api.get('/reports/plans', { params });
