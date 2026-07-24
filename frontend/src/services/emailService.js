import api from '../utils/api';

export const getEmailConfig = () => api.get('/admin/mail-settings');
export const saveEmailConfig = (data) => api.put('/admin/mail-settings', data);
