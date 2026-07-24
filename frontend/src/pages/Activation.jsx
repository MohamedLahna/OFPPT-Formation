import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { OfpptLogo } from '../components/OfpptLogo';

const storedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('ofppt_user') || '{}');
  } catch {
    return {};
  }
};

export default function Activation() {
  const [user, setUser] = useState(storedUser);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ new_email: '', password: '', password_confirmation: '', code: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const active = user?.statut === 'actif' && user?.actif === true && !user?.must_change_password;
    if (active) navigate('/', { replace: true });
  }, [navigate, user]);

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // The local session must still be cleared if the backend is unreachable.
    }
    localStorage.removeItem('token');
    localStorage.removeItem('ofppt_user');
    sessionStorage.removeItem('auth');
    sessionStorage.removeItem('introSeen');
    navigate('/login', { replace: true });
  };

  const sendCode = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await api.post('/activation/send-code', {
        new_email: form.new_email.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      setStep(2);
      setMessage('Code envoyé. Vérifiez votre nouvelle adresse email.');
    } catch (err) {
      const validation = err?.response?.data?.errors;
      const firstError = validation ? Object.values(validation)?.[0]?.[0] : null;
      setError(firstError || err?.response?.data?.message || 'Impossible d’envoyer le code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { data } = await api.post('/activation/verify-code', { code: form.code.trim() });
      localStorage.setItem('ofppt_user', JSON.stringify(data.user || {}));
      setUser(data.user || {});
      sessionStorage.setItem('auth', 'true');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Code incorrect ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page activation-page">
      <section className="activation-card">
        <div className="activation-panel">
          <OfpptLogo className="login-logo" />
          <p className="eyebrow">Activation sécurisée</p>
          <h1>Finaliser le compte</h1>
          <p>Le compte est bloqué jusqu’à la confirmation du nouveau mot de passe et du nouvel email.</p>
        </div>

        <div className="activation-form">
          <p className="eyebrow">Compte en attente</p>
          <h2>Activation du compte</h2>
          <p className="muted">Connecté comme {user?.prenom} {user?.nom}</p>

          <div className="step-row">
            <span className={step === 1 ? 'step active' : 'step'}>1. Nouveau compte</span>
            <span className={step === 2 ? 'step active' : 'step'}>2. Code email</span>
          </div>

          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}

          {step === 1 ? (
            <form onSubmit={sendCode} className="form-stack">
              <label>
                Nouvelle adresse email
                <input type="email" required value={form.new_email} onChange={(event) => setForm({ ...form, new_email: event.target.value })} placeholder="votre.email@gmail.com" />
              </label>
              <label>
                Nouveau mot de passe
                <input type="password" required minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              </label>
              <label>
                Confirmer le mot de passe
                <input type="password" required minLength="8" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} />
              </label>
              <button type="submit" className="btn btn-primary full" disabled={loading}>{loading ? 'Envoi...' : 'Créer mon compte'}</button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="form-stack">
              <label>
                Code de vérification
                <input className="code-input" inputMode="numeric" maxLength="6" required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="000000" />
              </label>
              <button type="submit" className="btn btn-primary full" disabled={loading}>{loading ? 'Vérification...' : 'Vérifier et activer mon compte'}</button>
              <button type="button" className="btn btn-secondary full" disabled={loading} onClick={sendCode}>Renvoyer le code</button>
            </form>
          )}

          <button type="button" className="link-button" onClick={logout}>Retour connexion</button>
        </div>
      </section>
    </main>
  );
}
