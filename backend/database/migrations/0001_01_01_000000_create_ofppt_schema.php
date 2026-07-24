<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('prenom');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role');
            $table->string('region')->nullable();
            $table->string('statut')->default('en_attente_activation');
            $table->boolean('actif')->default(false);
            $table->boolean('must_change_password')->default(true);
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('temporary_password_generated_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('account_activation_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('pending_email');
            $table->string('pending_password_hash');
            $table->string('code');
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });

        Schema::create('mail_settings', function (Blueprint $table) {
            $table->id();
            $table->string('sender_name')->default('OFPPT Formation');
            $table->string('sender_email')->default('ilyassbono33@gmail.com');
            $table->text('app_password_encrypted')->nullable();
            $table->boolean('is_active')->default(false);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('password_reset_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('code');
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });

        Schema::create('themes', function (Blueprint $table) { $table->id(); $table->string('nom'); $table->text('description')->nullable(); $table->timestamps(); });
        Schema::create('formations', function (Blueprint $table) { $table->id(); $table->foreignId('theme_id')->constrained('themes')->cascadeOnDelete(); $table->string('titre'); $table->text('description')->nullable(); $table->text('objectif')->nullable(); $table->integer('duree')->nullable(); $table->string('niveau')->nullable(); $table->timestamps(); });
        Schema::create('plans_formation', function (Blueprint $table) { $table->id(); $table->foreignId('responsable_cdc_id')->constrained('users')->cascadeOnDelete(); $table->string('titre'); $table->integer('annee'); $table->date('periode_debut')->nullable(); $table->date('periode_fin')->nullable(); $table->text('objectif_general')->nullable(); $table->text('description')->nullable(); $table->string('statut')->default('brouillon'); $table->text('commentaire_validation')->nullable(); $table->timestamp('date_soumission')->nullable(); $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamps(); });
        Schema::create('besoins_formation', function (Blueprint $table) { $table->id(); $table->foreignId('plan_formation_id')->constrained('plans_formation')->cascadeOnDelete(); $table->string('domaine'); $table->text('probleme_observe')->nullable(); $table->string('competence_a_ameliorer')->nullable(); $table->string('public_cible')->nullable(); $table->text('justification')->nullable(); $table->foreignId('theme_id')->nullable()->constrained('themes')->nullOnDelete(); $table->timestamps(); });
        Schema::create('lignes_plan_formation', function (Blueprint $table) { $table->id(); $table->foreignId('plan_formation_id')->constrained('plans_formation')->cascadeOnDelete(); $table->foreignId('formation_id')->constrained('formations')->cascadeOnDelete(); $table->foreignId('besoin_formation_id')->nullable()->constrained('besoins_formation')->nullOnDelete(); $table->string('priorite'); $table->string('public_cible'); $table->integer('nombre_formateurs'); $table->integer('duree_proposee')->nullable(); $table->string('periode_souhaitee')->nullable(); $table->text('remarque')->nullable(); $table->boolean('hebergement_necessaire')->default(false); $table->integer('nombre_hors_ville')->nullable(); $table->string('ville_proposee')->nullable(); $table->text('remarque_logistique')->nullable(); $table->timestamps(); $table->unique(['plan_formation_id','formation_id']); });
        Schema::create('sessions_formation', function (Blueprint $table) { $table->id(); $table->foreignId('ligne_plan_formation_id')->constrained('lignes_plan_formation')->cascadeOnDelete(); $table->foreignId('formation_id')->constrained('formations')->cascadeOnDelete(); $table->foreignId('animateur_id')->constrained('users')->cascadeOnDelete(); $table->date('date_session'); $table->string('type_session'); $table->string('ville')->nullable(); $table->string('region')->nullable(); $table->string('lieu')->nullable(); $table->string('salle')->nullable(); $table->string('plateforme')->nullable(); $table->string('lien_visio')->nullable(); $table->string('statut')->default('planifiee'); $table->boolean('is_finished')->default(false); $table->timestamp('finished_at')->nullable(); $table->timestamps(); });
        Schema::create('participations', function (Blueprint $table) { $table->id(); $table->foreignId('session_formation_id')->constrained('sessions_formation')->cascadeOnDelete(); $table->foreignId('participant_id')->constrained('users')->cascadeOnDelete(); $table->string('statut')->default('inscrit'); $table->string('mode_participation')->nullable(); $table->date('date_inscription')->nullable(); $table->timestamps(); $table->unique(['session_formation_id','participant_id']); });
        Schema::create('absences', function (Blueprint $table) { $table->id(); $table->foreignId('session_formation_id')->constrained('sessions_formation')->cascadeOnDelete(); $table->foreignId('participant_id')->constrained('users')->cascadeOnDelete(); $table->date('date_absence'); $table->string('statut'); $table->text('justification')->nullable(); $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamps(); $table->unique(['session_formation_id','participant_id','date_absence']); });
        Schema::create('hebergements', function (Blueprint $table) { $table->id(); $table->foreignId('session_formation_id')->constrained('sessions_formation')->cascadeOnDelete(); $table->foreignId('participant_id')->constrained('users')->cascadeOnDelete(); $table->string('hotel')->nullable(); $table->string('adresse')->nullable(); $table->date('date_arrivee')->nullable(); $table->date('date_depart')->nullable(); $table->string('statut')->nullable(); $table->timestamps(); });
        Schema::create('documents', function (Blueprint $table) { $table->id(); $table->string('titre'); $table->string('type')->nullable(); $table->string('file_path'); $table->foreignId('plan_formation_id')->nullable()->constrained('plans_formation')->nullOnDelete(); $table->foreignId('formation_id')->nullable()->constrained('formations')->nullOnDelete(); $table->foreignId('session_formation_id')->nullable()->constrained('sessions_formation')->nullOnDelete(); $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete(); $table->timestamps(); });
        Schema::create('evaluations', function (Blueprint $table) { $table->id(); $table->foreignId('participation_id')->unique()->constrained('participations')->cascadeOnDelete(); $table->integer('note'); $table->integer('satisfaction')->nullable(); $table->text('commentaire')->nullable(); $table->text('competences_acquises')->nullable(); $table->timestamp('date_evaluation')->nullable(); $table->timestamps(); });
    }

    public function down(): void
    {
        foreach (['evaluations','documents','hebergements','absences','participations','sessions_formation','lignes_plan_formation','besoins_formation','plans_formation','formations','themes','password_reset_codes','mail_settings','account_activation_codes','personal_access_tokens','users'] as $table) Schema::dropIfExists($table);
    }
};
