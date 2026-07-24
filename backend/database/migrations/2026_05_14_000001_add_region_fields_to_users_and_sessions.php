<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'region')) {
                $table->string('region')->nullable()->after('role');
            }
        });

        Schema::table('sessions_formation', function (Blueprint $table) {
            if (!Schema::hasColumn('sessions_formation', 'ville')) {
                $table->string('ville')->nullable()->after('type_session');
            }
            if (!Schema::hasColumn('sessions_formation', 'region')) {
                $table->string('region')->nullable()->after('ville');
            }
        });

        DB::table('users')
            ->where('role', 'responsable_dr')
            ->whereNull('region')
            ->update(['region' => 'Casablanca-Settat']);

        DB::table('sessions_formation')
            ->whereNull('region')
            ->update(['region' => 'Casablanca-Settat']);

        DB::table('sessions_formation')
            ->whereNull('ville')
            ->update(['ville' => 'Casablanca']);
    }

    public function down(): void
    {
        Schema::table('sessions_formation', function (Blueprint $table) {
            if (Schema::hasColumn('sessions_formation', 'region')) {
                $table->dropColumn('region');
            }
            if (Schema::hasColumn('sessions_formation', 'ville')) {
                $table->dropColumn('ville');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'region')) {
                $table->dropColumn('region');
            }
        });
    }
};
