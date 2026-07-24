import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import DatePicker from '../components/forms/DatePicker';
import DateRangePicker from '../components/forms/DateRangePicker';
import SelectField from '../components/forms/SelectField';
import { Badge, Button, Card, Drawer, Field, inputClass, PageTitle } from '../components/ui';

const Stepper = ({ step }) => (
  <div className="mb-6 flex justify-end gap-3">
    {[1, 2, 3, 4, 5, 6].map((n) => (
      <span key={n} className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${n === step ? 'bg-[#008a94] text-white' : 'bg-white text-[#008a94]'}`}>{n}</span>
    ))}
  </div>
);

const emptyPlanForm = () => ({
  titre: '',
  annee: new Date().getFullYear(),
  periode_debut: '',
  periode_fin: '',
  objectif_general: '',
  description: '',
});
const emptyBesoinForm = () => ({
  domaine: '',
  probleme_observe: '',
  competence_a_ameliorer: '',
  public_cible: '',
  justification: '',
  theme_id: '',
});
const emptyThemeForm = () => ({ nom: '', description: '' });
const emptyFormationForm = (themeId = '') => ({ theme_id: themeId, titre: '', description: '', objectif: '', duree: 1, niveau: '' });

const loadPlan = async (id, setPlan) => {
  const { data } = await api.get(`/cdc/plans/${id}`);
  setPlan(data.data || data);
};
const loadThemes = async (setThemes) => {
  const { data } = await api.get('/themes');
  setThemes(data.data || data);
};
const loadFormations = async (setFormations) => {
  const { data } = await api.get('/formations');
  setFormations(data.data || data);
};
const errorText = (err, fallback) => err.response?.data?.message || Object.values(err.response?.data?.errors || {})?.[0]?.[0] || fallback;
const displayValue = (value, fallback = 'Non renseigne') => (value === null || value === undefined || value === '' ? fallback : value);
const parseStoredIds = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
};
const getPlanThemeIds = (plan) => new Set((plan?.besoins || []).map((b) => Number(b.theme_id)).filter(Boolean));

function ThemeDrawer({ open, onClose, onCreated }) {
  const [form, setForm] = useState(emptyThemeForm());
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/themes', form);
      onCreated(data.data || data);
      setForm(emptyThemeForm());
      onClose();
    } catch (err) {
      setError(errorText(err, 'Creation de la thematique impossible.'));
    }
  };
  return <Drawer open={open} title="Nouvelle thematique" subtitle="Ajoutez une thematique sans quitter le workflow." onClose={onClose}>
    {error && <Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nom"><input required className={inputClass} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></Field>
      <Field label="Description"><textarea required className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <Button className="w-full">Ajouter la thematique</Button>
    </form>
  </Drawer>;
}

function FormationDrawer({ open, themes, defaultThemeId, onClose, onCreated }) {
  const [form, setForm] = useState(emptyFormationForm(defaultThemeId));
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) setForm(emptyFormationForm(defaultThemeId || themes[0]?.id || ''));
  }, [open, defaultThemeId, themes]);
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, theme_id: Number(form.theme_id), duree: Number(form.duree) };
      const { data } = await api.post('/formations', payload);
      onCreated(data.data || data);
      onClose();
    } catch (err) {
      setError(errorText(err, 'Creation de la formation impossible.'));
    }
  };
  return <Drawer open={open} title="Nouvelle formation" subtitle="La formation sera disponible immediatement dans le choix du plan." onClose={onClose}>
    {error && <Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <form onSubmit={submit} className="space-y-4">
      <Field label="Thematique"><select required className={inputClass} value={form.theme_id} onChange={(e) => setForm({ ...form, theme_id: e.target.value })}><option value="">Choisir</option>{themes.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}</select></Field>
      <Field label="Titre"><input required className={inputClass} value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} /></Field>
      <Field label="Description"><textarea required className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <Field label="Objectif"><textarea required className={inputClass} value={form.objectif} onChange={(e) => setForm({ ...form, objectif: e.target.value })} /></Field>
      <Field label="Duree"><input required min="1" type="number" className={inputClass} value={form.duree} onChange={(e) => setForm({ ...form, duree: e.target.value })} /></Field>
      <Field label="Niveau"><input required className={inputClass} value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} /></Field>
      <Button className="w-full">Ajouter la formation</Button>
    </form>
  </Drawer>;
}

const besoinToForm = (besoin) => ({
  domaine: besoin.domaine || '',
  probleme_observe: besoin.probleme_observe || '',
  competence_a_ameliorer: besoin.competence_a_ameliorer || '',
  public_cible: besoin.public_cible || '',
  justification: besoin.justification || '',
  theme_id: besoin.theme_id || '',
});

function BesoinEditCard({ besoin, themes, draft, onDraftChange, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    ...besoinToForm(besoin),
    ...(draft || {}),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setForm({ ...besoinToForm(besoin), ...(draft || {}) });
  }, [besoin, draft]);
  const update = (key, value) => {
    const next = { ...form, [key]: value };
    setForm(next);
    onDraftChange?.(besoin.id, next);
  };
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put(`/cdc/besoins/${besoin.id}`, { ...form, theme_id: Number(form.theme_id) });
      onSaved();
    } catch (err) {
      setError(errorText(err, 'Modification du besoin impossible.'));
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    setError('');
    try {
      await api.delete(`/cdc/besoins/${besoin.id}`);
      onDeleted();
    } catch (err) {
      setError(errorText(err, 'Suppression du besoin impossible.'));
    }
  };
  return <Card>
    {error && <div className="mb-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
    <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
      <Field label="Domaine"><input required className={inputClass} value={form.domaine} onChange={(e) => update('domaine', e.target.value)} /></Field>
      <Field label="Thematique"><select required className={inputClass} value={form.theme_id} onChange={(e) => update('theme_id', e.target.value)}><option value="">Choisir</option>{themes.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}</select></Field>
      <Field label="Probleme observe"><textarea required className={inputClass} value={form.probleme_observe} onChange={(e) => update('probleme_observe', e.target.value)} /></Field>
      <Field label="Competence a ameliorer"><input required className={inputClass} value={form.competence_a_ameliorer} onChange={(e) => update('competence_a_ameliorer', e.target.value)} /></Field>
      <Field label="Public cible"><input required className={inputClass} value={form.public_cible} onChange={(e) => update('public_cible', e.target.value)} /></Field>
      <Field label="Justification"><textarea required className={inputClass} value={form.justification} onChange={(e) => update('justification', e.target.value)} /></Field>
      <div className="flex flex-wrap gap-2 md:col-span-2"><Button disabled={saving}>{saving ? 'Enregistrement...' : 'Modifier ce besoin'}</Button><Button type="button" variant="danger" onClick={remove}>Retirer</Button></div>
    </form>
  </Card>;
}

export function CdcPlanGeneral() {
  const nav = useNavigate();
  const [form, setForm] = useState(emptyPlanForm());
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/cdc/plans', form);
      nav(`/cdc/plans/${data.id}/besoins-thematiques`);
    } catch (err) {
      setError(errorText(err, 'Creation du plan impossible.'));
    }
  };
  return <>
    <Stepper step={1} />
    <PageTitle eyebrow="Workflow Plan CDC" title="Informations du plan" subtitle="Etape 1 sur 6" />
    {error && <Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <Card><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <Field label="Titre"><input required className={inputClass} value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} /></Field>
      <Field label="Annee"><input required min="2020" className={inputClass} type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: e.target.value })} /></Field>
      <DateRangePicker className="md:col-span-2" required label="Periode du plan" startDate={form.periode_debut} endDate={form.periode_fin} onChange={({ startDate, endDate }) => setForm({ ...form, periode_debut: startDate, periode_fin: endDate })} />
      <Field label="Objectif general"><textarea required className={inputClass} value={form.objectif_general} onChange={(e) => setForm({ ...form, objectif_general: e.target.value })} /></Field>
      <Field label="Description"><textarea required className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <div className="md:col-span-2 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => nav('/cdc/plans')}>Annuler</Button>
        <Button>Suivant</Button>
      </div>
    </form></Card>
  </>;
}

export function CdcPlanEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(emptyPlanForm());
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/cdc/plans/${id}`)
      .then(({ data }) => {
        const item = data.data || data;
        setPlan(item);
        setForm({
          titre: item.titre || '',
          annee: item.annee || new Date().getFullYear(),
          periode_debut: item.periode_debut || '',
          periode_fin: item.periode_fin || '',
          objectif_general: item.objectif_general || '',
          description: item.description || '',
        });
      })
      .catch((err) => setError(errorText(err, 'Plan introuvable.')))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put(`/cdc/plans/${id}`, form);
      setSuccess('Plan modifie avec succes.');
      nav(`/cdc/plans/${id}/besoins-thematiques`);
    } catch (err) {
      setError(errorText(err, 'Modification du plan impossible.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <><PageTitle title="Modifier le plan" /><Card>Chargement...</Card></>;
  const canEdit = ['brouillon', 'a_corriger'].includes(plan?.statut);
  return <>
    <Stepper step={1} />
    <PageTitle eyebrow="Workflow Plan CDC" title="Modifier le plan" subtitle="Etape 1 sur 6 - informations generales" />
    {error && <Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    {success && <Card className="mb-4 bg-emerald-50 text-emerald-700">{success}</Card>}
    {!canEdit && <Card className="mb-4 bg-amber-50 text-amber-800">Ce plan n'est plus modifiable car son statut est <b>{plan?.statut}</b>.</Card>}
    <Card><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <Field label="Titre"><input required disabled={!canEdit} className={inputClass} value={form.titre} onChange={(e) => update('titre', e.target.value)} /></Field>
      <Field label="Annee"><input required disabled={!canEdit} min="2020" className={inputClass} type="number" value={form.annee} onChange={(e) => update('annee', e.target.value)} /></Field>
      <DateRangePicker className="md:col-span-2" required disabled={!canEdit} label="Periode du plan" startDate={form.periode_debut} endDate={form.periode_fin} onChange={({ startDate, endDate }) => setForm((current) => ({ ...current, periode_debut: startDate, periode_fin: endDate }))} />
      <Field label="Objectif general"><textarea required disabled={!canEdit} className={inputClass} value={form.objectif_general} onChange={(e) => update('objectif_general', e.target.value)} /></Field>
      <Field label="Description"><textarea required disabled={!canEdit} className={inputClass} value={form.description} onChange={(e) => update('description', e.target.value)} /></Field>
      <div className="flex flex-wrap gap-3 md:col-span-2"><Button disabled={!canEdit || saving}>{saving ? 'Enregistrement...' : 'Enregistrer et suivant'}</Button><Button type="button" variant="secondary" onClick={() => nav('/cdc/plans')}>Retour</Button></div>
    </form></Card>
  </>;
}

export function CdcBesoins() {
  const { id } = useParams();
  const nav = useNavigate();
  const [plan, setPlan] = useState(null);
  const [themes, setThemes] = useState([]);
  const [form, setForm] = useState(emptyBesoinForm());
  const [besoinDrafts, setBesoinDrafts] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { loadPlan(id, setPlan); loadThemes(setThemes); }, [id]);
  useEffect(() => {
    if (!plan?.besoins) return;
    setBesoinDrafts((current) => {
      const next = { ...current };
      plan.besoins.forEach((besoin) => {
        next[besoin.id] = next[besoin.id] || besoinToForm(besoin);
      });
      return next;
    });
  }, [plan]);
  const add = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/cdc/plans/${id}/besoins`, { ...form, theme_id: Number(form.theme_id) });
      setForm(emptyBesoinForm());
      loadPlan(id, setPlan);
    } catch (err) {
      setError(errorText(err, 'Ajout du besoin impossible.'));
    }
  };
  const handleThemeCreated = (theme) => {
    setThemes((items) => [...items, theme]);
    setForm((current) => ({ ...current, theme_id: String(theme.id) }));
  };
  const refreshPlan = () => loadPlan(id, setPlan);
  const updateDraft = (besoinId, draft) => setBesoinDrafts((current) => ({ ...current, [besoinId]: draft }));
  const saveAllAndNext = async () => {
    setError('');
    try {
      for (const besoin of plan?.besoins || []) {
        const draft = besoinDrafts[besoin.id] || besoinToForm(besoin);
        await api.put(`/cdc/besoins/${besoin.id}`, { ...draft, theme_id: Number(draft.theme_id) });
      }
      await refreshPlan();
      nav(`/cdc/plans/${id}/formations`);
    } catch (err) {
      setError(errorText(err, 'Enregistrement des besoins impossible.'));
    }
  };
  return <>
    <Stepper step={2} />
    <PageTitle eyebrow="Workflow Plan CDC" title="Besoins & thematiques" subtitle="Etape 2 sur 6" />
    {error && <Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <Card className="mb-4 bg-cyan-50"><h2 className="text-xl font-black text-[#08235a]">Besoins deja lies a ce plan</h2><p className="mt-1 text-sm text-slate-600">Ces champs sont les donnees sauvegardees du plan. Modifiez-les ici, puis cliquez sur <b>Enregistrer et suivant</b>.</p></Card>
    <div className="grid gap-3">{plan?.besoins?.map((b) => <BesoinEditCard key={b.id} besoin={b} themes={themes} draft={besoinDrafts[b.id]} onDraftChange={updateDraft} onSaved={refreshPlan} onDeleted={refreshPlan} />)}</div>
    {!plan?.besoins?.length && <Card className="mb-4 text-center"><h2 className="text-xl font-black">Aucun besoin lie au plan</h2><p className="text-slate-500">Ajoutez au moins un besoin avant de choisir les formations.</p></Card>}
    <Card className="mt-4"><form onSubmit={add} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-[#08235a]">Ajouter un nouveau besoin au meme plan.</div>
      <Field label="Domaine"><input required className={inputClass} value={form.domaine} onChange={(e) => setForm({ ...form, domaine: e.target.value })} /></Field>
      <Field label="Thematique"><div className="flex gap-2"><select required className={inputClass} value={form.theme_id} onChange={(e) => setForm({ ...form, theme_id: e.target.value })}><option value="">Choisir</option>{themes.map((t) => <option value={t.id} key={t.id}>{t.nom}</option>)}</select><Button type="button" onClick={() => setDrawerOpen(true)}>+</Button></div></Field>
      <Field label="Probleme observe"><textarea required className={inputClass} value={form.probleme_observe} onChange={(e) => setForm({ ...form, probleme_observe: e.target.value })} /></Field>
      <Field label="Competence a ameliorer"><input required className={inputClass} value={form.competence_a_ameliorer} onChange={(e) => setForm({ ...form, competence_a_ameliorer: e.target.value })} /></Field>
      <Field label="Public cible"><input required className={inputClass} value={form.public_cible} onChange={(e) => setForm({ ...form, public_cible: e.target.value })} /></Field>
      <Field label="Justification"><textarea required className={inputClass} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} /></Field>
      <div className="md:col-span-2"><Button>Ajouter besoin</Button></div>
    </form></Card>
    <div className="mt-5 flex gap-3"><Button variant="secondary" onClick={() => nav(`/cdc/plans/${id}/edit`)}>Precedent</Button><Button disabled={!plan?.besoins?.length} onClick={saveAllAndNext}>Enregistrer et suivant</Button></div>
    <ThemeDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onCreated={handleThemeCreated} />
  </>;
}

export function CdcFormations() {
  const { id } = useParams();
  const nav = useNavigate();
  const storageKey = `plan-${id}-formations`;
  const [plan, setPlan] = useState(null);
  const [themes, setThemes] = useState([]);
  const [formations, setFormations] = useState([]);
  const [selected, setSelected] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { loadPlan(id, setPlan); loadThemes(setThemes); loadFormations(setFormations); }, [id]);
  useEffect(() => {
    if (!plan) return;
    const saved = parseStoredIds(storageKey);
    const existing = (plan.lignes?.map((l) => l.formation_id).filter(Boolean) || []).map(Number);
    setSelected(saved.length ? saved : existing);
  }, [plan, storageKey]);
  const themeIds = useMemo(() => getPlanThemeIds(plan), [plan]);
  const available = useMemo(() => formations.filter((f) => themeIds.has(Number(f.theme_id))), [formations, themeIds]);
  useEffect(() => {
    if (!plan || !formations.length) return;
    const allowedIds = new Set(available.map((f) => Number(f.id)));
    setSelected((current) => {
      const filtered = current.filter((formationId) => allowedIds.has(Number(formationId)));
      if (filtered.length !== current.length) {
        localStorage.setItem(storageKey, JSON.stringify(filtered));
      }
      return filtered;
    });
  }, [plan, formations, available, storageKey]);
  const defaultThemeId = Array.from(themeIds)[0] || '';
  const next = async () => {
    setError('');
    try {
      const availableIds = new Set(available.map((f) => Number(f.id)));
      const cleanSelected = selected.filter((formationId) => availableIds.has(Number(formationId)));
      for (const line of plan?.lignes || []) {
        if (!cleanSelected.includes(Number(line.formation_id))) await api.delete(`/cdc/lignes/${line.id}`);
      }
      localStorage.setItem(storageKey, JSON.stringify(cleanSelected));
      nav(`/cdc/plans/${id}/configuration`);
    } catch (err) {
      setError(errorText(err, 'Modification des formations impossible.'));
    }
  };
  const handleFormationCreated = (formation) => {
    setFormations((items) => [...items, formation]);
    if (themeIds.has(Number(formation.theme_id))) setSelected((items) => [...new Set([...items, Number(formation.id)])]);
  };
  return <>
    <Stepper step={3} />
    <PageTitle eyebrow="Workflow Plan CDC" title="Choix des formations" subtitle="Etape 3 sur 6" />
    <div className="mb-4 flex justify-end">
      <Button type="button" onClick={() => setDrawerOpen(true)}>+ Ajouter formation</Button>
    </div>
    {error && <Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    {available.length === 0 ? <Card className="text-center">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#008a94] text-3xl font-black text-white">+</div>
      <h2 className="text-xl font-black">Aucune formation disponible pour les thematiques choisies</h2>
      <p className="text-slate-500">Ajoutez une formation a la thematique selectionnee, puis elle apparaitra ici.</p>
      <Button className="mt-4" onClick={() => setDrawerOpen(true)}>Ajouter une formation</Button>
    </Card> : <div className="grid gap-3 md:grid-cols-2">{available.map((f) => {
      const isSelected = selected.includes(f.id);
      return <Card key={f.id} className={`formation-choice-card ${isSelected ? 'is-selected' : ''}`}>
        <label className="formation-choice-label">
          <input
            type="checkbox"
            className="formation-choice-input"
            checked={isSelected}
            onChange={(e) => setSelected(e.target.checked ? [...selected, f.id] : selected.filter((x) => x !== f.id))}
          />
          <span className="formation-choice-box" aria-hidden="true" />
          <div className="formation-choice-content">
            <b>{f.titre}</b>
            <p>{f.theme?.nom}</p>
            <p className="text-sm text-slate-500">{f.objectif}</p>
          </div>
        </label>
      </Card>;
    })}</div>}
    <div className="mt-5 flex gap-3"><Button variant="secondary" onClick={() => nav(`/cdc/plans/${id}/besoins-thematiques`)}>Precedent</Button><Button disabled={!selected.length} onClick={next}>Suivant</Button></div>
    <FormationDrawer open={drawerOpen} themes={themes.filter((t) => themeIds.has(Number(t.id)))} defaultThemeId={defaultThemeId} onClose={() => setDrawerOpen(false)} onCreated={handleFormationCreated} />
  </>;
}

export function CdcConfiguration() {
  const { id } = useParams();
  const nav = useNavigate();
  const storageKey = `plan-${id}-formations`;
  const [plan, setPlan] = useState(null);
  const [formations, setFormations] = useState([]);
  const [lines, setLines] = useState({});
  const [error, setError] = useState('');
  const themeIds = useMemo(() => getPlanThemeIds(plan), [plan]);
  const selected = useMemo(() => {
    const saved = parseStoredIds(storageKey);
    const existing = (plan?.lignes?.map((l) => l.formation_id).filter(Boolean) || []).map(Number);
    return saved.length ? saved : existing;
  }, [plan, storageKey]);
  useEffect(() => { loadPlan(id, setPlan); api.get('/formations').then((r) => setFormations(r.data.data || r.data)); }, [id]);
  useEffect(() => {
    if (!plan?.lignes) return;
    const current = {};
    plan.lignes.forEach((l) => {
      current[l.formation_id] = {
        id: l.id,
        priorite: l.priorite || '',
        public_cible: l.public_cible || '',
        nombre_formateurs: l.nombre_formateurs || '',
        duree_proposee: l.duree_proposee || '',
        periode_souhaitee: l.periode_souhaitee || '',
        remarque: l.remarque || '',
        besoin_formation_id: l.besoin_formation_id || '',
        hebergement_necessaire: Boolean(l.hebergement_necessaire),
        nombre_hors_ville: l.nombre_hors_ville || '',
        ville_proposee: l.ville_proposee || '',
        remarque_logistique: l.remarque_logistique || '',
      };
    });
    setLines(current);
  }, [plan]);
  const selectedFormations = useMemo(
    () => formations.filter((f) => selected.includes(Number(f.id)) && themeIds.has(Number(f.theme_id))),
    [formations, selected, themeIds],
  );
  useEffect(() => {
    if (!plan || !formations.length) return;
    const allowedIds = new Set(selectedFormations.map((f) => Number(f.id)));
    const filtered = selected.filter((formationId) => allowedIds.has(Number(formationId)));
    if (filtered.length !== selected.length) {
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    }
  }, [plan, formations, selected, selectedFormations, storageKey]);
  const compatibleBesoins = (formation) => (plan?.besoins || []).filter((b) => Number(b.theme_id) === Number(formation.theme_id));
  const selectedBesoinValue = (formation) => {
    const value = lines[formation.id]?.besoin_formation_id || '';
    return compatibleBesoins(formation).some((b) => Number(b.id) === Number(value)) ? value : '';
  };
  const update = (formationId, key, value) => setLines({ ...lines, [formationId]: { ...lines[formationId], [key]: value } });
  const save = async () => {
    setError('');
    try {
      for (const f of selectedFormations) {
        const l = lines[f.id] || {};
        const matchingBesoin = plan?.besoins?.find((b) => Number(b.theme_id) === Number(f.theme_id));
        const payload = {
          formation_id: f.id,
          besoin_formation_id: l.besoin_formation_id || matchingBesoin?.id || null,
          priorite: l.priorite,
          public_cible: l.public_cible,
          nombre_formateurs: Number(l.nombre_formateurs),
          duree_proposee: l.duree_proposee ? Number(l.duree_proposee) : null,
          periode_souhaitee: l.periode_souhaitee,
          remarque: l.remarque,
        };
        if (l.id) await api.put(`/cdc/lignes/${l.id}`, payload);
        else await api.post(`/cdc/plans/${id}/lignes`, payload);
      }
      nav(`/cdc/plans/${id}/documents-logistique`);
    } catch (err) {
      setError(errorText(err, 'Configuration incomplete. Tous les champs sont requis.'));
    }
  };
  return <>
    <Stepper step={4} />
    <PageTitle eyebrow="Workflow Plan CDC" title="Configuration des formations" subtitle="Etape 4 sur 6" />
    {error && <Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    {!selectedFormations.length && <Card className="text-center"><h2 className="text-xl font-black">Aucune formation selectionnee</h2><p className="text-slate-500">Retournez a l'etape precedente pour choisir au moins une formation.</p></Card>}
    <div className="grid gap-4">{selectedFormations.map((f) => {
      const besoins = compatibleBesoins(f);
      return <Card key={f.id}><h3 className="font-black">{f.titre}</h3><p className="mt-1 text-sm font-bold text-[#008a94]">Thematique: {f.theme?.nom || 'Non renseignee'}</p><div className="mt-4 grid gap-3 md:grid-cols-3">
      <Field label="Besoin lie"><SelectField value={selectedBesoinValue(f)} onChange={(value) => update(f.id, 'besoin_formation_id', value)} placeholder="Aucun besoin specifique" options={[{ value: '', label: 'Aucun besoin specifique' }, ...besoins.map((b) => ({ value: b.id, label: `${b.domaine} - ${b.theme?.nom || 'Sans thematique'}` }))]} />{besoins.length === 0 && <p className="mt-2 text-xs font-bold text-amber-700">Aucun besoin compatible avec la thematique de cette formation.</p>}</Field>
      <Field label="Priorite"><SelectField required value={lines[f.id]?.priorite || ''} onChange={(value) => update(f.id, 'priorite', value)} placeholder="Choisir" options={[{ value: '', label: 'Choisir' }, { value: 'moyenne', label: 'Moyenne' }, { value: 'haute', label: 'Haute' }, { value: 'basse', label: 'Basse' }]} /></Field>
      <Field label="Public cible"><input required className={inputClass} value={lines[f.id]?.public_cible || ''} onChange={(e) => update(f.id, 'public_cible', e.target.value)} /></Field>
      <Field label="Nombre formateurs"><input required min="1" className={inputClass} type="number" value={lines[f.id]?.nombre_formateurs || ''} onChange={(e) => update(f.id, 'nombre_formateurs', e.target.value)} /></Field>
      <Field label="Duree proposee"><input required min="1" className={inputClass} type="number" value={lines[f.id]?.duree_proposee || ''} onChange={(e) => update(f.id, 'duree_proposee', e.target.value)} /></Field>
      <Field label="Periode souhaitee"><DatePicker required minDate={plan?.periode_debut || ''} maxDate={plan?.periode_fin || ''} value={lines[f.id]?.periode_souhaitee || ''} onChange={(value) => update(f.id, 'periode_souhaitee', value)} /></Field>
      <Field label="Remarque"><textarea required className={inputClass} value={lines[f.id]?.remarque || ''} onChange={(e) => update(f.id, 'remarque', e.target.value)} /></Field>
    </div></Card>;
    })}</div>
    <div className="mt-5 flex gap-3"><Button variant="secondary" onClick={() => nav(`/cdc/plans/${id}/formations`)}>Precedent</Button><Button disabled={!selectedFormations.length} onClick={save}>Enregistrer et suivant</Button></div>
  </>;
}

export function CdcDocuments() {
  const { id } = useParams();
  const nav = useNavigate();
  const [plan, setPlan] = useState(null);
  const [lineForms, setLineForms] = useState({});
  const [doc, setDoc] = useState({ titre: '', type: 'programme', file_path: 'documents/demo.pdf' });
  const [error, setError] = useState('');
  useEffect(() => { loadPlan(id, setPlan); }, [id]);
  useEffect(() => {
    if (!plan?.lignes) return;
    const current = {};
    plan.lignes.forEach((l) => {
      current[l.id] = {
        formation_id: l.formation_id,
        besoin_formation_id: l.besoin_formation_id || null,
        priorite: l.priorite,
        public_cible: l.public_cible,
        nombre_formateurs: l.nombre_formateurs,
        duree_proposee: l.duree_proposee || '',
        periode_souhaitee: l.periode_souhaitee || '',
        remarque: l.remarque || '',
        hebergement_necessaire: Boolean(l.hebergement_necessaire),
        nombre_hors_ville: l.nombre_hors_ville || '',
        ville_proposee: l.ville_proposee || '',
        remarque_logistique: l.remarque_logistique || '',
      };
    });
    setLineForms(current);
  }, [plan]);
  const updateLine = (lineId, key, value) => setLineForms((current) => ({ ...current, [lineId]: { ...current[lineId], [key]: value } }));
  const add = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/cdc/plans/${id}/documents`, doc);
      setDoc({ titre: '', type: 'programme', file_path: 'documents/demo.pdf' });
      loadPlan(id, setPlan);
    } catch (err) {
      setError(errorText(err, 'Ajout du document impossible.'));
    }
  };
  const saveAndNext = async () => {
    setError('');
    try {
      for (const l of plan?.lignes || []) {
        const form = lineForms[l.id] || {};
        await api.put(`/cdc/lignes/${l.id}`, {
          formation_id: form.formation_id,
          besoin_formation_id: form.besoin_formation_id || l.besoin_formation_id || null,
          priorite: form.priorite,
          public_cible: form.public_cible,
          nombre_formateurs: Number(form.nombre_formateurs),
          duree_proposee: form.duree_proposee ? Number(form.duree_proposee) : null,
          periode_souhaitee: form.periode_souhaitee || null,
          remarque: form.remarque || null,
          hebergement_necessaire: Boolean(form.hebergement_necessaire),
          nombre_hors_ville: form.nombre_hors_ville ? Number(form.nombre_hors_ville) : null,
          ville_proposee: form.ville_proposee || null,
          remarque_logistique: form.remarque_logistique || null,
        });
      }
      nav(`/cdc/plans/${id}/resume`);
    } catch (err) {
      setError(errorText(err, 'Enregistrement de la logistique impossible.'));
    }
  };
  return <>
    <Stepper step={5} />
    <PageTitle eyebrow="Workflow Plan CDC" title="Documents & logistique" subtitle="Etape 5 sur 6" />
    <div className="grid gap-4">{plan?.lignes?.map((l) => <Card key={l.id}><b>{l.formation?.titre}</b><div className="mt-4 grid gap-3 md:grid-cols-2">
      <Field label="Hebergement necessaire"><select className={inputClass} value={lineForms[l.id]?.hebergement_necessaire ? '1' : '0'} onChange={(e) => updateLine(l.id, 'hebergement_necessaire', e.target.value === '1')}><option value="0">Non</option><option value="1">Oui</option></select></Field>
      <Field label="Nombre hors ville"><input min="0" className={inputClass} type="number" value={lineForms[l.id]?.nombre_hors_ville || ''} onChange={(e) => updateLine(l.id, 'nombre_hors_ville', e.target.value)} /></Field>
      <Field label="Ville proposee"><input className={inputClass} value={lineForms[l.id]?.ville_proposee || ''} onChange={(e) => updateLine(l.id, 'ville_proposee', e.target.value)} /></Field>
      <Field label="Remarque logistique"><textarea className={inputClass} value={lineForms[l.id]?.remarque_logistique || ''} onChange={(e) => updateLine(l.id, 'remarque_logistique', e.target.value)} /></Field>
    </div></Card>)}</div>
    {error && <Card className="mt-4 bg-red-50 text-red-700">{error}</Card>}
    <Card className="mt-4"><form onSubmit={add} className="grid gap-3 md:grid-cols-3"><Field label="Titre document"><input required className={inputClass} value={doc.titre} onChange={(e) => setDoc({ ...doc, titre: e.target.value })} /></Field><Field label="Type"><select required className={inputClass} value={doc.type} onChange={(e) => setDoc({ ...doc, type: e.target.value })}><option value="programme">programme</option><option value="fiche_besoin">fiche_besoin</option><option value="autre">autre</option></select></Field><Field label="Chemin fichier"><input required className={inputClass} value={doc.file_path} onChange={(e) => setDoc({ ...doc, file_path: e.target.value })} /></Field><div className="flex items-end"><Button>Ajouter document</Button></div></form></Card>
    <div className="mt-5 flex gap-3"><Button variant="secondary" onClick={() => nav(`/cdc/plans/${id}/configuration`)}>Precedent</Button><Button onClick={saveAndNext}>Enregistrer et suivant</Button></div>
  </>;
}

export function CdcResume() {
  const { id } = useParams();
  const nav = useNavigate();
  const [plan, setPlan] = useState(null);
  useEffect(() => { loadPlan(id, setPlan); }, [id]);
  const submit = async () => { await api.post(`/cdc/plans/${id}/submit`); nav(`/cdc/plans/${id}/details`); };
  return <>
    <Stepper step={6} />
    <PageTitle eyebrow="Workflow Plan CDC" title="Resume & soumission" subtitle="Etape 6 sur 6" />
    <PlanFullContent plan={plan} />
    <div className="mt-5 flex gap-3"><Button variant="secondary" onClick={() => nav(`/cdc/plans/${id}/documents-logistique`)}>Precedent</Button><Button onClick={submit}>Soumettre pour validation</Button></div>
  </>;
}

function PlanFullContent({ plan }) {
  if (!plan) return <Card>Chargement...</Card>;
  return <div className="grid gap-4">
    <Card><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><h2 className="text-2xl font-black text-[#08235a]">{plan.titre}</h2><p className="text-slate-500">Annee {plan.annee} - du {displayValue(plan.periode_debut)} au {displayValue(plan.periode_fin)}</p></div><Badge value={plan.statut} /></div><div className="mt-4 grid gap-3 md:grid-cols-2"><p><b>Objectif general:</b> {displayValue(plan.objectif_general)}</p><p><b>Description:</b> {displayValue(plan.description)}</p>{plan.commentaire_validation&&<p className="md:col-span-2"><b>Commentaire validation:</b> {plan.commentaire_validation}</p>}</div></Card>
    <Card><h3 className="mb-4 text-xl font-black text-[#08235a]">Besoins & thematiques</h3>{!plan.besoins?.length&&<p className="text-slate-500">Aucun besoin enregistre.</p>}<div className="grid gap-3">{plan.besoins?.map((b) => <div key={b.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col justify-between gap-2 md:flex-row"><b>{displayValue(b.domaine)}</b><span className="font-bold text-[#008a94]">{displayValue(b.theme?.nom)}</span></div><div className="mt-3 grid gap-2 text-sm md:grid-cols-2"><p><b>Probleme observe:</b> {displayValue(b.probleme_observe)}</p><p><b>Competence a ameliorer:</b> {displayValue(b.competence_a_ameliorer)}</p><p><b>Public cible:</b> {displayValue(b.public_cible)}</p><p><b>Justification:</b> {displayValue(b.justification)}</p></div></div>)}</div></Card>
    <Card><h3 className="mb-4 text-xl font-black text-[#08235a]">Formations configurees</h3>{!plan.lignes?.length&&<p className="text-slate-500">Aucune formation configuree.</p>}<div className="grid gap-3">{plan.lignes?.map((l) => <div key={l.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col justify-between gap-2 md:flex-row"><b>{displayValue(l.formation?.titre)}</b><Badge value={l.priorite} /></div><div className="mt-3 grid gap-2 text-sm md:grid-cols-3"><p><b>Thematique:</b> {displayValue(l.formation?.theme?.nom)}</p><p><b>Public cible:</b> {displayValue(l.public_cible)}</p><p><b>Nombre formateurs:</b> {displayValue(l.nombre_formateurs)}</p><p><b>Duree proposee:</b> {displayValue(l.duree_proposee)}</p><p><b>Periode souhaitee:</b> {displayValue(l.periode_souhaitee)}</p><p><b>Remarque:</b> {displayValue(l.remarque)}</p><p><b>Hebergement:</b> {l.hebergement_necessaire ? 'Oui' : 'Non'}</p><p><b>Hors ville:</b> {displayValue(l.nombre_hors_ville)}</p><p><b>Ville proposee:</b> {displayValue(l.ville_proposee)}</p><p className="md:col-span-3"><b>Remarque logistique:</b> {displayValue(l.remarque_logistique)}</p></div></div>)}</div></Card>
    <Card><h3 className="mb-4 text-xl font-black text-[#08235a]">Documents</h3>{!plan.documents?.length&&<p className="text-slate-500">Aucun document ajoute.</p>}{plan.documents?.map((d) => <div key={d.id} className="mb-2 rounded-2xl border border-slate-200 p-3"><b>{d.titre}</b><p className="text-sm text-slate-500">{d.type} - {d.file_path}</p></div>)}</Card>
  </div>;
}

export function PlanDetails() {
  const { id } = useParams();
  const location = useLocation();
  const [plan, setPlan] = useState(null);
  const isResponsableFormation = location.pathname.includes('responsable-formation');
  const isDr = location.pathname.includes('/dr/');
  const isCdc = location.pathname.includes('/cdc/');
  const plansPath = isResponsableFormation ? '/responsable-formation/plans' : isDr ? '/dr/plans' : '/cdc/plans';
  const endpoint = isResponsableFormation ? `/responsable-formation/plans/${id}` : isDr ? `/dr/plans/${id}` : `/cdc/plans/${id}`;
  useEffect(() => { api.get(endpoint).then((r) => setPlan(r.data.data || r.data)); }, [endpoint]);
  return <>{(isResponsableFormation || isCdc || isDr) && <div className="mb-4"><Link to={plansPath}><Button variant="secondary">Retour aux plans</Button></Link></div>}<PageTitle title="Details du plan" subtitle="Dossier complet: informations, besoins, formations, logistique et documents." /><PlanFullContent plan={plan} /></>;
}
