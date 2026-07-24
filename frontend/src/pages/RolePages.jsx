import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import DatePicker from '../components/forms/DatePicker';
import DateRangePicker from '../components/forms/DateRangePicker';
import { Badge, Button, Card, Field, inputClass, PageTitle, Table } from '../components/ui';
import { DownloadDocumentButton, planColumns, sessionColumns, absenceColumns } from './CommonPages';
import { moroccanRegions } from '../utils/regions';

export function ResponsablePlans(){
  const [rows,setRows]=useState([]);
  const [comment,setComment]=useState('');
  const [error,setError]=useState('');
  const [search,setSearch]=useState('');
  const [statusFilter,setStatusFilter]=useState('all');
  const [page,setPage]=useState(1);
  const perPage=5;

  useEffect(()=>{
    api.get('/responsable-formation/plans').then(r=>setRows(r.data.data||r.data));
  },[]);

  const review=async(id,path,body={})=>{
    setError('');
    try{
      await api.post(`/responsable-formation/plans/${id}/${path}`,body);
      location.reload();
    }catch(err){
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors||{})?.[0]?.[0] || 'Action impossible.');
    }
  };

  const statusOptions = useMemo(
    () => [...new Set(rows.map((row) => String(row?.statut || '').toLowerCase()).filter(Boolean))].sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const statusOk = statusFilter === 'all' || String(row?.statut || '').toLowerCase() === statusFilter;
      if (!query) return statusOk;
      const searchable = `${row?.titre || ''} ${row?.annee || ''} ${row?.statut || ''}`.toLowerCase();
      return statusOk && searchable.includes(query);
    });
  }, [rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredRows.slice(start, start + perPage);
  }, [filteredRows, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

  const visiblePages = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  const startRow = filteredRows.length ? (currentPage - 1) * perPage + 1 : 0;
  const endRow = Math.min(currentPage * perPage, filteredRows.length);

  return <>
    <PageTitle title="Plans a traiter" subtitle="Consultez le dossier complet avant validation." />
    {error&&<Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}

    <Card className="mb-4">
      <Field label="Commentaire correction/refus"><input className={inputClass} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Obligatoire pour demander correction ou refuser"/></Field>
    </Card>

    <Card className="list-toolbar-card mb-4">
      <div className="list-toolbar-grid">
        <div className="list-toolbar-search-wrap">
          <input className={`${inputClass} list-toolbar-search`} placeholder="Rechercher plan..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Field label="Statut">
          <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tous</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
          </select>
        </Field>
      </div>
    </Card>

    <Table columns={planColumns} rows={pagedRows} renderActions={p=><div className="flex flex-wrap gap-2"><Link to={`/responsable-formation/plans/${p.id}`}><Button variant="secondary">Voir dossier</Button></Link><Button onClick={()=>review(p.id,'validate')}>Valider</Button><Button variant="secondary" onClick={()=>review(p.id,'correction',{commentaire_validation:comment})}>Correction</Button><Button variant="danger" onClick={()=>review(p.id,'refuse',{commentaire_validation:comment})}>Refuser</Button></div>}/>

    <Card className="list-pagination-card mt-3">
      <div className="list-pagination-row">
        <p>{`Affichage ${startRow}-${endRow} sur ${filteredRows.length}`}</p>
        <div className="list-pagination-controls">
          <button type="button" className="list-page-btn" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
          {visiblePages.map((pageNumber) => <button key={pageNumber} type="button" className={`list-page-btn ${pageNumber === currentPage ? 'is-active' : ''}`} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}
          <button type="button" className="list-page-btn" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>›</button>
        </div>
      </div>
    </Card>
  </>;
}

export function ResponsableSessionActions({ session }) {
  const buttonBase = 'inline-flex min-w-[112px] items-center justify-center rounded-full px-4 py-2 text-xs font-black transition shadow-sm';
  return <div className="grid gap-2 sm:grid-cols-2">
    <Link className={`${buttonBase} border border-slate-200 bg-white text-[#08235a] hover:border-[#008a94] hover:text-[#008a94]`} to={`/responsable-formation/sessions/${session.id}`}>Détails</Link>
    <Link className={`${buttonBase} bg-[#08235a] text-white hover:bg-[#0b347c]`} to={`/responsable-formation/sessions/${session.id}/edit`}>Modifier</Link>
    <Link className={`${buttonBase} bg-[#008a94] text-white hover:bg-[#00747c]`} to={`/responsable-formation/evaluations?session_id=${session.id}`}>Évaluations</Link>
    <Link className={`${buttonBase} bg-orange-500 text-white hover:bg-orange-600`} to={`/responsable-formation/sessions/${session.id}/hebergements`}>Hébergements</Link>
  </div>;
}

export function ResponsableEvaluationsPage(){
  const [searchParams]=useSearchParams();
  const [rows,setRows]=useState([]);
  const [sessions,setSessions]=useState([]);
  const [filters,setFilters]=useState({session_id:searchParams.get('session_id')||'',note:''});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{api.get('/responsable-formation/sessions').then(r=>setSessions(r.data.data||r.data)).catch(()=>setSessions([]));},[]);
  const params=()=>Object.fromEntries(Object.entries(filters).filter(([,v])=>v!==''));
  const load=async()=>{
    setLoading(true); setError('');
    try{const {data}=await api.get('/responsable-formation/evaluations',{params:params()}); setRows(data.data||data);}
    catch(err){setError(err.response?.data?.message || Object.values(err.response?.data?.errors||{})?.[0]?.[0] || 'Chargement des evaluations impossible.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{load();},[]);
  const columns=[
    {key:'participant',label:'Participant',render:r=>r.participant?.nom_complet||'-'},
    {key:'email',label:'Email',render:r=>r.participant?.email||'-'},
    {key:'formation',label:'Formation',render:r=>r.session?.formation||'-'},
    {key:'session',label:'Date session',render:r=>r.session?.date_session||'-'},
    {key:'note',label:'Note'},
    {key:'satisfaction',label:'Satisfaction',render:r=>r.satisfaction||'-'},
    {key:'commentaire',label:'Commentaire',render:r=>r.commentaire||'-'},
    {key:'competences_acquises',label:'Competences acquises',render:r=>r.competences_acquises||'-'},
    {key:'date_evaluation',label:'Date evaluation',render:r=>r.date_evaluation||'-'},
  ];
  return <><PageTitle title="Evaluations des participants" subtitle="Consultez les retours envoyes apres les sessions terminees."/>
    {error&&<Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <Card className="mb-4"><div className="grid gap-4 md:grid-cols-3">
      <Field label="Session"><select className={inputClass} value={filters.session_id} onChange={e=>setFilters({...filters,session_id:e.target.value})}><option value="">Toutes les sessions</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.formation?.titre||`Session #${s.id}`} - {s.date_session}</option>)}</select></Field>
      <Field label="Note"><select className={inputClass} value={filters.note} onChange={e=>setFilters({...filters,note:e.target.value})}><option value="">Toutes les notes</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}/5</option>)}</select></Field>
      <div className="flex items-end"><Button type="button" disabled={loading} onClick={load}>{loading?'Chargement...':'Filtrer'}</Button></div>
    </div></Card>
    <Table columns={columns} rows={rows}/>
  </>;
}

