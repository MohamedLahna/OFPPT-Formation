<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('absence_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_formation_id')->constrained('sessions_formation')->cascadeOnDelete();
            $table->foreignId('participant_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('animateur_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('absence_id')->nullable()->constrained('absences')->nullOnDelete();
            $table->string('subject')->default('Message concernant votre absence');
            $table->text('message');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('absence_messages');
    }
};
