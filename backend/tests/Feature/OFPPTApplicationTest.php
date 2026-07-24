<?php

namespace Tests\Feature;

use App\Models\Formation;
use App\Models\Absence;
use App\Models\AccountActivationCode;
use App\Models\LignePlanFormation;
use App\Models\Participation;
use App\Models\PlanFormation;
use App\Models\PasswordResetCode;
use App\Models\SessionFormation;
use App\Models\Theme;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OFPPTApplicationTest extends TestCase
{
    use RefreshDatabase;
    private function activeUser(string $role, array $attrs=[]): User { $base=str_replace('_','.',$role).fake()->unique()->numberBetween(100,9999); return User::create(array_merge(['nom'=>'Nom','prenom'=>'Prenom','email'=>$base.'@ofppt.test','password'=>'password','role'=>$role,'statut'=>'actif','actif'=>true,'must_change_password'=>false],$attrs)); }
    private function catalog(): array { $theme=Theme::create(['nom'=>'Développement Web']); $formation=Formation::create(['theme_id'=>$theme->id,'titre'=>'Laravel API','duree'=>5]); return [$theme,$formation]; }
    private function planPayload(array $overrides=[]): array { return array_merge(['titre'=>'Plan CDC','annee'=>2026,'periode_debut'=>'2026-05-01','periode_fin'=>'2026-05-30','objectif_general'=>'Renforcer les competences','description'=>'Plan detaille pour les formateurs'], $overrides); }
    private function besoinPayload(int $themeId, array $overrides=[]): array { return array_merge(['domaine'=>'Digital','probleme_observe'=>'Besoin de renforcer les competences backend','competence_a_ameliorer'=>'API REST','public_cible'=>'Formateurs developpement digital','justification'=>'Priorite pedagogique','theme_id'=>$themeId], $overrides); }
    private function validatedLine(): array { [$theme,$formation]=$this->catalog(); $cdc=$this->activeUser('responsable_cdc'); $plan=PlanFormation::create(['responsable_cdc_id'=>$cdc->id,'titre'=>'Plan','annee'=>2026,'statut'=>'valide']); $line=LignePlanFormation::create(['plan_formation_id'=>$plan->id,'formation_id'=>$formation->id,'priorite'=>'haute','public_cible'=>'Formateurs','nombre_formateurs'=>2]); return [$plan,$line,$formation]; }

    public function test_auth_admin_create_and_first_password_change_flow(): void
    {
        $admin=$this->activeUser('administrateur',['email'=>'ilyassbouhida6@gmail.com']);
        $this->postJson('/api/login',['email'=>'ilyassbouhida6@gmail.com','password'=>'password'])->assertOk()->assertJsonPath('needs_activation',false);
        $this->postJson('/api/login',['email'=>'ilyassbouhida6@gmail.com','password'=>'bad'])->assertUnauthorized();
        Sanctum::actingAs($admin);
        $create=$this->postJson('/api/admin/users',['nom'=>'Test','prenom'=>'Participant','email'=>'temp.participant@gmail.com','role'=>'formateur_participant'])->assertCreated();
        $temporary=$create->json('temporary_password'); $this->assertNotEmpty($temporary);
        $this->assertDatabaseHas('users',['email'=>'temp.participant@gmail.com','statut'=>'en_attente_activation','actif'=>false,'must_change_password'=>true]);
        $user=User::where('email','temp.participant@gmail.com')->first();
        $this->assertNull($user->email_verified_at);
        $this->postJson('/api/login',['email'=>'temp.participant@gmail.com','password'=>$temporary])->assertOk()->assertJsonPath('needs_activation',true);
        Sanctum::actingAs($user);
        $this->getJson('/api/participant/dashboard')->assertForbidden()->assertJsonPath('needs_activation',true);
        $this->postJson('/api/activation/send-code',['new_email'=>'bad-email','password'=>'Password123!','password_confirmation'=>'Password123!'])->assertStatus(422);
        $this->postJson('/api/activation/send-code',['new_email'=>'final.participant@example.com','password'=>'Password123!','password_confirmation'=>'Password123!'])->assertOk();
        $activation=AccountActivationCode::where('user_id',$user->id)->latest('id')->first();
        $this->assertNotNull($activation);
        $this->assertSame('final.participant@example.com',$activation->pending_email);
        $user->refresh();
        $this->assertSame('temp.participant@gmail.com',$user->email);
        $this->assertSame('en_attente_activation',$user->statut);
        $this->assertFalse($user->actif);
        $this->postJson('/api/activation/verify-code',['code'=>'000000'])->assertStatus(422)->assertJsonPath('message','Code incorrect');
        $activation->update(['code'=>Hash::make('123456'),'expires_at'=>now()->subMinute()]);
        $this->postJson('/api/activation/verify-code',['code'=>'123456'])->assertStatus(422)->assertJsonPath('message','Code expire, veuillez demander un nouveau code.');
        $this->postJson('/api/activation/send-code',['new_email'=>'final.participant@example.com','password'=>'Password123!','password_confirmation'=>'Password123!'])->assertOk();
        $activation=AccountActivationCode::where('user_id',$user->id)->latest('id')->first();
        $activation->update(['code'=>Hash::make('123456'),'expires_at'=>now()->addMinutes(10)]);
        $this->postJson('/api/activation/verify-code',['code'=>'123456'])->assertOk()->assertJsonPath('needs_activation',false)->assertJsonPath('user.email','final.participant@example.com')->assertJsonPath('user.statut','actif')->assertJsonPath('user.actif',true);
        $user->refresh(); $this->assertFalse($user->must_change_password); $this->assertTrue($user->actif); $this->assertSame('actif',$user->statut); $this->assertNotNull($user->email_verified_at);
        $this->assertNotNull($activation->fresh()->used_at);
        $this->postJson('/api/login',['email'=>'final.participant@example.com','password'=>'Password123!'])->assertOk()->assertJsonPath('needs_activation',false);
        $this->postJson('/api/login',['email'=>'temp.participant@gmail.com','password'=>$temporary])->assertUnauthorized();
        $user->update(['statut'=>'suspendu','actif'=>false]);
        $this->postJson('/api/login',['email'=>'final.participant@example.com','password'=>'Password123!'])->assertForbidden();
    }

    public function test_admin_management_and_role_access(): void
    {
        $admin=$this->activeUser('administrateur'); $cdc=$this->activeUser('responsable_cdc'); $participant=$this->activeUser('formateur_participant'); $dr=$this->activeUser('responsable_dr');
        Sanctum::actingAs($cdc); $this->getJson('/api/admin/users')->assertForbidden();
        Sanctum::actingAs($participant); $this->getJson('/api/admin/users')->assertForbidden();
        Sanctum::actingAs($admin); $res=$this->postJson('/api/admin/users',['nom'=>'A','prenom'=>'B','email'=>'ab@gmail.com','role'=>'formateur_participant'])->assertCreated(); $id=$res->json('user.id');
        $this->postJson('/api/admin/users',['nom'=>'Dup','prenom'=>'Mail','email'=>'ab@gmail.com','role'=>'formateur_participant'])->assertStatus(422);
        $this->putJson("/api/admin/users/$id",['nom'=>'Modifie','prenom'=>'Compte','email'=>'compte.modifie@gmail.com','role'=>'formateur_animateur','statut'=>'actif'])->assertOk();
        $this->assertDatabaseHas('users',['id'=>$id,'nom'=>'Modifie','email'=>'compte.modifie@gmail.com','role'=>'formateur_animateur','statut'=>'actif','actif'=>true]);
        $this->patchJson("/api/admin/users/$id/suspend")->assertOk()->assertJsonPath('user.statut','suspendu');
        $this->patchJson("/api/admin/users/$id/reactivate")->assertOk();
        $this->postJson("/api/admin/users/$id/reset-password")->assertOk()->assertJsonPath('user.must_change_password',true);
        Sanctum::actingAs($dr); $this->postJson('/api/cdc/plans',$this->planPayload(['titre'=>'No']))->assertForbidden();
    }

    public function test_forgot_password_code_flow(): void
    {
        $user=$this->activeUser('formateur_participant',['email'=>'forget.user@example.com']);
        $this->postJson('/api/forgot-password/send-code',['email'=>'missing@example.com'])->assertStatus(422);
        $this->postJson('/api/forgot-password/send-code',['email'=>'forget.user@example.com'])->assertOk();
        $reset=PasswordResetCode::where('user_id',$user->id)->latest('id')->first();
        $this->assertNotNull($reset);
        $this->postJson('/api/forgot-password/verify-code',['email'=>'forget.user@example.com','code'=>'000000'])->assertStatus(422)->assertJsonPath('message','Code incorrect');
        $reset->update(['code'=>Hash::make('123456'),'expires_at'=>now()->subMinute()]);
        $this->postJson('/api/forgot-password/verify-code',['email'=>'forget.user@example.com','code'=>'123456'])->assertStatus(422)->assertJsonPath('message','Code expire, veuillez demander un nouveau code.');
        $this->postJson('/api/forgot-password/send-code',['email'=>'forget.user@example.com'])->assertOk();
        $reset=PasswordResetCode::where('user_id',$user->id)->latest('id')->first();
        $reset->update(['code'=>Hash::make('123456'),'expires_at'=>now()->addMinutes(10)]);
        $this->postJson('/api/forgot-password/verify-code',['email'=>'forget.user@example.com','code'=>'123456'])->assertOk();
        $this->postJson('/api/forgot-password/reset',['email'=>'forget.user@example.com','code'=>'123456','password'=>'NewPassword123!','password_confirmation'=>'NewPassword123!'])->assertOk();
        $this->assertNotNull($reset->fresh()->used_at);
        $this->postJson('/api/login',['email'=>'forget.user@example.com','password'=>'NewPassword123!'])->assertOk();
        $this->postJson('/api/forgot-password/reset',['email'=>'forget.user@example.com','code'=>'123456','password'=>'Another123!','password_confirmation'=>'Another123!'])->assertStatus(422);
    }

    public function test_cdc_plan_and_validation_flow(): void
    {
        $cdc=$this->activeUser('responsable_cdc'); $rf=$this->activeUser('responsable_formation'); $animateur=$this->activeUser('formateur_animateur'); [$theme,$formation]=$this->catalog();
        Sanctum::actingAs($cdc); $this->postJson('/api/themes',['nom'=>'Cloud','description'=>'Theme cloud'])->assertCreated(); $this->postJson('/api/formations',['theme_id'=>$theme->id,'titre'=>'React avance','description'=>'React','objectif'=>'Approfondir React','duree'=>3,'niveau'=>'Avance'])->assertCreated(); $plan=$this->postJson('/api/cdc/plans',$this->planPayload())->assertCreated()->json(); $planId=$plan['id'];
        $this->postJson("/api/cdc/plans/$planId/submit")->assertStatus(422);
        $this->putJson("/api/cdc/plans/$planId",$this->planPayload(['titre'=>'Plan CDC modifie']))->assertOk();
        $this->assertDatabaseHas('plans_formation',['id'=>$planId,'titre'=>'Plan CDC modifie']);
        $besoin=$this->postJson("/api/cdc/plans/$planId/besoins",$this->besoinPayload($theme->id))->assertCreated()->json();
        $otherTheme=Theme::create(['nom'=>'Bureautique']);
        $otherBesoin=$this->postJson("/api/cdc/plans/$planId/besoins",$this->besoinPayload($otherTheme->id,['domaine'=>'Bureautique']))->assertCreated()->json();
        $this->postJson("/api/cdc/plans/$planId/lignes",['formation_id'=>$formation->id,'besoin_formation_id'=>$otherBesoin['id'],'priorite'=>'haute','public_cible'=>'Formateurs','nombre_formateurs'=>10])->assertStatus(422)->assertJsonPath('message','Le besoin choisi doit avoir la meme thematique que la formation.');
        $this->postJson("/api/cdc/plans/$planId/lignes",['formation_id'=>$formation->id,'priorite'=>'haute','public_cible'=>'Formateurs','nombre_formateurs'=>10,'periode_souhaitee'=>'2026-06-10'])->assertStatus(422)->assertJsonPath('message','La periode souhaitee doit etre comprise entre la date de debut et la date de fin du plan.');
        $this->postJson("/api/cdc/plans/$planId/lignes",['formation_id'=>$formation->id,'priorite'=>'haute','public_cible'=>'Formateurs','nombre_formateurs'=>10])->assertCreated();
        $this->assertDatabaseHas('lignes_plan_formation',['plan_formation_id'=>$planId,'formation_id'=>$formation->id,'besoin_formation_id'=>$besoin['id']]);
        $line=LignePlanFormation::where('plan_formation_id',$planId)->first();
        $line->update(['hebergement_necessaire'=>true,'nombre_hors_ville'=>4,'ville_proposee'=>'Casablanca','remarque_logistique'=>'Hotel proche centre']);
        $this->putJson("/api/cdc/lignes/{$line->id}",['formation_id'=>$formation->id,'priorite'=>'moyenne','public_cible'=>'Formateurs','nombre_formateurs'=>8])->assertOk();
        $this->assertDatabaseHas('lignes_plan_formation',['id'=>$line->id,'hebergement_necessaire'=>true,'nombre_hors_ville'=>4,'ville_proposee'=>'Casablanca','remarque_logistique'=>'Hotel proche centre']);
        $this->postJson("/api/cdc/plans/$planId/submit")->assertOk()->assertJsonPath('plan.statut','en_attente_validation');
        $this->putJson("/api/cdc/plans/$planId",$this->planPayload(['titre'=>'Change']))->assertForbidden();
        Sanctum::actingAs($animateur); $this->postJson("/api/responsable-formation/plans/$planId/validate")->assertForbidden();
        Sanctum::actingAs($rf); $this->postJson("/api/responsable-formation/plans/$planId/correction",[])->assertStatus(422); PlanFormation::find($planId)->update(['statut'=>'en_attente_validation']);
        $this->postJson("/api/responsable-formation/plans/$planId/refuse",[])->assertStatus(422); PlanFormation::find($planId)->update(['statut'=>'en_attente_validation']);
        $this->postJson("/api/responsable-formation/plans/$planId/validate")->assertOk()->assertJsonPath('plan.statut','valide');
    }

    public function test_session_absence_document_and_evaluation_flow(): void
    {
        [$plan,$line]=$this->validatedLine(); $rf=$this->activeUser('responsable_formation'); $animateur=$this->activeUser('formateur_animateur'); $other=$this->activeUser('formateur_animateur'); $participant=$this->activeUser('formateur_participant'); $participant2=$this->activeUser('formateur_participant'); $bad=$this->activeUser('responsable_dr',['region'=>'Casablanca-Settat']);
        $draft=PlanFormation::create(['responsable_cdc_id'=>$this->activeUser('responsable_cdc')->id,'titre'=>'Draft','annee'=>2026,'statut'=>'brouillon']); $draftLine=LignePlanFormation::create(['plan_formation_id'=>$draft->id,'formation_id'=>$line->formation_id,'priorite'=>'moyenne','public_cible'=>'X','nombre_formateurs'=>1]);
        Sanctum::actingAs($rf); $this->postJson('/api/responsable-formation/sessions',['ligne_plan_formation_id'=>$draftLine->id,'date_session'=>'2026-06-02','type_session'=>'presentielle','ville'=>'Casablanca','region'=>'Casablanca-Settat','lieu'=>'Casa','salle'=>'A','animateur_id'=>$animateur->id,'participants'=>[['id'=>$participant->id]]])->assertStatus(422);
        $this->postJson('/api/responsable-formation/sessions',['ligne_plan_formation_id'=>$line->id,'date_session'=>'2026-06-02','type_session'=>'presentielle','ville'=>'Casablanca','region'=>'Casablanca-Settat','animateur_id'=>$animateur->id,'participants'=>[['id'=>$participant->id]]])->assertStatus(422);
        $this->postJson('/api/responsable-formation/sessions',['ligne_plan_formation_id'=>$line->id,'date_session'=>'2026-06-02','type_session'=>'distance','ville'=>'Casablanca','region'=>'Casablanca-Settat','plateforme'=>'Teams','lien_visio'=>'https://meet','animateur_id'=>$bad->id,'participants'=>[['id'=>$participant->id]]])->assertStatus(422);
        $this->postJson('/api/responsable-formation/sessions',['ligne_plan_formation_id'=>$line->id,'date_session'=>'2026-06-02','type_session'=>'hybride','ville'=>'Casablanca','region'=>'Casablanca-Settat','lieu'=>'Casa','salle'=>'A','plateforme'=>'Teams','lien_visio'=>'https://meet','animateur_id'=>$animateur->id,'participants'=>[['id'=>$participant->id]]])->assertStatus(422);
        $this->postJson('/api/responsable-formation/sessions',['ligne_plan_formation_id'=>$line->id,'date_session'=>'2026-06-02','type_session'=>'presentielle','ville'=>'Casablanca','region'=>'Casablanca-Settat','lieu'=>'Casa','salle'=>'A','animateur_id'=>$animateur->id,'participants'=>[['id'=>$participant->id],['id'=>$participant->id]]])->assertStatus(422);
        $this->postJson('/api/responsable-formation/sessions',['ligne_plan_formation_id'=>$line->id,'date_session'=>'2026-06-02','type_session'=>'hybride','ville'=>'Casablanca','region'=>'Casablanca-Settat','lieu'=>'Casa','salle'=>'A','plateforme'=>'Teams','lien_visio'=>'https://meet','animateur_id'=>$animateur->id,'participants'=>[['id'=>$participant->id,'mode_participation'=>'presentiel'],['id'=>$participant2->id,'mode_participation'=>'distance']]])->assertCreated();
        $session=SessionFormation::latest('id')->first();
        $this->assertSame('2026-06-02', $session->date_session->toDateString());
        $this->putJson("/api/responsable-formation/sessions/{$session->id}",['date_session'=>'2026-06-02','type_session'=>'hybride','ville'=>'Casablanca','region'=>'Casablanca-Settat','lieu'=>'Casa','salle'=>'B2','plateforme'=>'Teams','lien_visio'=>'https://meet-updated','animateur_id'=>$animateur->id,'participants'=>[['id'=>$participant->id,'mode_participation'=>'presentiel'],['id'=>$participant2->id,'mode_participation'=>'distance']]])->assertOk()->assertJsonFragment(['salle'=>'B2']);
        $this->assertDatabaseHas('sessions_formation',['id'=>$session->id,'salle'=>'B2','lien_visio'=>'https://meet-updated']);
        $this->postJson("/api/responsable-formation/sessions/{$session->id}/hebergements",['participant_id'=>$participant->id,'hotel'=>'Hotel Atlas','adresse'=>'Centre ville','date_arrivee'=>'2026-06-02','date_depart'=>'2026-06-02','statut'=>'reserve'])->assertCreated()->assertJsonPath('hebergement.hotel','Hotel Atlas');
        $this->assertDatabaseHas('hebergements',['session_formation_id'=>$session->id,'participant_id'=>$participant->id,'hotel'=>'Hotel Atlas']);
        $this->getJson("/api/responsable-formation/sessions/{$session->id}")->assertOk()->assertJsonFragment(['hotel'=>'Hotel Atlas']);
        $this->postJson('/api/responsable-formation/sessions',['ligne_plan_formation_id'=>$line->id,'date_session'=>'2026-06-10','type_session'=>'presentielle','ville'=>'Rabat','region'=>'Rabat-Sale-Kenitra','lieu'=>'Rabat','salle'=>'B','animateur_id'=>$animateur->id,'participants'=>[['id'=>$participant->id]]])->assertCreated();
        $presentielle=SessionFormation::latest('id')->first();
        Sanctum::actingAs($bad);
        $this->getJson('/api/dr/dashboard')->assertOk()->assertJsonPath('region','Casablanca-Settat')->assertJsonPath('participants',2);
        $this->getJson('/api/dr/sessions')->assertOk()->assertJsonFragment(['region'=>'Casablanca-Settat'])->assertJsonMissing(['region'=>'Rabat-Sale-Kenitra']);
        $this->getJson('/api/dr/participants')->assertOk()->assertJsonFragment(['email'=>$participant->email]);
        $drRabat=$this->activeUser('responsable_dr',['region'=>'Rabat-Sale-Kenitra']);
        Sanctum::actingAs($drRabat);
        $this->getJson('/api/dr/sessions')->assertOk()->assertJsonFragment(['region'=>'Rabat-Sale-Kenitra'])->assertJsonMissing(['region'=>'Casablanca-Settat']);
        $this->getJson('/api/dr/statistiques')->assertOk()->assertJsonPath('region','Rabat-Sale-Kenitra');
        Sanctum::actingAs($rf); $this->getJson('/api/reports/plans?plan_id='.$plan->id.'&formation_id='.$line->formation_id)->assertOk()->assertJsonFragment(['formation'=>'Laravel API']);
        Sanctum::actingAs(User::find($plan->responsable_cdc_id)); $this->getJson('/api/reports/plans?plan_id='.$plan->id)->assertOk()->assertJsonFragment(['plan'=>'Plan']);
        $otherCdc=$this->activeUser('responsable_cdc'); Sanctum::actingAs($otherCdc); $this->getJson('/api/reports/plans?plan_id='.$plan->id)->assertOk()->assertJsonPath('data.0',null);
        Sanctum::actingAs($animateur); $this->getJson('/api/reports/plans?animateur_id='.$animateur->id)->assertOk()->assertJsonFragment(['session_id'=>$session->id]);
        Sanctum::actingAs($other); $this->postJson("/api/animateur/sessions/{$session->id}/absences",['date_absence'=>'2026-06-02','absences'=>[['participant_id'=>$participant->id,'statut'=>'absent']]])->assertForbidden();
        Sanctum::actingAs($animateur); $this->postJson("/api/animateur/sessions/{$session->id}/absences",['date_absence'=>'2026-07-02','absences'=>[['participant_id'=>$participant->id,'statut'=>'absent']]])->assertStatus(422);
        $this->postJson("/api/animateur/sessions/{$session->id}/absences",['date_absence'=>'2026-06-02','absences'=>[['participant_id'=>$participant->id,'statut'=>'absent']]])->assertCreated();
        $this->postJson("/api/animateur/sessions/{$session->id}/absences",['date_absence'=>'2026-06-02','absences'=>[['participant_id'=>$participant->id,'statut'=>'absent']]])->assertCreated();
        $this->patchJson("/api/animateur/sessions/{$session->id}/finish")->assertStatus(422);
        Carbon::setTestNow('2026-06-02 16:00:00');
        Sanctum::actingAs($other); $this->patchJson("/api/animateur/sessions/{$session->id}/finish")->assertForbidden();
        Sanctum::actingAs($animateur); $this->patchJson("/api/animateur/sessions/{$session->id}/finish")->assertOk()->assertJsonPath('session.statut','terminee')->assertJsonPath('session.is_finished',true);
        $this->assertDatabaseHas('sessions_formation',['id'=>$session->id,'statut'=>'terminee','is_finished'=>true]);
        Carbon::setTestNow();
        Sanctum::actingAs($bad);
        $this->getJson('/api/dr/statistiques?date_from=2026-06-02&date_to=2026-06-02')
            ->assertOk()
            ->assertJsonPath('region', 'Casablanca-Settat')
            ->assertJsonPath('total_sessions', 1)
            ->assertJsonPath('total_absences', 1)
            ->assertJsonPath('series.0.date', '2026-06-02')
            ->assertJsonPath('series.0.sessions', 1)
            ->assertJsonPath('series.0.absences', 1);
        $this->getJson('/api/dr/statistiques?date_from=2026-06-01&date_to=2026-06-03')
            ->assertOk()
            ->assertJsonPath('total_sessions', 1)
            ->assertJsonPath('total_absences', 1)
            ->assertJsonPath('series.0.sessions', 0)
            ->assertJsonPath('series.1.sessions', 1)
            ->assertJsonPath('series.1.absences', 1)
            ->assertJsonPath('series.2.sessions', 0);
        Sanctum::actingAs(User::find($plan->responsable_cdc_id)); $this->getJson('/api/cdc/absences')->assertOk()->assertJsonFragment(['statut'=>'absent']); $this->getJson('/api/cdc/dashboard')->assertOk()->assertJsonPath('absences',1);
        $cdc=$this->activeUser('responsable_cdc'); $ownPlan=PlanFormation::create(['responsable_cdc_id'=>$cdc->id,'titre'=>'Doc','annee'=>2026,'statut'=>'brouillon']); Sanctum::actingAs($cdc); $this->postJson("/api/cdc/plans/{$ownPlan->id}/documents",['titre'=>'Fiche','type'=>'fiche_besoin','file_path'=>'documents/fiche.pdf'])->assertCreated();
        Storage::fake('public'); Storage::disk('public')->put('documents/support.pdf','support de cours');
        Sanctum::actingAs($animateur); $this->postJson("/api/animateur/sessions/{$session->id}/documents",['titre'=>'Support','type'=>'support_cours','file_path'=>'documents/support.pdf'])->assertCreated();
        Sanctum::actingAs($participant); $this->getJson('/api/participant/documents')->assertOk()->assertJsonFragment(['titre'=>'Support']);
        $this->getJson("/api/participant/sessions/{$session->id}/qr")->assertStatus(422);
        $qr=$this->getJson("/api/participant/sessions/{$presentielle->id}/qr")->assertOk()->assertJsonPath('session.type_session','presentielle')->json('qr_payload');
        Sanctum::actingAs($other); $this->postJson('/api/animateur/qr/verify',['token'=>$qr])->assertStatus(422);
        Sanctum::actingAs($animateur); $this->postJson('/api/animateur/qr/verify',['token'=>$qr])->assertOk()->assertJsonPath('participant.email',$participant->email)->assertJsonPath('session.formation','Laravel API');
        Participation::where('session_formation_id',$presentielle->id)->where('participant_id',$participant->id)->first()->update(['qr_token_expires_at'=>now()->subMinute()]);
        $this->postJson('/api/animateur/qr/verify',['token'=>$qr])->assertStatus(422)->assertJsonPath('message','QR code expiré.');
        Carbon::setTestNow('2026-06-10 10:00:00');
        Sanctum::actingAs($participant);
        $qr=$this->getJson("/api/participant/sessions/{$presentielle->id}/qr")->assertOk()->json('qr_payload');
        Sanctum::actingAs($animateur);
        $this->postJson("/api/animateur/sessions/{$session->id}/qr/scan",['token'=>$qr])->assertStatus(422)->assertJsonPath('message','Ce QR code ne correspond pas a la session selectionnee.');
        $this->postJson("/api/animateur/sessions/{$presentielle->id}/qr/scan",['token'=>$qr])->assertOk()->assertJsonPath('attendance.statut','present')->assertJsonPath('participant.email',$participant->email)->assertJsonPath('session.formation','Laravel API');
        $this->postJson('/api/animateur/qr/confirm',['token'=>$qr])->assertOk()->assertJsonPath('attendance.statut','present');
        $this->assertTrue(Absence::where('session_formation_id',$presentielle->id)->where('participant_id',$participant->id)->whereDate('date_absence','2026-06-10')->where('statut','present')->exists());
        Carbon::setTestNow();
        Sanctum::actingAs($participant);
        $documentId=\App\Models\Document::where('titre','Support')->value('id'); $this->get("/api/participant/documents/$documentId/download")->assertOk();
        $participation=Participation::where('session_formation_id',$session->id)->where('participant_id',$participant->id)->first();
        Sanctum::actingAs($bad); $this->postJson("/api/participant/participations/{$participation->id}/evaluation",['note'=>5])->assertForbidden();
        Sanctum::actingAs($participant); $this->postJson("/api/participant/participations/{$participation->id}/evaluation",['note'=>5,'satisfaction'=>4,'commentaire'=>'Tres utile'])->assertCreated(); $this->postJson("/api/participant/participations/{$participation->id}/evaluation",['note'=>5])->assertStatus(422);
        Sanctum::actingAs($rf); $this->getJson('/api/responsable-formation/evaluations')->assertOk()->assertJsonFragment(['commentaire'=>'Tres utile'])->assertJsonFragment(['formation'=>'Laravel API']);
        $this->getJson('/api/responsable-formation/evaluations?session_id='.$session->id)->assertOk()->assertJsonFragment(['commentaire'=>'Tres utile']);
    }
}
