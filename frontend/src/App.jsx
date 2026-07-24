import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ChangePasswordOnly, ProtectedRoute } from './auth/ProtectedRoute';
import ShaderGradientBackground from './components/layout/ShaderGradientBackground';
import { AppLayout, Button } from './components/ui';
import { ActivationPage, ForgotPasswordPage, LoginPage } from './pages/AuthPages';
import AccountPage from './pages/AccountPage';
import { AdminAuditLogsPage, AdminCreateUser, AdminUserDetails, AdminUserEdit, AdminUsers, Dashboard, DownloadDocumentButton, DrStatisticsPage, MailSettingsPage, ReportPage, SimpleList, Unauthorized, absenceColumns, documentColumns, participantColumns, planColumns, sessionColumns } from './pages/CommonPages';
import { CdcBesoins, CdcConfiguration, CdcDocuments, CdcFormations, CdcPlanEdit, CdcPlanGeneral, CdcResume, PlanDetails } from './pages/WorkflowPages';
import { AbsencePage, AnimateurSessionActions, DocumentsUpload, EvaluationPage, HebergementsPage, QrScanPage, ResponsableEvaluationsPage, ResponsablePlans, ResponsableSessionActions, SessionCreate, SessionDetails, SessionEdit, SessionParticipants, SessionPlanning, SessionResume } from './pages/RolePages';
import { SessionsWithCalendar } from './pages/SessionCalendarPage';
import './index.css';

const d = {
  admin: { endpoint: '/admin/dashboard', title: 'Tableau de bord administrateur', labels: { total_utilisateurs: 'Total utilisateurs', comptes_actifs: 'Comptes actifs', comptes_en_attente_activation: 'En attente activation', comptes_suspendus: 'Comptes suspendus', plans_formation: 'Plans de formation', sessions: 'Sessions' } },
  cdc: { endpoint: '/cdc/dashboard', title: 'Tableau de bord CDC', labels: { plans_brouillon: 'Plans brouillon', plans_en_attente: 'Plans en attente', plans_valides: 'Plans valides', plans_a_corriger: 'Plans a corriger', plans_refuses: 'Plans refuses', absences: 'Absences constatees' } },
  rf: { endpoint: '/responsable-formation/dashboard', title: 'Responsable formation', labels: { plans_a_valider: 'Plans a valider', plans_valides: 'Plans valides', sessions_planifiees: 'Sessions planifiees', sessions_en_cours: 'Sessions en cours', sessions_terminees: 'Sessions terminees' } },
  an: { endpoint: '/animateur/dashboard', title: 'Formateur animateur', labels: { mes_sessions_a_venir: 'Sessions a venir', mes_sessions_en_cours: 'Sessions en cours', participants: 'Participants', absences_enregistrees: 'Absences', documents_ajoutes: 'Documents' } },
  pa: { endpoint: '/participant/dashboard', title: 'Formateur participant', labels: { mes_sessions_a_venir: 'Sessions a venir', mes_sessions_en_cours: 'Sessions en cours', mes_sessions_terminees: 'Sessions terminees', documents_disponibles: 'Documents', evaluations_a_remplir: 'Evaluations a remplir' } },
  dr: { endpoint: '/dr/dashboard', title: 'Responsable DR', labels: { region: 'Region affectee', plans_valides: 'Plans valides', sessions_planifiees: 'Sessions planifiees', sessions_en_cours: 'Sessions en cours', participants: 'Participants', nombre_absences: 'Absences' } },
};

function Dash({ cfg }) { return <Dashboard {...cfg} />; }

