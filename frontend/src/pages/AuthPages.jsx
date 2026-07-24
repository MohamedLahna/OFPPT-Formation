import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { dashboardForRole, mustChangePassword } from '../utils/roles';
import { Button, Card, Field, inputClass } from '../components/ui';
import OFPPTLogo from '../components/OFPPTLogo';
import AnimatedLoginAvatar from '../components/auth/AnimatedLoginAvatar';

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(form);
      if (!data.needs_activation) {
        sessionStorage.setItem('ofppt_intro_pending', '1');
      }
      nav(data.needs_activation ? '/activation' : dashboardForRole(data.user.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Connexion impossible.');
    }
  };
  return <div className="login-page">
    <section className="login-visual">
      <div className="login-visual-content">
        <OFPPTLogo className="login-logo" />
        <p className="eyebrow">OFPPT Formation</p>
        <h1>Plateforme interne des formateurs</h1>
        <p>Connectez-vous avec votre email temporaire ou final pour accéder à votre espace métier.</p>
      </div>
    </section>
    <section className="login-form-panel">
      <form onSubmit={submit} className="login-card-dark space-y-5">
        <div className="login-avatar-slot">
          <AnimatedLoginAvatar
            emailValue={form.email}
            emailFocused={emailFocused}
            passwordFocused={passwordFocused}
            showPassword={showPassword}
          />
        </div>
        <OFPPTLogo compact className="login-logo login-logo-auth" />
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Connexion</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Système de Gestion des Formations</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <Field label="Email"><input required className={inputClass} type="email" placeholder="ex: participant@ofppt.local" autoComplete="email" value={form.email} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Mot de passe">
          <div
            className="login-password-field"
            onFocus={() => setPasswordFocused(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setPasswordFocused(false);
              }
            }}
          >
            <input required className={`${inputClass} login-password-input`} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" className="login-password-toggle" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showPassword} onMouseDown={(e) => e.preventDefault()} onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>
        <Link to="/forgot-password" className="block text-right text-sm font-bold text-[var(--blue-light)]">Mot de passe oublié ?</Link>
        <Button className="full">Me connecter</Button>
      </form>
    </section>
  </div>;
}

export function ForgotPasswordPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', code: '', password: '', password_confirmation: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const send = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/forgot-password/send-code', { email: form.email });
      setStep(2);
      setMessage('Code envoye a votre email.');
    } catch (err) {
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors || {})?.[0]?.[0] || 'Envoi du code impossible.');
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/forgot-password/verify-code', { email: form.email, code: form.code });
      setStep(3);
      setMessage('Code verifie. Choisissez un nouveau mot de passe.');
    } catch (err) {
      setError(err.response?.data?.message || 'Code invalide.');
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/forgot-password/reset', {
        email: form.email,
        code: form.code,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      setMessage('Mot de passe reinitialise. Vous pouvez vous connecter.');
      setTimeout(() => nav('/login', { replace: true }), 900);
    } catch (err) {
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors || {})?.[0]?.[0] || 'Reinitialisation impossible.');
    }
  };

  return <div className="min-h-screen bg-[#eef5f6] px-6 py-10 text-[#08235a]">
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#008a94]">Recuperation securisee</p>
        <h1 className="mt-3 text-4xl font-black">Mot de passe oublie</h1>
        <p className="mt-2 text-slate-500">Recevez un code par email, verifiez-le, puis definissez un nouveau mot de passe.</p>
      </div>
      <Card className="p-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {['Email', 'Code', 'Nouveau mot de passe'].map((label, index) => <span key={label} className={`rounded-full px-4 py-2 text-xs font-black ${step === index + 1 ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{index + 1}. {label}</span>)}
        </div>
        {error && <div className="mb-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}
        {message && <div className="mb-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">{message}</div>}
        {step === 1 && <form onSubmit={send} className="space-y-4">
          <Field label="Email du compte"><input required className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="votre.email@example.com" /></Field>
          <Button className="w-full">Recevoir le code</Button>
        </form>}
        {step === 2 && <form onSubmit={verify} className="space-y-4">
          <Field label="Code recu par email"><input required className={inputClass + ' text-center text-2xl font-black tracking-[0.45em]'} inputMode="numeric" maxLength="6" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <div className="flex flex-col gap-3 sm:flex-row"><Button className="flex-1">Verifier le code</Button><Button type="button" variant="secondary" className="flex-1" onClick={send}>Renvoyer</Button></div>
        </form>}
        {step === 3 && <form onSubmit={reset} className="space-y-4">
          <Field label="Nouveau mot de passe"><input required className={inputClass} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Confirmer mot de passe"><input required className={inputClass} type="password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} /></Field>
          <Button className="w-full">Enregistrer le nouveau mot de passe</Button>
        </form>}
        <Link className="mt-6 inline-block text-sm font-bold text-slate-500" to="/login">Retour connexion</Link>
      </Card>
    </div>
  </div>;
}

