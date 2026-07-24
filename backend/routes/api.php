<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\ActivationController;
use App\Http\Controllers\Api\AnimateurController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CdcController;
use App\Http\Controllers\Api\DrController;
use App\Http\Controllers\Api\ForgotPasswordController;
use App\Http\Controllers\Api\ParticipantController;
use App\Http\Controllers\Api\ParticipantAdvisorController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ResponsableFormationController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:20,1');
Route::post('/forgot-password/send-code', [ForgotPasswordController::class, 'sendCode'])->middleware('throttle:5,1');
Route::post('/forgot-password/verify-code', [ForgotPasswordController::class, 'verifyCode'])->middleware('throttle:10,1');
Route::post('/forgot-password/reset', [ForgotPasswordController::class, 'reset'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/change-password', [AuthController::class, 'changePassword'])->middleware('throttle:10,1');
    Route::post('/activation/send-code', [ActivationController::class, 'sendCode'])->middleware('throttle:6,1');
    Route::post('/activation/verify-code', [ActivationController::class, 'verifyCode'])->middleware('throttle:10,1');

    Route::middleware('account.active')->group(function () {
        Route::prefix('account')->group(function () {
            Route::get('/profile', [AccountController::class, 'profile']);
            Route::put('/profile', [AccountController::class, 'updateProfile']);
            Route::post('/change-password', [AccountController::class, 'changePassword'])->middleware('throttle:10,1');
            Route::post('/email/send-code', [AccountController::class, 'sendEmailCode'])->middleware('throttle:6,1');
            Route::post('/email/verify-code', [AccountController::class, 'verifyEmailCode'])->middleware('throttle:10,1');
            Route::put('/profile-avatar', [AccountController::class, 'updateAvatar']);
        });

        Route::get('/themes', [CatalogController::class, 'themes']);
        Route::get('/themes/{theme}/formations', [CatalogController::class, 'themeFormations']);
        Route::get('/formations', [CatalogController::class, 'formations']);
        Route::post('/themes', [CatalogController::class, 'storeTheme'])->middleware('role:administrateur,responsable_cdc');
        Route::post('/formations', [CatalogController::class, 'storeFormation'])->middleware('role:administrateur,responsable_cdc');
        Route::middleware('role:administrateur,responsable_cdc,responsable_formation,formateur_animateur,responsable_dr')->prefix('reports')->group(function () {
            Route::get('/options', [ReportController::class, 'options']);
            Route::get('/plans', [ReportController::class, 'plans']);
        });

        Route::middleware('role:administrateur')->prefix('admin')->group(function () {
            Route::get('/dashboard', [AdminController::class, 'dashboard']);
            Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
            Route::get('/system-anomalies', [AdminController::class, 'systemAnomalies']);
            Route::get('/users', [AdminController::class, 'users']);
            Route::post('/users', [AdminController::class, 'createUser']);
            Route::get('/users/{user}', [AdminController::class, 'show']);
            Route::put('/users/{user}', [AdminController::class, 'update']);
            Route::patch('/users/{user}/suspend', [AdminController::class, 'suspend']);
            Route::patch('/users/{user}/reactivate', [AdminController::class, 'reactivate']);
            Route::post('/users/{user}/reset-password', [AdminController::class, 'resetPassword']);
            Route::get('/mail-settings', [AdminController::class, 'mailSetting']);
            Route::put('/mail-settings', [AdminController::class, 'updateMailSetting']);
            Route::get('/themes', [AdminController::class, 'themes']);
            Route::get('/formations', [AdminController::class, 'formations']);
        });

        Route::middleware('role:responsable_cdc')->prefix('cdc')->group(function () {
            Route::get('/dashboard', [CdcController::class, 'dashboard']);
            Route::get('/plans', [CdcController::class, 'plans']);
            Route::get('/absences', [CdcController::class, 'absences']);
            Route::post('/plans', [CdcController::class, 'createPlan']);
            Route::get('/plans/{plan}', [CdcController::class, 'showPlan']);
            Route::put('/plans/{plan}', [CdcController::class, 'updatePlan']);
            Route::delete('/plans/{plan}', [CdcController::class, 'deletePlan']);
            Route::post('/plans/{plan}/besoins', [CdcController::class, 'addBesoin']);
            Route::put('/besoins/{besoin}', [CdcController::class, 'updateBesoin']);
            Route::delete('/besoins/{besoin}', [CdcController::class, 'deleteBesoin']);
            Route::post('/plans/{plan}/lignes', [CdcController::class, 'addLigne']);
            Route::put('/lignes/{ligne}', [CdcController::class, 'updateLigne']);
            Route::delete('/lignes/{ligne}', [CdcController::class, 'deleteLigne']);
            Route::post('/plans/{plan}/documents', [CdcController::class, 'uploadDocument']);
            Route::post('/plans/{plan}/submit', [CdcController::class, 'submit']);
        });

        Route::middleware('role:responsable_formation')->prefix('responsable-formation')->group(function () {
            Route::get('/dashboard', [ResponsableFormationController::class, 'dashboard']);
            Route::get('/plans', [ResponsableFormationController::class, 'plans']);
            Route::get('/plans/{plan}', [ResponsableFormationController::class, 'showPlan']);
            Route::post('/plans/{plan}/validate', [ResponsableFormationController::class, 'validatePlan']);
            Route::post('/plans/{plan}/correction', [ResponsableFormationController::class, 'correction']);
            Route::post('/plans/{plan}/refuse', [ResponsableFormationController::class, 'refuse']);
            Route::get('/users', [ResponsableFormationController::class, 'users']);
            Route::get('/sessions', [ResponsableFormationController::class, 'sessions']);
            Route::post('/sessions', [ResponsableFormationController::class, 'createSession']);
            Route::get('/evaluations', [ResponsableFormationController::class, 'evaluations']);
            Route::get('/sessions/{session}', [ResponsableFormationController::class, 'showSession']);
            Route::put('/sessions/{session}', [ResponsableFormationController::class, 'updateSession']);
            Route::post('/sessions/{session}/participants', [ResponsableFormationController::class, 'addParticipants']);
            Route::post('/sessions/{session}/hebergements', [ResponsableFormationController::class, 'addHebergement']);
        });

        Route::middleware('role:formateur_animateur')->prefix('animateur')->group(function () {
            Route::get('/dashboard', [AnimateurController::class, 'dashboard']);
            Route::get('/sessions', [AnimateurController::class, 'sessions']);
            Route::get('/sessions/{session}', [AnimateurController::class, 'showSession']);
            Route::get('/sessions/{session}/participants', [AnimateurController::class, 'participants']);
            Route::patch('/sessions/{session}/finish', [AnimateurController::class, 'finishSession']);
            Route::post('/qr/verify', [AnimateurController::class, 'verifyQr'])->middleware('throttle:30,1');
            Route::post('/qr/confirm', [AnimateurController::class, 'confirmQrPresence'])->middleware('throttle:30,1');
            Route::post('/sessions/{session}/qr/scan', [AnimateurController::class, 'scanQrForSession'])->middleware('throttle:30,1');
            Route::post('/sessions/{session}/absences', [AnimateurController::class, 'recordAbsences']);
            Route::get('/sessions/{session}/absences', [AnimateurController::class, 'listAbsences']);
            Route::post('/sessions/{session}/absence-messages', [AnimateurController::class, 'sendAbsenceMessage']);
            Route::post('/sessions/{session}/documents', [AnimateurController::class, 'uploadDocument']);
        });

        Route::middleware('role:formateur_participant')->prefix('participant')->group(function () {
            Route::get('/dashboard', [ParticipantController::class, 'dashboard']);
            Route::get('/sessions', [ParticipantController::class, 'sessions']);
            Route::get('/sessions/{session}', [ParticipantController::class, 'showSession']);
            Route::get('/sessions/{session}/qr', [ParticipantController::class, 'qrCode'])->middleware('throttle:20,1');
            Route::get('/documents', [ParticipantController::class, 'documents']);
            Route::get('/documents/{document}/download', [ParticipantController::class, 'downloadDocument']);
            Route::get('/absences', [ParticipantController::class, 'absences']);
            Route::get('/messages', [ParticipantController::class, 'messages']);
            Route::patch('/messages/{message}/read', [ParticipantController::class, 'markMessageRead']);
            Route::post('/participations/{participation}/evaluation', [ParticipantController::class, 'evaluate']);
            Route::post('/advisor', ParticipantAdvisorController::class)->middleware('throttle:20,1');
        });

        Route::middleware('role:responsable_dr')->prefix('dr')->group(function () {
            Route::get('/dashboard', [DrController::class, 'dashboard']);
            Route::get('/plans', [DrController::class, 'plans']);
            Route::get('/plans/{plan}', [DrController::class, 'showPlan']);
            Route::get('/sessions', [DrController::class, 'sessions']);
            Route::get('/sessions/{session}', [DrController::class, 'showSession']);
            Route::get('/participants', [DrController::class, 'participants']);
            Route::get('/absences', [DrController::class, 'absences']);
            Route::get('/statistiques', [DrController::class, 'statistiques']);
        });
    });
});