const rfSessionKey = 'responsable-formation-session-draft';
const getSessionDraft = () => JSON.parse(localStorage.getItem(rfSessionKey) || '{}');
const saveSessionDraft = (patch) => localStorage.setItem(rfSessionKey, JSON.stringify({ ...getSessionDraft(), ...patch }));
const clearSessionDraft = () => localStorage.removeItem(rfSessionKey);
const sessionSteps = ['Plan', 'Planification', 'Participants', 'Resume'];
function SessionStepper({ step }) { return <div className="mb-6 flex flex-wrap justify-end gap-3">{sessionSteps.map((label, i) => <span key={label} className={`rounded-full px-4 py-2 text-xs font-black ${i + 1 === step ? 'bg-[#008a94] text-white' : 'bg-white text-[#008a94]'}`}>{i + 1}. {label}</span>)}</div>; }
function formatLine(line) { return `${line.plan?.titre || 'Plan'} - ${line.formation?.titre || 'Formation'}`; }

export function SessionCreate(){
  const nav=useNavigate();
  const [plans,setPlans]=useState([]);
  const [ligne,setLigne]=useState(getSessionDraft().ligne_plan_formation_id || '');
  const [error,setError]=useState('');
  useEffect(()=>{api.get('/responsable-formation/plans?statut=valide').then(r=>setPlans(r.data.data||r.data));},[]);
  const lines=plans.flatMap(p=>(p.lignes||[]).map(l=>({...l,plan:p})));
  const next=(e)=>{e.preventDefault(); const selected=lines.find(l=>String(l.id)===String(ligne)); if(!selected){setError('Choisissez une formation issue d un plan valide.'); return;} saveSessionDraft({ligne_plan_formation_id:Number(ligne), ligne_label:formatLine(selected), formation_titre:selected.formation?.titre, plan_titre:selected.plan?.titre}); nav('/responsable-formation/sessions/create/planification');};
  return <><SessionStepper step={1}/><PageTitle title="Creer une session" subtitle="Etape 1: choisissez le plan valide et la formation concernee."/>
    {error&&<Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <Card><form onSubmit={next} className="space-y-4">
      <Field label="Plan et formation"><select required className={inputClass} value={ligne} onChange={e=>setLigne(e.target.value)}><option value="">Choisir une ligne de plan valide</option>{lines.map(l=><option key={l.id} value={l.id}>{formatLine(l)}</option>)}</select></Field>
      {!lines.length&&<p className="rounded-2xl bg-orange-50 p-4 text-sm font-semibold text-orange-700">Aucune ligne disponible. Il faut d abord valider un plan CDC contenant des formations.</p>}
      <div className="flex justify-end"><Button>Suivant</Button></div>
    </form></Card></>;
}

export function SessionPlanning(){
  const nav=useNavigate();
  const draft=getSessionDraft();
  const [users,setUsers]=useState([]);
  const [form,setForm]=useState({type_session:draft.type_session||'presentielle',date_session:draft.date_session||'',ville:draft.ville||'',region:draft.region||'',lieu:draft.lieu||'',salle:draft.salle||'',plateforme:draft.plateforme||'',lien_visio:draft.lien_visio||'',animateur_id:draft.animateur_id||''});
  const [error,setError]=useState('');
  useEffect(()=>{api.get('/responsable-formation/users').then(r=>setUsers(r.data.data||r.data)).catch(()=>setUsers([]));},[]);
  const animateurs=users.filter(u=>u.role==='formateur_animateur');
  const next=(e)=>{e.preventDefault(); if(!draft.ligne_plan_formation_id){nav('/responsable-formation/sessions/create');return;} saveSessionDraft({...form,animateur_id:Number(form.animateur_id)}); nav('/responsable-formation/sessions/create/participants');};
  return <><SessionStepper step={2}/><PageTitle title="Planification de la session" subtitle={draft.ligne_label || 'Selectionnez d abord une ligne de plan.'}/>
    {error&&<Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <Card><form onSubmit={next} className="grid gap-4 md:grid-cols-2">
      <Field label="Type session"><select required className={inputClass} value={form.type_session} onChange={e=>setForm({...form,type_session:e.target.value})}><option value="presentielle">Presentielle</option><option value="distance">Distance</option><option value="hybride">Hybride</option></select></Field>
      <Field label="Animateur"><select required className={inputClass} value={form.animateur_id} onChange={e=>setForm({...form,animateur_id:e.target.value})}><option value="">Choisir un animateur</option>{animateurs.map(u=><option value={u.id} key={u.id}>{u.nom_complet}</option>)}</select></Field>
      <Field label="Ville"><input required className={inputClass} value={form.ville} onChange={e=>setForm({...form,ville:e.target.value})} placeholder="Ex: Casablanca"/></Field>
      <Field label="Region"><select required className={inputClass} value={form.region} onChange={e=>setForm({...form,region:e.target.value})}><option value="">Choisir une region</option>{moroccanRegions.map(r=><option key={r} value={r}>{r}</option>)}</select></Field>
      <Field label="Date de la session"><DatePicker required value={form.date_session} onChange={value=>setForm({...form,date_session:value})}/></Field>
      {['presentielle','hybride'].includes(form.type_session)&&<><Field label="Lieu"><input required className={inputClass} value={form.lieu} onChange={e=>setForm({...form,lieu:e.target.value})}/></Field><Field label="Salle"><input required className={inputClass} value={form.salle} onChange={e=>setForm({...form,salle:e.target.value})}/></Field></>}
      {['distance','hybride'].includes(form.type_session)&&<><Field label="Plateforme"><input required className={inputClass} value={form.plateforme} onChange={e=>setForm({...form,plateforme:e.target.value})}/></Field><Field label="Lien visio"><input required className={inputClass} value={form.lien_visio} onChange={e=>setForm({...form,lien_visio:e.target.value})}/></Field></>}
      <div className="md:col-span-2 flex gap-3"><Button type="button" variant="secondary" onClick={()=>nav('/responsable-formation/sessions/create')}>Precedent</Button><Button>Suivant</Button></div>
    </form></Card></>;
}

export function SessionParticipants(){
  const nav=useNavigate();
  const draft=getSessionDraft();
  const [users,setUsers]=useState([]);
  const [selected,setSelected]=useState(draft.participants||[]);
  const [search,setSearch]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{api.get('/responsable-formation/users').then(r=>setUsers(r.data.data||r.data)).catch(()=>setUsers([]));},[]);
  const participants=users.filter(u=>u.role==='formateur_participant').filter(u=>(u.nom_complet||'').toLowerCase().includes(search.toLowerCase()) || (u.email||'').toLowerCase().includes(search.toLowerCase()));
  const isSelected=(id)=>selected.some(p=>Number(p.id)===Number(id));
  const add=(user)=>setSelected(items=>isSelected(user.id)?items:[...items,{id:user.id,nom_complet:user.nom_complet,mode_participation:draft.type_session==='distance'?'distance':'presentiel'}]);
  const remove=(id)=>setSelected(items=>items.filter(p=>Number(p.id)!==Number(id)));
  const updateMode=(id,mode)=>setSelected(items=>items.map(p=>Number(p.id)===Number(id)?{...p,mode_participation:mode}:p));
  const next=()=>{ if(!selected.length){setError('Ajoutez au moins un formateur participant.'); return;} saveSessionDraft({participants:selected}); nav('/responsable-formation/sessions/create/resume'); };
  return <><SessionStepper step={3}/><PageTitle title="Animateur & participants" subtitle="Ajoutez les formateurs participants a inscrire dans cette session."/>
    {error&&<Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <Card className="mb-4"><Field label="Rechercher un participant"><input className={inputClass} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nom, prenom ou email"/></Field></Card>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><h3 className="mb-3 text-lg font-black text-[#08235a]">Formateurs disponibles</h3><div className="space-y-3">{participants.map(u=><div key={u.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3"><div><b>{u.nom_complet}</b><p className="text-sm text-slate-500">{u.email}</p></div>{isSelected(u.id)?<Button variant="secondary" onClick={()=>remove(u.id)}>Retirer</Button>:<Button onClick={()=>add(u)}>Ajouter</Button>}</div>)}</div></Card>
      <Card><h3 className="mb-3 text-lg font-black text-[#08235a]">Participants selectionnes</h3>{!selected.length&&<p className="text-slate-500">Aucun participant ajoute.</p>}<div className="space-y-3">{selected.map(p=><div key={p.id} className="rounded-2xl bg-cyan-50 p-3"><div className="flex items-center justify-between"><b>{p.nom_complet}</b><button className="font-black text-red-600" onClick={()=>remove(p.id)}>Retirer</button></div>{draft.type_session==='hybride'&&<Field label="Mode participation"><select required className={inputClass} value={p.mode_participation||''} onChange={e=>updateMode(p.id,e.target.value)}><option value="">Choisir</option><option value="presentiel">Presentiel</option><option value="distance">Distance</option></select></Field>}</div>)}</div></Card>
    </div>
    <div className="mt-5 flex gap-3"><Button variant="secondary" onClick={()=>nav('/responsable-formation/sessions/create/planification')}>Precedent</Button><Button onClick={next}>Suivant</Button></div>
  </>;
}

export function SessionResume(){
  const nav=useNavigate();
  const [error,setError]=useState('');
  const draft=getSessionDraft();
  const submit=async()=>{setError(''); try{const payload={...draft,date_session:draft.date_session,participants:(draft.participants||[]).map(p=>({id:Number(p.id),mode_participation:draft.type_session==='hybride'?p.mode_participation:(draft.type_session==='distance'?'distance':'presentiel')}))}; await api.post('/responsable-formation/sessions',payload); clearSessionDraft(); nav('/responsable-formation/sessions');}catch(err){setError(err.response?.data?.message || Object.values(err.response?.data?.errors||{})?.[0]?.[0] || 'Creation de la session impossible.');}};
  return <><SessionStepper step={4}/><PageTitle title="Resume de la session" subtitle="Verifiez les informations avant creation."/>
    {error&&<Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <Card><h2 className="text-2xl font-black text-[#08235a]">{draft.formation_titre || 'Formation'}</h2><p className="text-slate-500">{draft.plan_titre}</p><div className="mt-4 grid gap-3 md:grid-cols-2"><p><b>Type:</b> {draft.type_session}</p><p><b>Animateur:</b> #{draft.animateur_id}</p><p><b>Region:</b> {draft.region}</p><p><b>Ville:</b> {draft.ville}</p><p><b>Date session:</b> {draft.date_session}</p><p><b>Participants:</b> {(draft.participants||[]).length}</p>{draft.lieu&&<p><b>Lieu:</b> {draft.lieu} - {draft.salle}</p>}{draft.plateforme&&<p><b>Distance:</b> {draft.plateforme} - {draft.lien_visio}</p>}</div>{(draft.participants||[]).map(p=><p key={p.id} className="mt-2 rounded-xl bg-slate-50 p-2">{p.nom_complet} {draft.type_session==='hybride' && `- ${p.mode_participation}`}</p>)}</Card>
    <div className="mt-5 flex gap-3"><Button variant="secondary" onClick={()=>nav('/responsable-formation/sessions/create/participants')}>Precedent</Button><Button onClick={submit}>Creer la session</Button></div>
  </>;
}

export function SessionEdit(){
  const {id}=useParams();
  const nav=useNavigate();
  const [session,setSession]=useState(null);
  const [users,setUsers]=useState([]);
  const [form,setForm]=useState({statut:'planifiee',type_session:'presentielle',date_session:'',ville:'',region:'',lieu:'',salle:'',plateforme:'',lien_visio:'',animateur_id:''});
  const [selected,setSelected]=useState([]);
  const [search,setSearch]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    Promise.all([
      api.get(`/responsable-formation/sessions/${id}`),
      api.get('/responsable-formation/users')
    ]).then(([sessionResponse, usersResponse])=>{
      const s=sessionResponse.data;
      setSession(s);
      setForm({
        statut:s.statut||'planifiee',
        type_session:s.type_session||'presentielle',
        date_session:s.date_session||'',
        ville:s.ville||'',
        region:s.region||'',
        lieu:s.lieu||'',
        salle:s.salle||'',
        plateforme:s.plateforme||'',
        lien_visio:s.lien_visio||'',
        animateur_id:s.animateur_id||''
      });
      setSelected((s.participations||[]).map(p=>({id:p.participant_id||p.participant?.id,nom_complet:p.participant?.nom_complet,email:p.participant?.email,mode_participation:p.mode_participation||'presentiel'})).filter(p=>p.id));
      setUsers(usersResponse.data.data||usersResponse.data);
    }).catch(()=>setError('Chargement de la session impossible.'));
  },[id]);

  const animateurs=users.filter(u=>u.role==='formateur_animateur');
  const participants=users.filter(u=>u.role==='formateur_participant').filter(u=>(u.nom_complet||'').toLowerCase().includes(search.toLowerCase()) || (u.email||'').toLowerCase().includes(search.toLowerCase()));
  const isSelected=(userId)=>selected.some(p=>Number(p.id)===Number(userId));
  const add=(user)=>setSelected(items=>isSelected(user.id)?items:[...items,{id:user.id,nom_complet:user.nom_complet,email:user.email,mode_participation:form.type_session==='distance'?'distance':'presentiel'}]);
  const remove=(userId)=>setSelected(items=>items.filter(p=>Number(p.id)!==Number(userId)));
  const updateMode=(userId,mode)=>setSelected(items=>items.map(p=>Number(p.id)===Number(userId)?{...p,mode_participation:mode}:p));
  const update=(field,value)=>setForm(current=>({...current,[field]:value}));

  const submit=async(e)=>{
    e.preventDefault();
    setError('');
    setMessage('');
    if(!selected.length){setError('Ajoutez au moins un participant.'); return;}
    setSaving(true);
    try{
      const payload={
        ...form,
        animateur_id:Number(form.animateur_id),
        participants:selected.map(p=>({id:Number(p.id),mode_participation:form.type_session==='hybride'?p.mode_participation:(form.type_session==='distance'?'distance':'presentiel')}))
      };
      const response=await api.put(`/responsable-formation/sessions/${id}`,payload);
      setSession(response.data.data||response.data);
      setMessage('Session modifiee avec succes.');
    }catch(err){
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors||{})?.[0]?.[0] || 'Modification de la session impossible.');
    }finally{
      setSaving(false);
    }
  };

  return <><PageTitle title="Modifier la session" subtitle={session?.formation?.titre || 'Mettez a jour les informations de planification.'}/>
    <div className="mb-4 flex gap-3"><Button variant="secondary" onClick={()=>nav('/responsable-formation/sessions')}>Retour aux sessions</Button>{session&&<Link to={`/responsable-formation/sessions/${id}`}><Button variant="secondary">Voir details</Button></Link>}</div>
    {message&&<Card className="mb-4 bg-emerald-50 font-semibold text-emerald-700">{message}</Card>}
    {error&&<Card className="mb-4 bg-red-50 font-semibold text-red-700">{error}</Card>}
    <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1fr_430px]">
      <Card className="grid gap-4 md:grid-cols-2">
        <Field label="Statut"><select required className={inputClass} value={form.statut} onChange={e=>update('statut',e.target.value)}><option value="planifiee">Planifiee</option><option value="en_cours">En cours</option><option value="terminee">Terminee</option><option value="annulee">Annulee</option></select></Field>
        <Field label="Type session"><select required className={inputClass} value={form.type_session} onChange={e=>update('type_session',e.target.value)}><option value="presentielle">Presentielle</option><option value="distance">Distance</option><option value="hybride">Hybride</option></select></Field>
        <Field label="Date de la session"><DatePicker required value={form.date_session} onChange={value=>update('date_session',value)}/></Field>
        <Field label="Animateur"><select required className={inputClass} value={form.animateur_id} onChange={e=>update('animateur_id',e.target.value)}><option value="">Choisir un animateur</option>{animateurs.map(u=><option key={u.id} value={u.id}>{u.nom_complet}</option>)}</select></Field>
        <Field label="Ville"><input required className={inputClass} value={form.ville} onChange={e=>update('ville',e.target.value)}/></Field>
        <Field label="Region"><select required className={inputClass} value={form.region} onChange={e=>update('region',e.target.value)}><option value="">Choisir une region</option>{moroccanRegions.map(r=><option key={r} value={r}>{r}</option>)}</select></Field>
        {['presentielle','hybride'].includes(form.type_session)&&<><Field label="Lieu"><input required className={inputClass} value={form.lieu} onChange={e=>update('lieu',e.target.value)}/></Field><Field label="Salle"><input required className={inputClass} value={form.salle} onChange={e=>update('salle',e.target.value)}/></Field></>}
        {['distance','hybride'].includes(form.type_session)&&<><Field label="Plateforme"><input required className={inputClass} value={form.plateforme} onChange={e=>update('plateforme',e.target.value)}/></Field><Field label="Lien visio"><input required className={inputClass} value={form.lien_visio} onChange={e=>update('lien_visio',e.target.value)}/></Field></>}
        <div className="md:col-span-2 flex justify-end"><Button disabled={saving}>{saving?'Enregistrement...':'Enregistrer les modifications'}</Button></div>
      </Card>
      <div className="space-y-5">
        <Card>
          <h3 className="mb-3 text-lg font-black text-[#08235a]">Participants selectionnes</h3>
          {!selected.length&&<p className="rounded-2xl bg-slate-50 p-4 font-semibold text-slate-500">Aucun participant ajoute.</p>}
          <div className="space-y-3">{selected.map(p=><div key={p.id} className="rounded-2xl bg-cyan-50 p-3">
            <div className="flex items-start justify-between gap-3"><div><b>{p.nom_complet}</b><p className="text-sm text-slate-500">{p.email}</p></div><button type="button" className="font-black text-red-600" onClick={()=>remove(p.id)}>Retirer</button></div>
            {form.type_session==='hybride'&&<Field label="Mode participation"><select required className={inputClass} value={p.mode_participation||''} onChange={e=>updateMode(p.id,e.target.value)}><option value="">Choisir</option><option value="presentiel">Presentiel</option><option value="distance">Distance</option></select></Field>}
          </div>)}</div>
        </Card>
        <Card>
          <Field label="Ajouter un participant"><input className={inputClass} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher nom ou email"/></Field>
          <div className="mt-3 max-h-80 space-y-3 overflow-auto">{participants.map(u=><div key={u.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3"><div><b>{u.nom_complet}</b><p className="text-sm text-slate-500">{u.email}</p></div>{isSelected(u.id)?<Button type="button" variant="secondary" onClick={()=>remove(u.id)}>Retirer</Button>:<Button type="button" onClick={()=>add(u)}>Ajouter</Button>}</div>)}</div>
        </Card>
      </div>
    </form>
  </>;
}

export function HebergementsPage(){
  const {id}=useParams();
  const nav=useNavigate();
  const [session,setSession]=useState(null);
  const [form,setForm]=useState({participant_id:'',hotel:'',adresse:'',date_arrivee:'',date_depart:'',statut:'reserve'});
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const load=()=>api.get(`/responsable-formation/sessions/${id}`).then(r=>setSession(r.data)).catch(()=>setError('Chargement de la session impossible.'));
  useEffect(()=>{load();},[id]);
  const participants=session?.participations||[];
  const hebergements=session?.hebergements||[];
  const selectedHebergement=hebergements.find(h=>String(h.participant_id)===String(form.participant_id));
  useEffect(()=>{
    if(!form.participant_id) return;
    const existing=hebergements.find(h=>String(h.participant_id)===String(form.participant_id));
    if(existing){
      setForm(current=>({...current,hotel:existing.hotel||'',adresse:existing.adresse||'',date_arrivee:existing.date_arrivee||'',date_depart:existing.date_depart||'',statut:existing.statut||'reserve'}));
    }
  },[form.participant_id, session?.id]);
  const submit=async(e)=>{
    e.preventDefault(); setError(''); setMessage(''); setSaving(true);
    try{
      await api.post(`/responsable-formation/sessions/${id}/hebergements`,form);
      setMessage(selectedHebergement?'Hebergement modifie avec succes.':'Hebergement ajoute avec succes.');
      await load();
    }catch(err){
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors||{})?.[0]?.[0] || 'Enregistrement de l hebergement impossible.');
    }finally{
      setSaving(false);
    }
  };
  return <><PageTitle title="Gestion des hebergements" subtitle={session?.formation?.titre ? `${session.formation.titre} - ${session.ville || session.region}` : 'Affectez les hotels aux participants de la session.'}/>
    <div className="mb-4"><Button variant="secondary" onClick={()=>nav('/responsable-formation/sessions')}>Retour aux sessions</Button></div>
    {message&&<Card className="mb-4 bg-emerald-50 font-semibold text-emerald-700">{message}</Card>}
    {error&&<Card className="mb-4 bg-red-50 font-semibold text-red-700">{error}</Card>}
    {session?.type_session==='distance'&&<Card className="mb-4 bg-orange-50 font-semibold text-orange-800">Cette session est a distance. L hebergement est reserve aux sessions presen­tielles ou hybrides.</Card>}
    <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
      <Card>
        <h3 className="mb-4 text-xl font-black text-[#08235a]">Hebergements enregistres</h3>
        {!hebergements.length&&<p className="rounded-2xl bg-slate-50 p-4 font-semibold text-slate-500">Aucun hebergement ajoute pour cette session.</p>}
        <div className="grid gap-3">
          {hebergements.map(h=><div key={h.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
              <div><b>{h.participant?.nom_complet || `Participant #${h.participant_id}`}</b><p className="text-sm text-slate-500">{h.participant?.email}</p></div>
              <Badge value={h.statut || 'reserve'}/>
            </div>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <p><b>Hotel:</b> {h.hotel || '-'}</p>
              <p><b>Adresse:</b> {h.adresse || '-'}</p>
              <p><b>Arrivee:</b> {h.date_arrivee || '-'}</p>
              <p><b>Depart:</b> {h.date_depart || '-'}</p>
            </div>
          </div>)}
        </div>
      </Card>
      <Card>
        <h3 className="mb-4 text-xl font-black text-[#08235a]">{selectedHebergement?'Modifier hebergement':'Ajouter hebergement'}</h3>
        {!participants.length&&<p className="rounded-2xl bg-orange-50 p-4 font-semibold text-orange-700">Aucun participant inscrit dans cette session.</p>}
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Participant"><select required className={inputClass} value={form.participant_id} onChange={e=>setForm({...form,participant_id:e.target.value})}><option value="">Choisir un participant</option>{participants.map(p=><option key={p.participant_id} value={p.participant_id}>{p.participant?.nom_complet || `Participant #${p.participant_id}`}</option>)}</select></Field>
          <Field label="Hotel"><input required className={inputClass} value={form.hotel} onChange={e=>setForm({...form,hotel:e.target.value})} placeholder="Ex: Hotel Atlas"/></Field>
          <Field label="Adresse"><input required className={inputClass} value={form.adresse} onChange={e=>setForm({...form,adresse:e.target.value})} placeholder="Adresse de l hotel"/></Field>
          <DateRangePicker
            required
            label="Periode d'hebergement"
            startDate={form.date_arrivee}
            endDate={form.date_depart}
            minDate={session?.date_session || undefined}
            maxDate={session?.date_session || undefined}
            onChange={({ startDate, endDate }) => setForm({ ...form, date_arrivee: startDate, date_depart: endDate })}
          />
          <Field label="Statut"><select required className={inputClass} value={form.statut} onChange={e=>setForm({...form,statut:e.target.value})}><option value="reserve">Reserve</option><option value="confirme">Confirme</option><option value="annule">Annule</option></select></Field>
          <Button disabled={saving || !participants.length || session?.type_session==='distance'}>{saving?'Enregistrement...':selectedHebergement?'Modifier':'Ajouter'}</Button>
        </form>
      </Card>
    </div>
  </>;
}

function ParticipantQrCard({ sessionId, session }) {
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadQr = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get(`/participant/sessions/${sessionId}/qr`);

      const dataUrl = await QRCode.toDataURL(data.qr_payload, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'M',
      });

      setQr({ ...data, dataUrl });
    } catch (err) {
      setError(err.response?.data?.message || 'Génération du QR code impossible.');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!qr?.dataUrl) return;

    const a = document.createElement('a');
    a.href = qr.dataUrl;
    a.download = `qr-session-${sessionId}.png`;
    a.click();
  };

  if (session?.type_session !== 'presentielle') {
    return (
      <Card className="mt-4 bg-cyan-50">
        <h3 className="text-lg font-black text-[#08235a]">
          QR code d'accès
        </h3>
        <p className="text-slate-600">
          Le QR code est disponible uniquement pour les sessions présentielles.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <h3 className="text-lg font-black text-[#08235a]">
        QR code d'accès à la session
      </h3>

      <p className="mb-4 text-sm text-slate-500">
        Ce QR code permet à l'animateur de vérifier votre participation.
        Il expire le lendemain de la fin de session.
      </p>

      {error && (
        <div className="mb-3 rounded-2xl bg-red-50 p-3 font-bold text-red-700">
          {error}
        </div>
      )}

      {!qr ? (
        <Button disabled={loading} onClick={loadQr}>
          {loading ? 'Génération...' : 'Afficher mon QR code'}
        </Button>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <img
            src={qr.dataUrl}
            alt="QR code session"
            className="w-64 rounded-3xl border border-slate-200 bg-white p-3 shadow"
          />

          <div className="space-y-2">
            <p>
              <b>Participant:</b> {qr.participant?.nom_complet}
            </p>

            <p>
              <b>Email:</b> {qr.participant?.email}
            </p>

            <p>
              <b>Session:</b> {qr.session?.formation || session?.formation?.titre}
            </p>

            <p>
              <b>Date:</b> {qr.session?.date_session}
            </p>

            <p>
              <b>Type:</b> {qr.session?.type_session}
            </p>

            <p>
              <b>Lieu:</b> {qr.session?.lieu} - Salle {qr.session?.salle}
            </p>

            <p>
              <b>Expire le:</b> {new Date(qr.expires_at).toLocaleString('fr-FR')}
            </p>

            <Button className="mt-4" onClick={download}>
              Télécharger le QR en image
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function SessionDetails(){
  const {id}=useParams();
  const routerLocation = useLocation();
  const { user } = useAuth();
  const [s,setS]=useState(null);
  const [error,setError]=useState('');
  const isAnimateur=routerLocation.pathname.includes('animateur');
  const isParticipant=routerLocation.pathname.includes('participant');
  const isResponsableFormation=routerLocation.pathname.includes('responsable-formation');
  const isDr=routerLocation.pathname.includes('/dr/');
  const canAnimateurFinish = isAnimateur && s?.can_finish;
  const finishSession=async()=>{
    setError('');
    try{
      const response=await api.patch(`/animateur/sessions/${id}/finish`);
      setS(response.data.session || response.data.data || response.data);
    }catch(err){
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors||{})?.[0]?.[0] || 'Impossible de terminer la session.');
    }
  };
  useEffect(()=>{
    const prefix=isAnimateur?'/animateur':isParticipant?'/participant':isDr?'/dr':'/responsable-formation';
    api.get(`${prefix}/sessions/${id}`).then(r=>setS(r.data)).catch(()=>setError('Chargement de la session impossible.'));
  },[id, isAnimateur, isParticipant, isDr]);
  const currentParticipation = s?.current_participation || s?.participations?.find((p)=>Number(p.participant_id)===Number(user?.id));
  const canEvaluate = isParticipant && s?.statut === 'terminee' && currentParticipation && !currentParticipation.evaluation;
  const alreadyEvaluated = isParticipant && currentParticipation?.evaluation;
  return <>
    <PageTitle title="Details session"/>
    {error&&<Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <Card>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="text-2xl font-black">{s?.formation?.titre || 'Session'}</h2>
          <Badge value={s?.statut}/>
          <p>Type: {s?.type_session}</p>
          <p>Region: {s?.region || 'Non renseignee'}</p>
          <p>Ville: {s?.ville || 'Non renseignee'}</p>
          <p>Date session: {s?.date_session}</p>
          {s?.lieu&&<p>Lieu: {s.lieu} - Salle {s.salle}</p>}
          {s?.plateforme&&<p>Plateforme: {s.plateforme} - {s.lien_visio}</p>}
        </div>
        {isAnimateur&&<div className="flex flex-wrap gap-2"><Link to={`/animateur/sessions/${id}/absences`}><Button variant="secondary">Absences</Button></Link><Link to={`/animateur/sessions/${id}/documents`}><Button>Ajouter documents</Button></Link>{canAnimateurFinish&&<Button onClick={finishSession}>Terminer la session</Button>}{isAnimateur&&!s?.can_finish&&s?.statut==='planifiee'&&<span className="rounded-full bg-orange-50 px-4 py-3 text-xs font-black text-orange-700">Disponible a la date de session</span>}</div>}
        {isResponsableFormation&&<div className="flex gap-2"><Link to="/responsable-formation/sessions"><Button variant="secondary">Retour sessions</Button></Link><Link to={`/responsable-formation/sessions/${id}/edit`}><Button variant="secondary">Modifier</Button></Link><Link to={`/responsable-formation/sessions/${id}/hebergements`}><Button>Hebergements</Button></Link></div>}
        {isDr&&<div className="flex gap-2"><Link to="/dr/sessions"><Button variant="secondary">Retour sessions</Button></Link></div>}
      </div>
    </Card>
    {isParticipant&&s&&<Card className="mt-4">
      <h3 className="text-lg font-black text-[#08235a]">Evaluation de la session</h3>
      {canEvaluate&&<div className="mt-3 flex flex-col gap-3 rounded-2xl bg-orange-50 p-4 md:flex-row md:items-center md:justify-between">
        <p className="font-semibold text-orange-800">La session est terminee. Vous pouvez envoyer votre evaluation.</p>
        <Link to={`/participant/participations/${currentParticipation.id}/evaluation`}><Button>Evaluer cette session</Button></Link>
      </div>}
      {alreadyEvaluated&&<p className="mt-3 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800">Evaluation deja envoyee. Merci pour votre retour.</p>}
      {s?.statut !== 'terminee'&&<p className="mt-3 rounded-2xl bg-slate-50 p-4 font-semibold text-slate-600">L evaluation sera disponible apres la fin de la session.</p>}
    </Card>}
    {isParticipant&&s&&<ParticipantQrCard sessionId={id} session={s}/>}
    {s?.documents?.length>0&&<Card className="mt-4"><h3 className="mb-3 text-lg font-black text-[#08235a]">Documents</h3>{s.documents.map(d=><div key={d.id} className="mb-2 flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-3 md:flex-row md:items-center"><div><b>{d.titre}</b><p className="text-sm text-slate-500">{d.type} - {d.file_path}</p></div>{isParticipant&&<DownloadDocumentButton doc={d}/>}</div>)}</Card>}
  </>}

export function AnimateurSessionActions({ session }) {
  const [row, setRow] = useState(session);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isFinished = row.is_finished || row.statut === 'terminee';
  const finish=async()=>{
    setError('');
    setLoading(true);
    try{
      const response=await api.patch(`/animateur/sessions/${row.id}/finish`);
      setRow(response.data.session || response.data.data || response.data);
      location.reload();
    }catch(err){
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors||{})?.[0]?.[0] || 'Impossible de terminer la session.');
    }finally{
      setLoading(false);
    }
  };
  return <div className="flex flex-wrap items-center gap-2">
    <Link className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-[#08235a]" to={`/animateur/sessions/${row.id}`}>Details</Link>
    <Link className="rounded-full bg-[#008a94] px-3 py-2 text-xs font-black text-white" to={`/animateur/sessions/${row.id}/documents`}>Documents</Link>
    <Link className="rounded-full bg-orange-500 px-3 py-2 text-xs font-black text-white" to={`/animateur/sessions/${row.id}/absences`}>Absences</Link>
    {isFinished&&<span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">Session terminee</span>}
    {!isFinished&&row.can_finish&&<button type="button" onClick={finish} disabled={loading} className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60">{loading?'Traitement...':'Terminer'}</button>}
    {!isFinished&&!row.can_finish&&<span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">Non terminee</span>}
    {error&&<span className="basis-full rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</span>}
  </div>;
}

export function QrScanPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  useEffect(() => {
    api.get('/animateur/sessions')
      .then((r) => setSessions(r.data.data || r.data))
      .catch(() => setSessions([]));
  }, []);
  const selectedSession = sessions.find((s) => String(s.id) === String(selectedSessionId));
  const verify = async (value) => {
    setError(''); setResult(null);
    const cleanToken = String(value || '').trim();
    if (!selectedSessionId) {
      setError('Choisissez d abord la session a verifier.');
      return;
    }
    if (!cleanToken) {
      setError('Scannez un QR code ou importez une image QR valide.');
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post(`/animateur/sessions/${selectedSessionId}/qr/scan`, { token: cleanToken });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'QR code invalide.');
    } finally {
      setLoading(false);
    }
  };
  const startCamera = async () => {
    setError('');
    if (!selectedSessionId) {
      setError('Choisissez d abord la session a verifier.');
      return;
    }
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (scanner) {
        await scanner.stop?.().catch(() => {});
        await scanner.clear?.().catch(() => {});
      }
      const reader = new Html5Qrcode('qr-reader');
      setScanner(reader);
      await reader.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, async (decoded) => {
        await reader.stop().catch(() => {});
        await reader.clear().catch(() => {});
        await verify(decoded);
      });
    } catch (err) {
      setError('Camera indisponible. Vous pouvez importer une image QR ou coller le code manuellement.');
    }
  };
  const scanFile = async (file) => {
    if (!file) return;
    setError('');
    if (!selectedSessionId) {
      setError('Choisissez d abord la session a verifier.');
      return;
    }
    let tempNode = null;
    let reader = null;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (scanner) {
        await scanner.stop?.().catch(() => {});
        await scanner.clear?.().catch(() => {});
        setScanner(null);
      }
      const tempId = `qr-file-reader-${Date.now()}`;
      tempNode = document.createElement('div');
      tempNode.id = tempId;
      tempNode.style.position = 'fixed';
      tempNode.style.left = '-10000px';
      tempNode.style.top = '0';
      tempNode.style.width = '320px';
      tempNode.style.height = '320px';
      document.body.appendChild(tempNode);
      reader = new Html5Qrcode(tempId);
      const decoded = await reader.scanFile(file, true);
      await verify(decoded);
    } catch (err) {
      setError('Lecture du QR code impossible depuis cette image. Importez l image QR originale telechargee depuis la session participant.');
    } finally {
      await reader?.clear?.().catch(() => {});
      tempNode?.remove?.();
      setFileInputKey((value) => value + 1);
    }
  };
  useEffect(() => () => { scanner?.stop?.().catch(() => {}); }, [scanner]);
  return <><PageTitle title="Scanner QR participant" subtitle="Choisissez une session, scannez le QR, puis la presence sera confirmee automatiquement." />
    <Card>
      {error && <div className="mb-4 rounded-2xl bg-red-50 p-3 font-bold text-red-700">{error}</div>}
      <Field label="Session a verifier"><select required className={inputClass} value={selectedSessionId} onChange={e=>{setSelectedSessionId(e.target.value); setResult(null); setError('');}}><option value="">Choisir une session</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.formation?.titre || `Session #${s.id}`} - {s.date_session} - {s.type_session}</option>)}</select></Field>
      {selectedSession && <div className="mb-4 rounded-2xl bg-cyan-50 p-4 text-sm font-bold text-[#08235a]">Session selectionnee: {selectedSession.formation?.titre} - {selectedSession.lieu || selectedSession.plateforme || 'Lieu non renseigne'}</div>}
      <div id="qr-reader" className="mb-4 min-h-[220px] overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm font-semibold text-slate-500">La camera apparait ici apres le demarrage.</div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={loading || !selectedSessionId} onClick={startCamera}>{loading ? 'Verification...' : 'Demarrer la camera'}</Button>
        <label className={`rounded-full px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-900/10 ${selectedSessionId ? 'cursor-pointer bg-[#008a94]' : 'cursor-not-allowed bg-slate-400'}`}>
          <input key={fileInputKey} type="file" accept="image/*" className="hidden" disabled={!selectedSessionId || loading} onChange={e=>scanFile(e.target.files?.[0])}/>
          Importer image QR
        </label>
      </div>
    </Card>
    {result && <Card className="mt-4 bg-emerald-50">
      <h3 className="text-xl font-black text-emerald-800">QR code valide - presence confirmee</h3>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <p><b>Participant:</b> {result.participant?.nom_complet}</p>
        <p><b>Email:</b> {result.participant?.email}</p>
        <p><b>Session:</b> {result.session?.formation}</p>
        <p><b>Lieu:</b> {result.session?.lieu} - Salle {result.session?.salle}</p>
        <p><b>Date:</b> {result.session?.date_session}</p>
        <p><b>Presence:</b> {result.attendance?.statut} le {result.attendance?.date_absence}</p>
      </div>
    </Card>}
  </>;
}
export function AbsencePage(){
  const {id}=useParams();
  const [session,setSession]=useState(null);
  const [parts,setParts]=useState([]);
  const [absences,setAbsences]=useState([]);
  const [date,setDate]=useState('');
  const [messageForms,setMessageForms]=useState({});
  const [sendingMessage,setSendingMessage]=useState(null);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const effectiveStatut = (participant) => {
    const base = participant?.statut || 'present';
    if (base === 'absent' && participant?.justifiee) return 'justifie';
    return base;
  };
  const load=()=>{
    api.get(`/animateur/sessions/${id}`).then(r=>setSession(r.data));
    Promise.all([
      api.get(`/animateur/sessions/${id}/participants`),
      api.get(`/animateur/sessions/${id}/absences`).catch(()=>({data:[]}))
    ]).then(([participantsResponse, absencesResponse])=>{
      const absenceRows=absencesResponse.data.data||absencesResponse.data||[];
      setAbsences(absenceRows);
      setParts((participantsResponse.data.data||participantsResponse.data).map(p=>{
        const saved=absenceRows.find(a=>Number(a.participant_id)===Number(p.participant_id));
        const savedStatut = saved?.statut || p.statut || 'present';
        return {
          ...p,
          statut: savedStatut === 'justifie' ? 'absent' : savedStatut,
          justifiee: savedStatut === 'justifie',
          justification: saved?.justification || p.justification || '',
        };
      }));
    });
  };
  useEffect(()=>{load();},[id]);
  const submit=async(e)=>{
    e.preventDefault(); setMessage(''); setError('');
    try{
      await api.post(`/animateur/sessions/${id}/absences`,{
        date_absence:date,
        absences:parts.map(p=>({
          participant_id:Number(p.participant_id),
          statut:effectiveStatut(p),
          justification:p.justification||''
        }))
      });
      setMessage('Absences enregistrees avec succes.');
      load();
    }catch(err){
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors||{})?.[0]?.[0] || 'Enregistrement des absences impossible.');
    }
  };
  const canSendMessage=(participant)=>['absent','retard','justifie'].includes(effectiveStatut(participant));
  const updateMessageForm=(participantId,value)=>setMessageForms(current=>({...current,[participantId]:value}));
  const sendAbsenceMessage=async(participant)=>{
    setMessage(''); setError('');
    const statutToSend = effectiveStatut(participant);
    const body=messageForms[participant.participant_id] || `Bonjour ${participant.participant?.prenom || participant.participant?.nom_complet || ''}, vous avez ete marque ${statutToSend} pour la session ${session?.formation?.titre || ''}. Merci de verifier votre situation ou de contacter l animateur si besoin.`;
    try{
      setSendingMessage(participant.participant_id);
      await api.post(`/animateur/sessions/${id}/absence-messages`,{
        participant_id:participant.participant_id,
        subject:`Suivi de votre ${statutToSend}`,
        message:body,
        statut:statutToSend,
        justification:participant.justification || '',
        date_absence:date || session?.date_session
      });
      setMessage('Message envoye au participant.');
      updateMessageForm(participant.participant_id,'');
      load();
    }catch(err){
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors||{})?.[0]?.[0] || 'Envoi du message impossible.');
    }finally{
      setSendingMessage(null);
    }
  };
  return <><PageTitle title="Absences" subtitle={session?.formation?.titre ? `${session.formation.titre} - ${session.date_session}` : 'Selectionnez les statuts de presence.'}/>
    {message&&<Card className="mb-4 bg-green-50 text-green-700">{message}</Card>}
    {error&&<Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <Card><form onSubmit={submit}>
      <Field label="Date absence"><DatePicker required minDate={session?.date_session||undefined} maxDate={session?.date_session||undefined} value={date} onChange={setDate}/></Field>
      {!parts.length&&<p className="mt-4 rounded-2xl bg-orange-50 p-4 font-semibold text-orange-700">Aucun participant inscrit dans cette session.</p>}
      {parts.map((p,i)=><div className="mt-3 grid gap-2 rounded-2xl border border-slate-200 p-3 md:grid-cols-3" key={p.id}>
        <div><b>{p.participant?.nom_complet||`Participant #${p.participant_id}`}</b><p className="text-sm text-slate-500">{p.participant?.email}</p></div>
        <select required className={inputClass} value={p.statut||'present'} onChange={e=>{parts[i].statut=e.target.value; if(e.target.value!=='absent') parts[i].justifiee=false; setParts([...parts])}}><option value="present">Present</option><option value="absent">Absent</option><option value="retard">Retard</option></select>
        <input className={inputClass} placeholder="Justification" value={p.justification||''} onChange={e=>{parts[i].justification=e.target.value;setParts([...parts])}}/>
        {p.statut==='absent'&&<label className="md:col-span-3 mt-1 inline-flex items-center gap-2 text-xs font-bold text-[#9ad5ff]"><input type="checkbox" checked={Boolean(p.justifiee)} onChange={e=>{parts[i].justifiee=e.target.checked;setParts([...parts])}}/>Absence justifiee</label>}
        {canSendMessage(p)&&<div className="md:col-span-3 rounded-2xl border border-orange-300/30 bg-orange-500/10 p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-orange-200">Message au participant absent</p>
          <textarea className={inputClass} rows="3" placeholder="Ecrire un message clair au participant..." value={messageForms[p.participant_id]||''} onChange={e=>updateMessageForm(p.participant_id,e.target.value)} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-400">Le message sera visible dans son dashboard avec une alerte.</p>
            <Button type="button" variant="secondary" disabled={sendingMessage===p.participant_id} onClick={()=>sendAbsenceMessage(p)}>{sendingMessage===p.participant_id?'Envoi...':'Envoyer message'}</Button>
          </div>
        </div>}
      </div>)}
      <div className="mt-4 flex gap-3"><Link to={`/animateur/sessions/${id}`}><Button type="button" variant="secondary">Retour session</Button></Link><Button disabled={!parts.length}>Enregistrer les absences</Button></div>
    </form></Card>
    <Card className="mt-4"><h3 className="mb-3 text-lg font-black text-[#08235a]">Absences deja enregistrees</h3>{!absences.length&&<p className="text-slate-500">Aucune absence enregistree.</p>}{absences.map(a=><div key={a.id} className="mb-2 rounded-2xl border border-slate-200 p-3"><b>{a.participant?.nom_complet||a.participant_id}</b><p className="text-sm text-slate-500">{a.date_absence} - {a.statut} {a.justification&&`- ${a.justification}`}</p></div>)}</Card>
  </>;
}
export function DocumentsUpload(){
  const {id}=useParams();
  const [session,setSession]=useState(null);
  const [f,setF]=useState({titre:'',type:'support_cours',file_path:''});
  const [file,setFile]=useState(null);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const load=()=>api.get(`/animateur/sessions/${id}`).then(r=>setSession(r.data));
  useEffect(()=>{load();},[id]);
  const submit=async(e)=>{
    e.preventDefault(); setMessage(''); setError('');
    try{
      const payload=new FormData();
      payload.append('titre',f.titre);
      payload.append('type',f.type);
      if(file) payload.append('file',file);
      if(!file && f.file_path) payload.append('file_path',f.file_path);
      await api.post(`/animateur/sessions/${id}/documents`,payload,{headers:{'Content-Type':'multipart/form-data'}});
      setF({titre:'',type:'support_cours',file_path:''}); setFile(null); setMessage('Document ajoute avec succes.'); load();
    }catch(err){setError(err.response?.data?.message || Object.values(err.response?.data?.errors||{})?.[0]?.[0] || 'Ajout du document impossible.');}
  };
  return <><PageTitle title="Documents session" subtitle={session?.formation?.titre || 'Ajoutez les supports pedagogiques de la session.'}/>
    {message&&<Card className="mb-4 bg-green-50 text-green-700">{message}</Card>}
    {error&&<Card className="mb-4 bg-red-50 text-red-700">{error}</Card>}
    <Card><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <Field label="Titre du document"><input required className={inputClass} value={f.titre} onChange={e=>setF({...f,titre:e.target.value})} placeholder="Ex: Support Laravel API"/></Field>
      <Field label="Type"><select required className={inputClass} value={f.type} onChange={e=>setF({...f,type:e.target.value})}><option value="support_cours">Support cours</option><option value="exercice">Exercice</option><option value="programme">Programme</option><option value="document_pedagogique">Document pedagogique</option><option value="autre">Autre</option></select></Field>
      <Field label="Fichier"><input className={inputClass} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" onChange={e=>setFile(e.target.files?.[0] || null)}/></Field>
      <Field label="Chemin fichier optionnel"><input className={inputClass} value={f.file_path} onChange={e=>setF({...f,file_path:e.target.value})} placeholder="documents/support.pdf"/></Field>
      <div className="md:col-span-2 flex gap-3"><Link to={`/animateur/sessions/${id}`}><Button type="button" variant="secondary">Retour session</Button></Link><Button>Ajouter le document</Button></div>
    </form></Card>
    <Card className="mt-4"><h3 className="mb-3 text-lg font-black text-[#08235a]">Documents deja ajoutes</h3>{!session?.documents?.length&&<p className="text-slate-500">Aucun document ajoute pour cette session.</p>}{session?.documents?.map(d=><div key={d.id} className="mb-2 rounded-2xl border border-slate-200 p-3"><b>{d.titre}</b><p className="text-sm text-slate-500">{d.type} - {d.file_path}</p></div>)}</Card>
  </>;
}
export function EvaluationPage(){
  const {id}=useParams();
  const nav=useNavigate();
  const [f,setF]=useState({note:5,satisfaction:5,commentaire:'',competences_acquises:''});
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const submit=async(e)=>{
    e.preventDefault(); setMessage(''); setError('');
    try{
      setLoading(true);
      await api.post(`/participant/participations/${id}/evaluation`,f);
      setMessage('Evaluation envoyee avec succes.');
      setTimeout(()=>nav('/participant/sessions'),700);
    }catch(err){
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors||{})?.[0]?.[0] || 'Envoi de l evaluation impossible.');
    }finally{
      setLoading(false);
    }
  };
  return <>
    <PageTitle title="Evaluation" subtitle="Votre avis aide a ameliorer les prochaines formations."/>
    {message&&<Card className="mb-4 bg-emerald-50 font-semibold text-emerald-800">{message}</Card>}
    {error&&<Card className="mb-4 bg-red-50 font-semibold text-red-700">{error}</Card>}
    <Card>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Note globale"><input required className={inputClass} type="number" min="1" max="5" value={f.note} onChange={e=>setF({...f,note:e.target.value})}/></Field>
        <Field label="Satisfaction"><input className={inputClass} type="number" min="1" max="5" value={f.satisfaction} onChange={e=>setF({...f,satisfaction:e.target.value})}/></Field>
        <Field label="Commentaire"><textarea className={inputClass} value={f.commentaire} onChange={e=>setF({...f,commentaire:e.target.value})} placeholder="Votre retour sur la session"/></Field>
        <Field label="Competences acquises"><textarea className={inputClass} value={f.competences_acquises} onChange={e=>setF({...f,competences_acquises:e.target.value})} placeholder="Ce que vous avez appris"/></Field>
        <div className="flex gap-3 md:col-span-2"><Button type="button" variant="secondary" onClick={()=>nav('/participant/sessions')}>Retour</Button><Button disabled={loading}>{loading?'Envoi...':'Envoyer l evaluation'}</Button></div>
      </form>
    </Card>
  </>}
