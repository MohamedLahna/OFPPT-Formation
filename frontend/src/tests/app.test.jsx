import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage, ActivationPage, ForgotPasswordPage } from '../pages/AuthPages';
import { AdminCreateUser, AdminUsers, DrStatisticsPage, SimpleList, sessionColumns } from '../pages/CommonPages';
import { AnimateurSessionActions, HebergementsPage, ResponsableEvaluationsPage, SessionCreate, SessionDetails, SessionEdit, SessionPlanning } from '../pages/RolePages';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { AppLayout } from '../components/ui';

let mockUser = { id: 1, nom: 'System', prenom: 'Admin', role: 'administrateur', statut: 'actif', actif: true, must_change_password: false };

vi.mock('../auth/AuthContext', async () => ({
  useAuth: () => ({
    user: mockUser,
    login: vi.fn(), setUser: vi.fn(), refresh: vi.fn(), logout: vi.fn(), loading: false,
  }),
}));
vi.mock('../api/client', () => ({ default: { get: vi.fn((url) => {
  if (url.includes('/admin/users')) return Promise.resolve({ data: { data: [{ id: 1, nom_complet: 'Admin System', email: 'admin@ofppt.ma', role: 'administrateur', statut: 'actif', actif: true, must_change_password: false }] } });
  if (url.includes('/dr/statistiques')) return Promise.resolve({ data: { region: 'Casablanca-Settat', date_from: '2026-06-01', date_to: '2026-06-03', total_sessions: 3, total_absences: 1, participants: 2, max_daily_value: 2, series: [{ date: '2026-06-01', sessions: 1, absences: 0 }, { date: '2026-06-02', sessions: 1, absences: 1 }, { date: '2026-06-03', sessions: 1, absences: 0 }] } });
  if (url.includes('/responsable-formation/sessions/7')) return Promise.resolve({ data: { id: 7, formation: { titre: 'Laravel API' }, ville: 'Casablanca', date_session: '2026-05-01', date_debut: '2026-05-01', date_fin: '2026-05-01', type_session: 'presentielle', statut: 'planifiee', participations: [{ id: 10, participant_id: 6, participant: { nom_complet: 'Part P', email: 'part@ofppt.ma' } }], hebergements: [{ id: 3, participant_id: 6, participant: { nom_complet: 'Part P', email: 'part@ofppt.ma' }, hotel: 'Hotel Atlas', adresse: 'Centre', date_arrivee: '2026-05-01', date_depart: '2026-05-01', statut: 'reserve' }] } });
  if (url.includes('/responsable-formation/evaluations')) return Promise.resolve({ data: { data: [{ id: 1, note: 5, satisfaction: 4, commentaire: 'Tres utile', competences_acquises: 'API Laravel', date_evaluation: '2026-05-14 12:00:00', participant: { nom_complet: 'Part P', email: 'part@ofppt.ma' }, session: { id: 7, formation: 'Laravel API', date_session: '2026-05-01', is_finished: true } }] } });
  if (url.includes('/responsable-formation/sessions')) return Promise.resolve({ data: { data: [{ id: 7, formation: { titre: 'Laravel API' }, date_session: '2026-05-01', statut: 'terminee', is_finished: true }] } });
  if (url.includes('/participant/sessions/7')) return Promise.resolve({ data: { id: 7, formation: { titre: 'Laravel API' }, date_session: '2026-05-01', date_debut: '2026-05-01', date_fin: '2026-05-01', type_session: 'presentielle', statut: 'terminee', current_participation: { id: 44, participant_id: 6, evaluation: null }, documents: [] } });
  if (url.includes('/animateur/sessions')) return Promise.resolve({ data: { data: [{ id: 7, formation: { titre: 'Laravel API' }, date_session: '2026-05-01', date_debut: '2026-05-01', date_fin: '2026-05-01', type_session: 'distance', statut: 'planifiee', is_finished: false, can_finish: true }] } });
  if (url.includes('plans')) return Promise.resolve({ data: { data: [{ id: 1, titre: 'Plan valide', lignes: [{ id: 9, formation: { titre: 'Laravel API' } }] }] } });
  if (url.includes('users')) return Promise.resolve({ data: { data: [{ id: 2, nom_complet: 'Anim A', role: 'formateur_animateur' }, { id: 3, nom_complet: 'Part P', role: 'formateur_participant' }] } });
  return Promise.resolve({ data: {} });
}), post: vi.fn(() => Promise.resolve({ data: {} })), put: vi.fn(() => Promise.resolve({ data: { id: 7, salle: 'B2' } })) } }));

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('interface OFPPT', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); mockUser = { id: 1, nom: 'System', prenom: 'Admin', role: 'administrateur', statut: 'actif', actif: true, must_change_password: false }; });
  it('affiche le formulaire de connexion avec email et mot de passe seulement', () => {
    wrap(<LoginPage />);
    expect(screen.getByText('Connexion')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Mot de passe')).toBeInTheDocument();
  });
  it('affiche la page activation du compte', () => {
    mockUser = { id: 2, nom: 'DR', prenom: 'Responsable', role: 'responsable_dr', statut: 'en_attente_activation', actif: false, must_change_password: true };
    wrap(<ActivationPage />);
    expect(screen.getByText('Activation du compte')).toBeInTheDocument();
    expect(screen.getByText('Nouvelle adresse email')).toBeInTheDocument();
    expect(screen.getByText('Nouveau mot de passe')).toBeInTheDocument();
    expect(screen.getByText('Suivante')).toBeInTheDocument();
  });
  it('affiche la page mot de passe oublie', () => {
    wrap(<ForgotPasswordPage />);
    expect(screen.getByText('Mot de passe oublie')).toBeInTheDocument();
    expect(screen.getByText('Email du compte')).toBeInTheDocument();
    expect(screen.getByText('Recevoir le code')).toBeInTheDocument();
  });
  it('affiche la page admin utilisateurs', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route element={<ProtectedRoute roles={['administrateur']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: 'Utilisateurs' })).toBeInTheDocument();
    expect(await screen.findByText('Admin System')).toBeInTheDocument();
  });
  it('le formulaire admin cree un compte avec les champs requis', () => {
    wrap(<AdminCreateUser />);
    expect(screen.getByText('Creer un compte')).toBeInTheDocument();
    expect(screen.getByText('Email initial')).toBeInTheDocument();
    expect(screen.queryByText('Identifiant')).not.toBeInTheDocument();
  });
  it('la creation session affiche les champs dynamiques', async () => {
    localStorage.setItem('responsable-formation-session-draft', JSON.stringify({ ligne_plan_formation_id: 9, ligne_label: 'Plan valide - Laravel API' }));
    wrap(<SessionPlanning />);
    expect(await screen.findByText('Planification de la session')).toBeInTheDocument();
    expect(screen.getByText('Lieu')).toBeInTheDocument();
    expect(screen.getByText('Salle')).toBeInTheDocument();
  });
  it('le detail participant affiche les informations de session', () => {
    wrap(<SessionDetails />);
    expect(screen.getByText('Details session')).toBeInTheDocument();
  });
  it('le participant peut ouvrir le formulaire evaluation depuis une session terminee', async () => {
    mockUser = { id: 6, nom: 'Part', prenom: 'User', role: 'formateur_participant', statut: 'actif', actif: true, must_change_password: false };
    render(
      <MemoryRouter initialEntries={['/participant/sessions/7']}>
        <Routes>
          <Route path="/participant/sessions/:id" element={<SessionDetails />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText('Evaluer cette session')).toBeInTheDocument();
  });
  it('la liste animateur affiche les actions documents et absences', async () => {
    render(
      <MemoryRouter initialEntries={['/animateur/sessions']}>
        <Routes>
          <Route path="/animateur/sessions" element={<SimpleList endpoint="/animateur/sessions" title="Mes sessions" columns={sessionColumns} renderActions={(s) => <div><a href={`/animateur/sessions/${s.id}/documents`}>Documents</a><a href={`/animateur/sessions/${s.id}/absences`}>Absences</a></div>} />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText('Documents')).toBeInTheDocument();
    expect(await screen.findByText('Absences')).toBeInTheDocument();
  });
  it('affiche le bouton terminer quand la session animateur peut etre cloturee', () => {
    wrap(<AnimateurSessionActions session={{ id: 7, statut: 'planifiee', can_finish: true }} />);
    expect(screen.getByText('Terminer')).toBeInTheDocument();
  });
  it('affiche clairement une session deja terminee', () => {
    wrap(<AnimateurSessionActions session={{ id: 7, statut: 'terminee', is_finished: true, can_finish: false }} />);
    expect(screen.getByText('Session terminee')).toBeInTheDocument();
    expect(screen.queryByText('Terminer')).not.toBeInTheDocument();
  });
  it('affiche les statistiques DR avec sessions et absences par date', async () => {
    wrap(<DrStatisticsPage />);
    expect(await screen.findByRole('heading', { name: 'Statistiques DR' })).toBeInTheDocument();
    expect(await screen.findByText('Sessions sur la periode')).toBeInTheDocument();
    expect(await screen.findByText('Absences sur la periode')).toBeInTheDocument();
    expect(await screen.findByText('Detail par jour')).toBeInTheDocument();
  });
  it('affiche la gestion des hebergements pour responsable formation', async () => {
    render(
      <MemoryRouter initialEntries={['/responsable-formation/sessions/7/hebergements']}>
        <Routes>
          <Route path="/responsable-formation/sessions/:id/hebergements" element={<HebergementsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: 'Gestion des hebergements' })).toBeInTheDocument();
    expect(await screen.findByText('Hotel Atlas')).toBeInTheDocument();
    expect(await screen.findByText('Ajouter hebergement')).toBeInTheDocument();
  });
  it('affiche le formulaire de modification de session pour responsable formation', async () => {
    render(
      <MemoryRouter initialEntries={['/responsable-formation/sessions/7/edit']}>
        <Routes>
          <Route path="/responsable-formation/sessions/:id/edit" element={<SessionEdit />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: 'Modifier la session' })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Casablanca')).toBeInTheDocument();
    expect(await screen.findByText('Participants selectionnes')).toBeInTheDocument();
  });
  it('affiche les evaluations pour responsable formation', async () => {
    render(
      <MemoryRouter initialEntries={['/responsable-formation/evaluations']}>
        <Routes>
          <Route path="/responsable-formation/evaluations" element={<ResponsableEvaluationsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: 'Evaluations des participants' })).toBeInTheDocument();
    expect(await screen.findByText('Tres utile')).toBeInTheDocument();
    expect(await screen.findByText('Laravel API')).toBeInTheDocument();
  });
});
