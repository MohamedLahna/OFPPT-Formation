<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'profile_icon')) {
                $table->string('profile_icon')->nullable()->after('role');
            }
            if (!Schema::hasColumn('users', 'profile_color')) {
                $table->string('profile_color')->nullable()->after('profile_icon');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'profile_color')) {
                $table->dropColumn('profile_color');
            }
            if (Schema::hasColumn('users', 'profile_icon')) {
                $table->dropColumn('profile_icon');
            }
        });
    }
};
