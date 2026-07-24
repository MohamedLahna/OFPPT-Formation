<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'API Gestion des formations OFPPT',
        'status' => 'ok',
        'frontend' => 'http://127.0.0.1:5174',
        'api' => url('/api'),
    ]);
});
