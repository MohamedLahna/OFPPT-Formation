<?php
namespace App\Http\Controllers\Api\Concerns;
trait ApiResponses { protected function ok(array $data=[], string $message='Operation reussie.', int $status=200){ return response()->json(array_merge(['message'=>$message], $data), $status); } protected function forbidden(string $message='Acces interdit.'){ return response()->json(['message'=>$message], 403); } }