export function ActivationPage() {
  const { user, setUser, refresh } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ new_email: '', password: '', password_confirmation: '', code: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const send = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (user && !mustChangePassword(user)) {
      nav(dashboardForRole(user.role), { replace: true });
      return;
    }
    try {
      await api.post('/activation/send-code', {
        new_email: form.new_email,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      setStep(2);
      setMessage('Un code de verification a ete envoye a votre nouvelle adresse email.');
    } catch (err) {
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors || {})?.[0]?.[0] || 'Envoi du code impossible.');
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/activation/verify-code', { code: form.code });
      setUser(data.user);
      await refresh();
      sessionStorage.setItem('ofppt_intro_pending', '1');
      nav(dashboardForRole(data.user.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Verification impossible.');
    }
  };

  if (user && !mustChangePassword(user)) {
    return <div className="min-h-screen bg-[#eef5f6] grid place-items-center p-6">
      <Card className="max-w-xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#008a94]">Compte actif</p>
        <h1 className="mt-3 text-3xl font-black text-[#08235a]">Votre compte est deja active.</h1>
        <p className="mt-2 text-slate-500">Vous pouvez acceder directement a votre espace.</p>
        <Button className="mt-5" onClick={() => nav(dashboardForRole(user.role), { replace: true })}>Aller au tableau de bord</Button>
      </Card>
    </div>;
  }

  return <div className="min-h-screen bg-[#eef5f6] px-6 py-10 text-[#08235a]">
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 rounded-[2rem] bg-[#06234a] p-8 text-white shadow-2xl shadow-slate-300/70">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.4em] text-cyan-100">Activation obligatoire</p>
            <h1 className="mt-3 text-4xl font-black">Finalisez votre compte OFPPT</h1>
            <p className="mt-3 max-w-2xl text-blue-100">Votre compte est bloque jusqu'au changement du mot de passe temporaire et la verification du nouvel email.</p>
          </div>
          <div className="rounded-3xl bg-white px-6 py-4 text-2xl font-black text-[#06234a]">OFPPT<br /><span className="text-[#008a94]">Formation</span></div>
        </div>
      </div>

      <Card className="p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#008a94]">Compte en attente</p>
            <h2 className="text-3xl font-black">Activation du compte</h2>
            <p className="mt-1 text-slate-500">Connecte comme {user?.prenom} {user?.nom}</p>
          </div>
          <div className="flex gap-2">
            <span className={`rounded-full px-4 py-2 text-xs font-black ${step === 1 ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>1. Infos</span>
            <span className={`rounded-full px-4 py-2 text-xs font-black ${step === 2 ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>2. Code</span>
          </div>
        </div>

        {error && <div className="mb-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}
        {message && <div className="mb-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">{message}</div>}

        {step === 1 ? <form onSubmit={send} className="grid gap-4 md:grid-cols-2">
          <Field label="Nouvelle adresse email"><input required className={inputClass} type="email" value={form.new_email} onChange={(e) => setForm({ ...form, new_email: e.target.value })} placeholder="votre.email@example.com" /></Field>
          <Field label="Nouveau mot de passe"><input required className={inputClass} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Confirmer mot de passe"><input required className={inputClass} type="password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} /></Field>
          <div className="flex items-end"><Button className="w-full">Suivante</Button></div>
        </form> : <form onSubmit={verify} className="space-y-4">
          <Field label="Code de verification"><input required className={inputClass + ' text-center text-2xl font-black tracking-[0.45em]'} inputMode="numeric" maxLength="6" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="000000" /></Field>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1">Verifier et activer mon compte</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={send}>Renvoyer le code</Button>
          </div>
        </form>}

        <Link className="mt-6 inline-block text-sm font-bold text-slate-500" to="/login">Retour connexion</Link>
      </Card>
    </div>
  </div>;
}
