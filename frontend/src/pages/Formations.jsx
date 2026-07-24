import { useMemo, useState } from 'react';
import { BookOpen, Plus, Save } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { createFormation, createTheme, getFormations, getThemes } from '../services/formationService';
import Skeleton from '../components/ui/Skeleton';
import ErrorBar from '../components/ui/ErrorBar';
import Modal from '../components/ui/Modal';
import { ToastContainer, useToast } from '../components/ui/Toast';

const emptyFormation = { theme_id: '', titre: '', description: '', objectif: '', duree: '', niveau: '' };
const emptyTheme = { nom: '', description: '' };
const fieldError = (errors, field) => errors?.[field]?.[0] ? <small className="field-error">{errors[field][0]}</small> : null;
const apiMessage = (err, fallback) => err.response?.data?.message || Object.values(err.response?.data?.errors || {})?.[0]?.[0] || fallback;

export default function Formations() {
  const formationsFetch = useFetch(getFormations, []);
  const themesFetch = useFetch(getThemes, []);
  const formations = formationsFetch.data || [];
  const themes = themesFetch.data || [];
  const [selectedId, setSelectedId] = useState(null);
  const [formationModal, setFormationModal] = useState(false);
  const [themeModal, setThemeModal] = useState(false);
  const [formationForm, setFormationForm] = useState(emptyFormation);
  const [themeForm, setThemeForm] = useState(emptyTheme);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const selected = formations.find((formation) => formation.id === (selectedId || formations[0]?.id));
  const grouped = useMemo(() => themes.map((theme) => ({ ...theme, items: formations.filter((formation) => Number(formation.theme_id) === Number(theme.id)) })), [themes, formations]);

  const refreshAll = () => { formationsFetch.refetch(); themesFetch.refetch(); };

  const saveFormation = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormErrors({});
    try {
      const payload = { ...formationForm, theme_id: Number(formationForm.theme_id), duree: Number(formationForm.duree) };
      await createFormation(payload);
      toast.success('Formation créée avec succès.');
      setFormationForm(emptyFormation);
      setFormationModal(false);
      refreshAll();
    } catch (err) {
      setFormErrors(err.response?.data?.errors || {});
      toast.error(apiMessage(err, 'Création de la formation impossible.'));
    } finally {
      setSaving(false);
    }
  };

  const saveTheme = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormErrors({});
    try {
      await createTheme(themeForm);
      toast.success('Thématique créée avec succès.');
      setThemeForm(emptyTheme);
      setThemeModal(false);
      refreshAll();
    } catch (err) {
      setFormErrors(err.response?.data?.errors || {});
      toast.error(apiMessage(err, 'Création de la thématique impossible.'));
    } finally {
      setSaving(false);
    }
  };

  if (formationsFetch.loading || themesFetch.loading) return <Skeleton rows={7} />;
  if (formationsFetch.error) return <ErrorBar message={formationsFetch.error} onRetry={formationsFetch.refetch} />;
  if (themesFetch.error) return <ErrorBar message={themesFetch.error} onRetry={themesFetch.refetch} />;

  return (
    <div className="page-stack">
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />
      <section className="page-title-row">
        <div><h1>Formations</h1><p>Catalogue réel des thématiques et formations OFPPT.</p></div>
        <div className="button-row"><button className="btn btn-secondary" onClick={() => setThemeModal(true)}><Plus size={16} /> Nouvelle thématique</button><button className="btn btn-primary" onClick={() => setFormationModal(true)}><Plus size={16} /> Nouvelle formation</button></div>
      </section>

      <section className="split-layout">
        <aside className="panel plan-list">
          {grouped.map((theme) => (
            <div key={theme.id} className="theme-block">
              <strong>{theme.nom}</strong>
              <span>{theme.description}</span>
              {theme.items.map((formation) => (
                <button key={formation.id} className={`plan-card card ${selected?.id === formation.id ? 'selected' : ''}`} onClick={() => setSelectedId(formation.id)}>
                  <strong>{formation.titre}</strong>
                  <small>{formation.duree || '-'} jours · {formation.niveau || '-'}</small>
                </button>
              ))}
              {!theme.items.length && <small className="empty-line">Aucune formation dans cette thématique.</small>}
            </div>
          ))}
          {!grouped.length && <div className="empty-state">Aucune thématique trouvée.</div>}
        </aside>

        <section className="panel plan-detail">
          {!selected ? <div className="empty-state"><BookOpen size={32} /> Sélectionnez une formation</div> : (
            <>
              <div className="panel-head"><div><h2>{selected.titre}</h2><p>{selected.description}</p></div><span className="badge gold">{selected.theme?.nom || 'Sans thématique'}</span></div>
              <div className="detail-grid">
                <p><strong>Objectif</strong><span>{selected.objectif || '-'}</span></p>
                <p><strong>Durée</strong><span>{selected.duree || '-'} jours</span></p>
                <p><strong>Niveau</strong><span>{selected.niveau || '-'}</span></p>
              </div>
            </>
          )}
        </section>
      </section>

      <Modal open={formationModal} onClose={() => setFormationModal(false)} title="Créer une formation">
        <form onSubmit={saveFormation} className="form-grid">
          <label>Thématique<select value={formationForm.theme_id} onChange={(event) => setFormationForm({ ...formationForm, theme_id: event.target.value })}><option value="">Choisir</option>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.nom}</option>)}</select>{fieldError(formErrors, 'theme_id')}</label>
          <label>Titre<input value={formationForm.titre} onChange={(event) => setFormationForm({ ...formationForm, titre: event.target.value })} />{fieldError(formErrors, 'titre')}</label>
          <label>Description<textarea value={formationForm.description} onChange={(event) => setFormationForm({ ...formationForm, description: event.target.value })} />{fieldError(formErrors, 'description')}</label>
          <label>Objectif<textarea value={formationForm.objectif} onChange={(event) => setFormationForm({ ...formationForm, objectif: event.target.value })} />{fieldError(formErrors, 'objectif')}</label>
          <label>Durée<input type="number" min="1" value={formationForm.duree} onChange={(event) => setFormationForm({ ...formationForm, duree: event.target.value })} />{fieldError(formErrors, 'duree')}</label>
          <label>Niveau<input value={formationForm.niveau} onChange={(event) => setFormationForm({ ...formationForm, niveau: event.target.value })} />{fieldError(formErrors, 'niveau')}</label>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setFormationModal(false)}>Annuler</button><button className="btn btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Enregistrement...' : 'Créer'}</button></div>
        </form>
      </Modal>

      <Modal open={themeModal} onClose={() => setThemeModal(false)} title="Créer une thématique">
        <form onSubmit={saveTheme} className="form-stack">
          <label>Nom<input value={themeForm.nom} onChange={(event) => setThemeForm({ ...themeForm, nom: event.target.value })} />{fieldError(formErrors, 'nom')}</label>
          <label>Description<textarea value={themeForm.description} onChange={(event) => setThemeForm({ ...themeForm, description: event.target.value })} />{fieldError(formErrors, 'description')}</label>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setThemeModal(false)}>Annuler</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Créer'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
