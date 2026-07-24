<?php
namespace Database\Factories;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
class UserFactory extends Factory { protected $model=User::class; public function definition(): array { return ['nom'=>fake()->lastName(),'prenom'=>fake()->firstName(),'email'=>fake()->unique()->safeEmail(),'password'=>Hash::make('password'),'role'=>'formateur_participant','statut'=>'actif','actif'=>true,'must_change_password'=>false]; } }
