<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('participations', 'qr_token_hash')) {
            Schema::table('participations', function (Blueprint $table) {
                $table->string('qr_token_hash')->nullable()->after('date_inscription');
            });
        }

        if (!Schema::hasColumn('participations', 'qr_token_expires_at')) {
            Schema::table('participations', function (Blueprint $table) {
                $table->timestamp('qr_token_expires_at')->nullable()->after('qr_token_hash');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('participations', 'qr_token_expires_at')) {
            Schema::table('participations', function (Blueprint $table) {
                $table->dropColumn('qr_token_expires_at');
            });
        }

        if (Schema::hasColumn('participations', 'qr_token_hash')) {
            Schema::table('participations', function (Blueprint $table) {
                $table->dropColumn('qr_token_hash');
            });
        }
    }
};