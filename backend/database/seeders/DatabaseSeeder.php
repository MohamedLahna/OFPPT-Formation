<?php

namespace Database\Seeders;

use App\Models\Formation;
use App\Models\MailSetting;
use App\Models\Theme;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $users = [['nom' => 'Admin', 'prenom' => 'System', 'email' => 'ilyassbono33@gmail.com', 'role' => 'administrateur'], ['nom' => 'CDC', 'prenom' => 'Responsable', 'email' => 'cdc@ofppt.local', 'role' => 'responsable_cdc'], ['nom' => 'Formation', 'prenom' => 'Responsable', 'email' => 'formation@ofppt.local', 'role' => 'responsable_formation'], ['nom' => 'DR', 'prenom' => 'Responsable', 'email' => 'dr@ofppt.local', 'role' => 'responsable_dr', 'region' => 'Casablanca-Settat'], ['nom' => 'Animateur', 'prenom' => 'Formateur', 'email' => 'animateur@ofppt.local', 'role' => 'formateur_animateur'], ['nom' => 'Participant', 'prenom' => 'Formateur', 'email' => 'participant@ofppt.local', 'role' => 'formateur_participant']];
        foreach ($users as $u) {
            $isAdmin = $u['role'] === 'administrateur';
            User::updateOrCreate(['email' => $u['email']], $u + ['password' => Hash::make('password'), 'statut' => $isAdmin ? 'actif' : 'en_attente_activation', 'actif' => $isAdmin, 'must_change_password' => !$isAdmin, 'email_verified_at' => $isAdmin ? now() : null, 'temporary_password_generated_at' => $isAdmin ? null : now()]);
        }
        MailSetting::updateOrCreate(['id' => 1], ['sender_name' => 'OFPPT Formation', 'sender_email' => 'ilyassbono33@gmail.com', 'is_active' => false]);
        $themes = ['Développement Web' => ['Laravel API', 'React JS', 'MySQL avancé'], 'Pédagogie' => ['Pédagogie active', 'Évaluation des compétences'], 'Réseaux Informatiques' => ['Sécurité réseau'], 'Cybersécurité' => [], 'Bureautique' => []];
        foreach ($themes as $name => $formations) {
            $theme = Theme::updateOrCreate(['nom' => $name], ['description' => 'Catalogue OFPPT']);
            foreach ($formations as $title) {
                Formation::updateOrCreate(['theme_id' => $theme->id, 'titre' => $title], ['description' => 'Formation ' . $title, 'objectif' => 'Renforcer les compétences des formateurs.', 'duree' => 5, 'niveau' => 'Intermédiaire']);
            }
        }
    }
}
