import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, LockKeyhole, LogOut, Mail, Palette, ShieldCheck, UserRound } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import ProfileAvatar from '../components/profile/ProfileAvatar';
import ProfileIconPicker from '../components/profile/ProfileIconPicker';
import { Badge, Button, Card, Field, PageTitle, inputClass } from '../components/ui';
import { roleLabels } from '../utils/roles';

const emptyPassword = { current_password: '', password: '', password_confirmation: '' };
const emptyEmail = { email: '', code: '' };

function formatDate(value) {
  if (!value) return 'Non renseigne';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function apiMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function fieldError(errors, key) {
  const value = errors?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function AccountPanel({ icon: Icon, title, subtitle, children }) {
  return (
    <Card className="account-panel">
      <div className="mb-5 flex items-start gap-3">
        <div className="account-panel-icon">{Icon && <Icon size={17} />}</div>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function Alert({ type = 'success', children }) {
  return <div className={`account-alert account-alert-${type}`}>{children}</div>;
}

export default function AccountPage() {
  const { user, setUser, refresh, logout } = useAuth();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({ nom: '', prenom: '' });
  const [passwordForm, setPasswordForm] = useState(emptyPassword);
  const [emailForm, setEmailForm] = useState(emptyEmail);
  const [emailStep, setEmailStep] = useState('send');
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState('');

  const displayedUser = profile || user;
  const role = roleLabels[displayedUser?.role] || displayedUser?.role || 'OFPPT';

  const securityItems = useMemo(() => ([
    ['Derniere connexion', formatDate(displayedUser?.last_login_at)],
    ['Statut du compte', displayedUser?.statut || '-'],
    ['Email verifie', displayedUser?.email_verified_at ? 'Oui' : 'Non'],
    ['Session active', 'Connectee par jeton securise'],
  ]), [displayedUser]);

  const showNotice = (type, text) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 4500);
  };

  const syncUser = (nextUser) => {
    setProfile(nextUser);
    setUser?.(nextUser);
  };

  useEffect(() => {
    let active = true;
    api.get('/account/profile')
      .then(({ data }) => {
        if (!active) return;
        const next = data.user;
        setProfile(next);
        setProfileForm({ nom: next?.nom || '', prenom: next?.prenom || '' });
      })
      .catch((error) => showNotice('error', apiMessage(error, 'Erreur lors du chargement du compte.')))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy('profile');
    setErrors({});
    try {
      const { data } = await api.put('/account/profile', profileForm);
      syncUser(data.user);
      showNotice('success', data.message);
      await refresh?.();
    } catch (error) {
      setErrors(error.response?.data?.errors || {});
      showNotice('error', apiMessage(error, 'Erreur lors de la mise a jour.'));
    } finally {
      setBusy('');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setBusy('password');
    setErrors({});
    try {
      const { data } = await api.post('/account/change-password', passwordForm);
      setPasswordForm(emptyPassword);
      showNotice('success', data.message);
    } catch (error) {
      setErrors(error.response?.data?.errors || {});
      showNotice('error', apiMessage(error, 'Erreur lors du changement de mot de passe.'));
    } finally {
      setBusy('');
    }
  };

  const sendEmailCode = async (e) => {
    e.preventDefault();
    setBusy('email-send');
    setErrors({});
    try {
      const { data } = await api.post('/account/email/send-code', { email: emailForm.email });
      setEmailStep('verify');
      showNotice('success', data.message || 'Un code a ete envoye a votre nouvelle adresse Gmail.');
    } catch (error) {
      setErrors(error.response?.data?.errors || {});
      showNotice('error', apiMessage(error, 'Erreur lors de l’envoi du code.'));
    } finally {
      setBusy('');
    }
  };

  const verifyEmailCode = async (e) => {
    e.preventDefault();
    setBusy('email-verify');
    setErrors({});
    try {
      const { data } = await api.post('/account/email/verify-code', { code: emailForm.code });
      syncUser(data.user);
      setEmailForm(emptyEmail);
      setEmailStep('send');
      showNotice('success', data.message);
      await refresh?.();
    } catch (error) {
      setErrors(error.response?.data?.errors || {});
      showNotice('error', apiMessage(error, 'Code incorrect ou expire.'));
    } finally {
      setBusy('');
    }
  };

  const saveAvatar = async (payload) => {
    setBusy('avatar');
    try {
      const { data } = await api.put('/account/profile-avatar', payload);
      syncUser(data.user);
      showNotice('success', data.message);
      await refresh?.();
    } catch (error) {
      showNotice('error', apiMessage(error, 'Erreur lors de l’enregistrement de l’icone.'));
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return <Card className="account-panel"><div className="skeleton h-24" /></Card>;
  }

  return (
    <div className="account-page">
      <PageTitle
        eyebrow="Gestion de mon compte"
        title="Mon compte"
        subtitle="Gerez vos informations personnelles, votre securite et votre profil."
      />

      {notice && <Alert type={notice.type}>{notice.text}</Alert>}

      <section className="account-hero">
        <div className="account-hero-glow" />
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <ProfileAvatar user={displayedUser} size="lg" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-cyan-200/60">Carte profil</p>
              <h1>{displayedUser?.nom_complet || `${displayedUser?.prenom || ''} ${displayedUser?.nom || ''}`.trim()}</h1>
              <p>{displayedUser?.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="account-chip">{role}</span>
                <Badge value={displayedUser?.statut} />
              </div>
            </div>
          </div>
          <div className="account-login-box">
            <span>Derniere connexion</span>
            <strong>{formatDate(displayedUser?.last_login_at)}</strong>
          </div>
        </div>
      </section>

      <div className="account-grid">
        <div className="space-y-5">
          <AccountPanel icon={UserRound} title="Informations du compte" subtitle="Ces informations definissent votre profil utilisateur.">
            <dl className="account-info-grid">
              <div><dt>Nom</dt><dd>{displayedUser?.nom || '-'}</dd></div>
              <div><dt>Prenom</dt><dd>{displayedUser?.prenom || '-'}</dd></div>
              <div><dt>Email</dt><dd>{displayedUser?.email || '-'}</dd></div>
              <div><dt>Role</dt><dd>{role}</dd></div>
              <div><dt>Statut</dt><dd>{displayedUser?.statut || '-'}</dd></div>
              <div><dt>Email verifie le</dt><dd>{formatDate(displayedUser?.email_verified_at)}</dd></div>
            </dl>
          </AccountPanel>

          <AccountPanel icon={CheckCircle2} title="Modifier mes informations" subtitle="Vous pouvez modifier uniquement votre nom et votre prenom.">
            <form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2">
              <Field label="Nom" error={fieldError(errors, 'nom')}>
                <input className={inputClass} value={profileForm.nom} onChange={(e) => setProfileForm((f) => ({ ...f, nom: e.target.value }))} />
              </Field>
              <Field label="Prenom" error={fieldError(errors, 'prenom')}>
                <input className={inputClass} value={profileForm.prenom} onChange={(e) => setProfileForm((f) => ({ ...f, prenom: e.target.value }))} />
              </Field>
              <div className="md:col-span-2">
                <Button disabled={busy === 'profile'}>{busy === 'profile' ? 'Enregistrement...' : 'Enregistrer les modifications'}</Button>
              </div>
            </form>
          </AccountPanel>

          <AccountPanel icon={LockKeyhole} title="Changer mot de passe" subtitle="Le mot de passe actuel est obligatoire pour proteger votre compte.">
            <form onSubmit={changePassword} className="grid gap-4">
              <Field label="Mot de passe actuel" error={fieldError(errors, 'current_password')}>
                <input type="password" className={inputClass} value={passwordForm.current_password} onChange={(e) => setPasswordForm((f) => ({ ...f, current_password: e.target.value }))} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nouveau mot de passe" error={fieldError(errors, 'password')}>
                  <input type="password" className={inputClass} value={passwordForm.password} onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))} />
                </Field>
                <Field label="Confirmer nouveau mot de passe">
                  <input type="password" className={inputClass} value={passwordForm.password_confirmation} onChange={(e) => setPasswordForm((f) => ({ ...f, password_confirmation: e.target.value }))} />
                </Field>
              </div>
              <Button disabled={busy === 'password'}>{busy === 'password' ? 'Modification...' : 'Modifier le mot de passe'}</Button>
            </form>
          </AccountPanel>

          <AccountPanel icon={Mail} title="Changer email" subtitle="La nouvelle adresse Gmail devient active uniquement apres verification du code.">
            {emailStep === 'send' ? (
              <form onSubmit={sendEmailCode} className="grid gap-4">
                <Field label="Nouvelle adresse Gmail" error={fieldError(errors, 'email')}>
                  <input type="email" className={inputClass} value={emailForm.email} onChange={(e) => setEmailForm((f) => ({ ...f, email: e.target.value }))} placeholder="nom.prenom@gmail.com" />
                </Field>
                <Button disabled={busy === 'email-send'}>{busy === 'email-send' ? 'Envoi du code...' : 'Envoyer le code'}</Button>
              </form>
            ) : (
              <form onSubmit={verifyEmailCode} className="grid gap-4">
                <Alert type="success">Un code a ete envoye a votre nouvelle adresse Gmail.</Alert>
                <Field label="Code de verification" error={fieldError(errors, 'code')}>
                  <input className={inputClass} value={emailForm.code} onChange={(e) => setEmailForm((f) => ({ ...f, code: e.target.value }))} maxLength={6} inputMode="numeric" />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy === 'email-verify'}>{busy === 'email-verify' ? 'Verification...' : 'Verifier et modifier l’email'}</Button>
                  <Button type="button" variant="secondary" onClick={() => setEmailStep('send')}>Changer l’adresse</Button>
                </div>
              </form>
            )}
          </AccountPanel>
        </div>

        <div className="space-y-5">
          <AccountPanel icon={Palette} title="Personnalisation du profil" subtitle="Choisissez une icone visible dans votre profil et la barre laterale.">
            <ProfileIconPicker user={displayedUser} onSave={saveAvatar} saving={busy === 'avatar'} />
          </AccountPanel>

          <AccountPanel icon={ShieldCheck} title="Securite du compte" subtitle="Suivez rapidement l’etat de votre session et de votre compte.">
            <dl className="account-security-list">
              {securityItems.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
            <Button variant="secondary" onClick={logout} className="mt-5 w-full justify-center">
              <LogOut size={14} /> Se deconnecter
            </Button>
          </AccountPanel>
        </div>
      </div>
    </div>
  );
}
