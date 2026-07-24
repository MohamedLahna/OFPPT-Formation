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
            if (! Schema::hasColumn('sessions_formation', 'is_finished')) {
                $table->boolean('is_finished')->default(false)->after('statut');
            }

            if (! Schema::hasColumn('sessions_formation', 'finished_at')) {
                $table->timestamp('finished_at')->nullable()->after('is_finished');
            }
        });

        DB::table('sessions_formation')
            ->where('statut', 'terminee')
            ->update([
                'is_finished' => true,
                'finished_at' => now()->toDateTimeString(),
            ]);
    }

    public function down(): void
    {
        Schema::table('sessions_formation', function (Blueprint $table) {
            if (Schema::hasColumn('sessions_formation', 'finished_at')) {
                $table->dropColumn('finished_at');
            }

            if (Schema::hasColumn('sessions_formation', 'is_finished')) {
                $table->dropColumn('is_finished');
            }
        });
    }
};
