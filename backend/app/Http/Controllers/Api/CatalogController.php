<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Http\Requests\FormationCatalogRequest;
use App\Http\Requests\ThemeRequest;
use App\Http\Resources\FormationResource;
use App\Http\Resources\ThemeResource;
use App\Models\Formation;
use App\Models\Theme;
class CatalogController extends Controller
{
    public function themes(){ return ThemeResource::collection(Theme::with('formations')->get()); }
    public function formations(){ return FormationResource::collection(Formation::with('theme')->get()); }
    public function themeFormations(Theme $theme){ return FormationResource::collection($theme->formations()->with('theme')->get()); }
    public function storeTheme(ThemeRequest $request)
    {
        return (new ThemeResource(Theme::create($request->validated())->load('formations')))->response()->setStatusCode(201);
    }
    public function storeFormation(FormationCatalogRequest $request)
    {
        return (new FormationResource(Formation::create($request->validated())->load('theme')))->response()->setStatusCode(201);
    }
}