export default function App() {
  return <AuthProvider><div className="ofppt-app-shell relative min-h-screen overflow-hidden bg-[#070714]"><ShaderGradientBackground /><div className="ofppt-app-content relative z-10 min-h-screen"><BrowserRouter><Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route element={<ChangePasswordOnly />}><Route path="/activation" element={<ActivationPage />} /></Route>

      <Route element={<ProtectedRoute roles={['administrateur','responsable_cdc','responsable_formation','formateur_animateur','formateur_participant','responsable_dr']} />}><Route element={<AppLayout />}>
      <Route path="/mon-compte" element={<AccountPage />} />
      </Route></Route>

      <Route element={<ProtectedRoute roles={['administrateur']} />}><Route element={<AppLayout />}>
      <Route path="/admin/dashboard" element={<Dash cfg={d.admin} />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/users/create" element={<AdminCreateUser />} />
      <Route path="/admin/users/:id/edit" element={<AdminUserEdit />} />
      <Route path="/admin/users/:id/details" element={<AdminUserDetails />} />
      <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
      <Route path="/admin/mail-settings" element={<MailSettingsPage />} />
      <Route path="/admin/themes" element={<SimpleList endpoint="/admin/themes" title="Themes" columns={[{ key: 'nom', label: 'Nom' }]} />} />
      <Route path="/admin/formations" element={<SimpleList endpoint="/admin/formations" title="Formations" columns={[{ key: 'titre', label: 'Titre' }, { key: 'theme', label: 'Theme', render: r => r.theme?.nom }]} />} />
      <Route path="/admin/rapports" element={<ReportPage title="Rapports administrateur" />} />
      </Route></Route>

      <Route element={<ProtectedRoute roles={['responsable_cdc']} />}><Route element={<AppLayout />}>
      <Route path="/cdc/dashboard" element={<Dash cfg={d.cdc} />} />
      <Route path="/cdc/plans" element={<SimpleList endpoint="/cdc/plans" title="Plans CDC" subtitle="Creez, modifiez et suivez vos plans de formation depuis un seul espace." action={<Link to="/cdc/plans/create/general"><Button>Ajouter un plan</Button></Link>} columns={planColumns} renderActions={(p) => <div className="flex flex-wrap gap-2"><Link className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-[#08235a]" to={`/cdc/plans/${p.id}/details`}>Details</Link>{['brouillon','a_corriger'].includes(p.statut) && <Link className="rounded-full bg-[#008a94] px-3 py-2 text-xs font-black text-white" to={`/cdc/plans/${p.id}/edit`}>Modifier</Link>}</div>} />} />
      <Route path="/cdc/absences" element={<SimpleList endpoint="/cdc/absences" title="Absences des formations CDC" columns={absenceColumns} />} />
      <Route path="/cdc/rapports" element={<ReportPage title="Rapports CDC" />} />
      <Route path="/cdc/plans/create/general" element={<CdcPlanGeneral />} />
      <Route path="/cdc/plans/:id/besoins-thematiques" element={<CdcBesoins />} />
      <Route path="/cdc/plans/:id/formations" element={<CdcFormations />} />
      <Route path="/cdc/plans/:id/configuration" element={<CdcConfiguration />} />
      <Route path="/cdc/plans/:id/documents-logistique" element={<CdcDocuments />} />
      <Route path="/cdc/plans/:id/resume" element={<CdcResume />} />
      <Route path="/cdc/plans/:id/edit" element={<CdcPlanEdit />} />
      <Route path="/cdc/plans/:id/details" element={<PlanDetails />} />
      </Route></Route>

      <Route element={<ProtectedRoute roles={['responsable_formation']} />}><Route element={<AppLayout />}>
      <Route path="/responsable-formation/dashboard" element={<Dash cfg={d.rf} />} />
      <Route path="/responsable-formation/plans" element={<ResponsablePlans />} />
      <Route path="/responsable-formation/plans/:id" element={<PlanDetails />} />
      <Route path="/responsable-formation/sessions" element={<SimpleList endpoint="/responsable-formation/sessions" title="Sessions" subtitle="Planifiez les sessions issues des plans valides depuis cette page." action={<Link to="/responsable-formation/sessions/create"><Button>Ajouter une session</Button></Link>} columns={sessionColumns} renderActions={(s)=><ResponsableSessionActions session={s} />} />} />
      <Route path="/responsable-formation/sessions/create" element={<SessionCreate />} />
      <Route path="/responsable-formation/sessions/create/planification" element={<SessionPlanning />} />
      <Route path="/responsable-formation/sessions/create/participants" element={<SessionParticipants />} />
      <Route path="/responsable-formation/sessions/create/resume" element={<SessionResume />} />
      <Route path="/responsable-formation/sessions/:id" element={<SessionDetails />} />
      <Route path="/responsable-formation/sessions/:id/edit" element={<SessionEdit />} />
      <Route path="/responsable-formation/sessions/:id/hebergements" element={<HebergementsPage />} />
      <Route path="/responsable-formation/evaluations" element={<ResponsableEvaluationsPage />} />
      <Route path="/responsable-formation/rapports" element={<ReportPage title="Rapports responsable formation" />} />
      </Route></Route>

      <Route element={<ProtectedRoute roles={['formateur_animateur']} />}><Route element={<AppLayout />}>
      <Route path="/animateur/dashboard" element={<Dash cfg={d.an} />} />
      <Route path="/animateur/sessions" element={<SessionsWithCalendar endpoint="/animateur/sessions" role="animateur" title="Mes sessions" subtitle="Calendrier et liste complete de vos sessions assignees." columns={sessionColumns} renderActions={(s) => <AnimateurSessionActions session={s} />} />} />
      <Route path="/animateur/sessions/:id" element={<SessionDetails />} />
      <Route path="/animateur/sessions/:id/absences" element={<AbsencePage />} />
      <Route path="/animateur/sessions/:id/documents" element={<DocumentsUpload />} />
      <Route path="/animateur/qr-scan" element={<QrScanPage />} />
      <Route path="/animateur/rapports" element={<ReportPage title="Rapports animateur" />} />
      </Route></Route>

      <Route element={<ProtectedRoute roles={['formateur_participant']} />}><Route element={<AppLayout />}>
      <Route path="/participant/dashboard" element={<Dash cfg={d.pa} />} />
      <Route path="/participant/sessions" element={<SessionsWithCalendar endpoint="/participant/sessions" role="participant" title="Mes sessions" subtitle="Calendrier et liste complete de vos sessions inscrites." columns={sessionColumns} renderActions={(s) => <Link className="rounded-full bg-[#008a94] px-3 py-2 text-xs font-black text-white" to={`/participant/sessions/${s.id}`}>Details / QR</Link>} />} />
      <Route path="/participant/sessions/:id" element={<SessionDetails />} />
      <Route path="/participant/documents" element={<SimpleList endpoint="/participant/documents" title="Documents" columns={documentColumns} renderActions={(doc) => <DownloadDocumentButton doc={doc} />} />} />
      <Route path="/participant/absences" element={<SimpleList endpoint="/participant/absences" title="Absences" columns={absenceColumns} />} />
      <Route path="/participant/participations/:id/evaluation" element={<EvaluationPage />} />
      </Route></Route>

      <Route element={<ProtectedRoute roles={['responsable_dr']} />}><Route element={<AppLayout />}>
      <Route path="/dr/dashboard" element={<Dash cfg={d.dr} />} />
      <Route path="/dr/plans" element={<SimpleList endpoint="/dr/plans" title="Plans" columns={planColumns} renderActions={(p) => <Link className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-[#08235a]" to={`/dr/plans/${p.id}`}>Details</Link>} />} />
      <Route path="/dr/plans/:id" element={<PlanDetails />} />
      <Route path="/dr/sessions" element={<SimpleList endpoint="/dr/sessions" title="Sessions" columns={sessionColumns} renderActions={(s) => <Link className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-[#08235a]" to={`/dr/sessions/${s.id}`}>Details</Link>} />} />
      <Route path="/dr/sessions/:id" element={<SessionDetails />} />
      <Route path="/dr/participants" element={<SimpleList endpoint="/dr/participants" title="Participants de ma region" subtitle="Participants inscrits dans les sessions de votre region." columns={participantColumns} />} />
      <Route path="/dr/absences" element={<SimpleList endpoint="/dr/absences" title="Absences" columns={absenceColumns} />} />
      <Route path="/dr/statistiques" element={<DrStatisticsPage />} />
      <Route path="/dr/rapports" element={<ReportPage title="Rapports responsable DR" />} />
      </Route></Route>
    </Routes></BrowserRouter></div></div></AuthProvider>;
}





