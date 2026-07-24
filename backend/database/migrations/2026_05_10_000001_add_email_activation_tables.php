<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'email_verified_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->timestamp('email_verified_at')->nullable()->after('must_change_password');
            });
        }

        if (Schema::hasColumn('users', 'identifiant')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('identifiant');
            });
        }

        if (!Schema::hasTable('account_activation_codes')) {
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
        }

        if (!Schema::hasTable('mail_settings')) {
            Schema::create('mail_settings', function (Blueprint $table) {
                $table->id();
                $table->string('sender_name')->default('OFPPT Formation');
                $table->string('sender_email')->default('ilyassbouhida6@gmail.com');
                $table->text('app_password_encrypted')->nullable();
                $table->boolean('is_active')->default(false);
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_settings');
        Schema::dropIfExists('account_activation_codes');
        if (Schema::hasColumn('users', 'email_verified_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('email_verified_at');
            });
        }
    }
};
