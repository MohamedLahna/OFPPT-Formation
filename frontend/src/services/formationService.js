import api from '../utils/api';

export const getThemes = () => api.get('/themes');
export const getFormations = () => api.get('/formations');
export const createTheme = (data) => api.post('/themes', data);
export const createFormation = (data) => api.post('/formations', data);
