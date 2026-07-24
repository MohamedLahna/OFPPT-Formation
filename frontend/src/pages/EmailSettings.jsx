import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { getEmailConfig, saveEmailConfig } from '../services/emailService';
import Skeleton from '../components/ui/Skeleton';
import ErrorBar from '../components/ui/ErrorBar';
import { ToastContainer, useToast } from '../components/ui/Toast';

const fieldError = (errors, field) => errors?.[field]?.[0] ? <small className="field-error">{errors[field][0]}</small> : null;

export default function EmailSettings() {
  const { data: config, loading, error, refetch } = useFetch(getEmailConfig, []);
  const [form, setForm] = useState({ sender_name: '', sender_email: '', app_password: '', is_active: false });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const toast = useToast();

  useEffect(() => {
    if (config) {
      setForm({
        sender_name: config.sender_name || '',
        sender_email: config.sender_email || '',
        app_password: '',
        is_active: Boolean(config.is_active),
      });
    }
  }, [config]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormErrors({});
    try {
      const payload = { ...form };
      if (!payload.app_password) delete payload.app_password;
      const response = await saveEmailConfig(payload);
      toast.success(response.data?.message || 'Paramètres enregistrés avec succès.');
      setForm((current) => ({ ...current, app_password: '' }));
      refetch();
    } catch (err) {
      setFormErrors(err.response?.data?.errors || {});
      toast.error(err.response?.data?.message || Object.values(err.response?.data?.errors || {})?.[0]?.[0] || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton rows={6} />;
  if (error) return <ErrorBar message={error} onRetry={refetch} />;

  return (
    <div className="page-stack">
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />
      <section className="page-title-row"><div><h1>Paramètres Email</h1><p>Configuration réelle du sender Gmail utilisée par Laravel.</p></div></section>
      <section className="panel form-panel">
        <div className="panel-head"><h2>Configuration Gmail</h2><p>Aucun test SMTP n’est affiché car le backend ne fournit pas d’endpoint de test.</p></div>
        <form onSubmit={save} className="form-grid">
          <label>Nom d'expéditeur<input value={form.sender_name} onChange={(event) => setForm({ ...form, sender_name: event.target.value })} />{fieldError(formErrors, 'sender_name')}</label>
          <label>Email d'expéditeur Gmail<input type="email" value={form.sender_email} onChange={(event) => setForm({ ...form, sender_email: event.target.value })} />{fieldError(formErrors, 'sender_email')}</label>
          <label>Mot de passe d'application<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={form.app_password} onChange={(event) => setForm({ ...form, app_password: event.target.value })} placeholder={config?.app_password || '********'} /><button type="button" className="icon-btn" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{fieldError(formErrors, 'app_password')}</label>
          <label>Statut<select value={form.is_active ? '1' : '0'} onChange={(event) => setForm({ ...form, is_active: event.target.value === '1' })}><option value="1">Actif</option><option value="0">Inactif</option></select>{fieldError(formErrors, 'is_active')}</label>
          <div className="modal-actions"><button className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div>
        </form>
      </section>
    </div>
  );
}
