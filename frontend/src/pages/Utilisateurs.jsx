import { useMemo, useState } from 'react';
import { KeyRound, Pencil, RotateCcw, ShieldOff, UserCheck, UserPlus } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { createUser, getUsers, reactivateUser, resetUserPassword, suspendUser, updateUser } from '../services/userService';
import Skeleton from '../components/ui/Skeleton';
import ErrorBar from '../components/ui/ErrorBar';
import Modal from '../components/ui/Modal';
import { ToastContainer, useToast } from '../components/ui/Toast';

const roles = [
  ['responsable_cdc', 'Responsable CDC'],
  ['responsable_formation', 'Responsable formation'],
  ['responsable_dr', 'Responsable DR'],
  ['formateur_animateur', 'Formateur animateur'],
  ['formateur_participant', 'Formateur participant'],
];
const allRoles = [['administrateur', 'Administrateur'], ...roles];
const statuts = [['actif', 'Actif'], ['en_attente_activation', 'En attente'], ['suspendu', 'Suspendu']];
const emptyForm = { nom: '', prenom: '', email: '', role: 'formateur_participant', region: '', statut: 'en_attente_activation' };
const statusLabel = (value) => ({ actif: 'Actif', en_attente_activation: 'En attente', suspendu: 'Suspendu' }[value] || value || '-');
const roleLabel = (value) => Object.fromEntries(allRoles)[value] || value;
const fieldError = (errors, field) => errors?.[field]?.[0] ? <small className="field-error">{errors[field][0]}</small> : null;
const apiMessage = (err, fallback) => err.response?.data?.message || Object.values(err.response?.data?.errors || {})?.[0]?.[0] || fallback;

export default function Utilisateurs() {
  const { data, loading, error, refetch } = useFetch(getUsers, []);
  const users = data || [];
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const toast = useToast();

  const filtered = useMemo(() => users.filter((user) => `${user.nom_complet || ''} ${user.nom || ''} ${user.prenom || ''} ${user.email || ''} ${user.role || ''}`.toLowerCase().includes(search.toLowerCase())), [users, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setTemporaryPassword('');
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({ nom: user.nom || '', prenom: user.prenom || '', email: user.email || '', role: user.role || 'formateur_participant', region: user.region || '', statut: user.statut || 'en_attente_activation' });
    setFormErrors({});
    setTemporaryPassword('');
    setModalOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormErrors({});
    setTemporaryPassword('');
    try {
      if (editing) {
        await updateUser(editing.id, form);
        toast.success('Utilisateur modifié avec succès.');
        setModalOpen(false);
      } else {
        const payload = { nom: form.nom, prenom: form.prenom, email: form.email, role: form.role, region: form.role === 'responsable_dr' ? form.region : '' };
        const response = await createUser(payload);
        setTemporaryPassword(response.data.temporary_password);
        toast.success('Utilisateur créé avec succès.');
      }
      refetch();
    } catch (err) {
      setFormErrors(err.response?.data?.errors || {});
      toast.error(apiMessage(err, editing ? 'Erreur lors de la modification.' : 'Erreur lors de la création.'));
    } finally {
      setSaving(false);
    }
  };

  const suspend = async (user) => {
    if (!window.confirm(`Suspendre ${user.nom_complet || user.email} ?`)) return;
    try { await suspendUser(user.id); toast.success('Compte suspendu.'); refetch(); }
    catch (err) { toast.error(apiMessage(err, 'Suspension impossible.')); }
  };

  const reactivate = async (user) => {
    try { await reactivateUser(user.id); toast.success('Compte réactivé.'); refetch(); }
    catch (err) { toast.error(apiMessage(err, 'Réactivation impossible.')); }
  };

  const resetPassword = async (user) => {
    if (!window.confirm(`Réinitialiser le mot de passe de ${user.nom_complet || user.email} ?`)) return;
    try { const response = await resetUserPassword(user.id); setTemporaryPassword(response.data.temporary_password); toast.success('Mot de passe temporaire généré.'); refetch(); }
    catch (err) { toast.error(apiMessage(err, 'Réinitialisation impossible.')); }
  };

  if (loading) return <Skeleton rows={8} />;
  if (error) return <ErrorBar message={error} onRetry={refetch} />;

  return (
    <div className="page-stack">
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />
      <section className="page-title-row">
        <div><h1>Gestion des utilisateurs</h1><p>Données réelles Laravel: création, modification, suspension et réinitialisation.</p></div>
        <div className="toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un utilisateur" /><button className="btn btn-primary" onClick={openCreate}><UserPlus size={16} /> Nouvel utilisateur</button></div>
      </section>

      {temporaryPassword && <section className="panel success-panel"><strong>Mot de passe temporaire</strong><p>{temporaryPassword}</p><small>Copiez-le maintenant: il est affiché une seule fois après l’action.</small></section>}

      <section className="panel">
        <table className="data-table">
          <thead><tr><th>#</th><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((user, index) => (
              <tr key={user.id}>
                <td>{index + 1}</td>
                <td>{user.nom_complet || `${user.prenom || ''} ${user.nom || ''}`}</td>
                <td>{user.email}</td>
                <td><span className="role-badge">{roleLabel(user.role)}</span></td>
                <td><span className={`badge ${user.statut === 'actif' ? 'success' : user.statut === 'suspendu' ? 'danger' : 'warn'}`}>{statusLabel(user.statut)}</span></td>
                <td className="actions-cell">
                  <button className="table-action" onClick={() => openEdit(user)} aria-label="Modifier"><Pencil size={15} /></button>
                  {user.statut === 'suspendu' ? <button className="table-action" onClick={() => reactivate(user)} aria-label="Réactiver"><UserCheck size={15} /></button> : <button className="table-action danger" onClick={() => suspend(user)} aria-label="Suspendre"><ShieldOff size={15} /></button>}
                  <button className="table-action" onClick={() => resetPassword(user)} aria-label="Réinitialiser"><KeyRound size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state">Aucun utilisateur trouvé.</div>}
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier un utilisateur' : 'Créer un utilisateur'}>
        <form onSubmit={save} className="form-grid">
          <label>Nom<input value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} />{fieldError(formErrors, 'nom')}</label>
          <label>Prénom<input value={form.prenom} onChange={(event) => setForm({ ...form, prenom: event.target.value })} />{fieldError(formErrors, 'prenom')}</label>
          <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />{fieldError(formErrors, 'email')}</label>
          <label>Rôle<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{(editing ? allRoles : roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{fieldError(formErrors, 'role')}</label>
          <label>Région<input value={form.region || ''} onChange={(event) => setForm({ ...form, region: event.target.value })} placeholder="Obligatoire pour Responsable DR" />{fieldError(formErrors, 'region')}</label>
          {editing && <label>Statut<select value={form.statut} onChange={(event) => setForm({ ...form, statut: event.target.value })}>{statuts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{fieldError(formErrors, 'statut')}</label>}
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
