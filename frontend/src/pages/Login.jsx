import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { login as loginRequest } from '../services/authService';
import { OfpptLogo } from '../components/OfpptLogo';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password.trim()) {
      setError('Email et mot de passe sont obligatoires.');
      return;
    }

    setLoading(true);
    try {
      const data = await loginRequest(form.email.trim(), form.password);

      if (data.needs_activation || data.must_change_password) {
        navigate('/activation', { replace: true });
        return;
      }

      navigate('/', { replace: true });
    } catch (err) {
      const message = err?.response?.data?.message || 'Identifiants incorrects';
      setError(message);
      localStorage.removeItem('token');
      localStorage.removeItem('ofppt_user');
      sessionStorage.removeItem('auth');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <OfpptLogo className="login-logo" />
        <h1>Connexion</h1>
        <label>
          Email
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" placeholder="votre.email@ofppt.ma" />
        </label>
        <label>
          Mot de passe
          <div className="password-field">
            <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} type={showPassword ? 'text' : 'password'} placeholder="Mot de passe" />
            <button type="button" className="icon-btn" onClick={() => setShowPassword((value) => !value)} aria-label="Afficher le mot de passe">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn-primary full" disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</button>
      </form>
    </main>
  );
}
