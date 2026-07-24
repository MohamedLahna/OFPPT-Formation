<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sessions_formation', function (Blueprint $table) {
            if (!Schema::hasColumn('sessions_formation', 'date_session')) {
                $table->date('date_session')->nullable()->after('animateur_id');
            }
        });

        if (Schema::hasColumn('sessions_formation', 'date_debut')) {
            DB::table('sessions_formation')
                ->whereNull('date_session')
                ->update(['date_session' => DB::raw('date_debut')]);
        }

        Schema::table('sessions_formation', function (Blueprint $table) {
            if (Schema::hasColumn('sessions_formation', 'date_debut')) {
                $table->dropColumn('date_debut');
            }
            if (Schema::hasColumn('sessions_formation', 'date_fin')) {
                $table->dropColumn('date_fin');
            }
        });

    }

    public function down(): void
    {
        Schema::table('sessions_formation', function (Blueprint $table) {
            if (!Schema::hasColumn('sessions_formation', 'date_debut')) {
                $table->date('date_debut')->nullable()->after('animateur_id');
            }
            if (!Schema::hasColumn('sessions_formation', 'date_fin')) {
                $table->date('date_fin')->nullable()->after('date_debut');
            }
        });

        DB::table('sessions_formation')->update([
            'date_debut' => DB::raw('date_session'),
            'date_fin' => DB::raw('date_session'),
        ]);

        Schema::table('sessions_formation', function (Blueprint $table) {
            if (Schema::hasColumn('sessions_formation', 'date_session')) {
                $table->dropColumn('date_session');
            }
        });
    }
};
