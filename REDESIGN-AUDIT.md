# RecipeBox AI — Redesign Audit (2026-10-13)

Competitors researched: **Paprika** (recipe detail with ingredient check-off, step-by-step cook mode, clean recipe printing), **NYT Cooking** (editorial recipe cards with rich meta, tag browsing).

## Visual gaps vs competitors
1. Recipe cards were flat text tiles — NYT Cooking cards carry stronger hierarchy: big serif title, meta row (time · servings · stars), tag chips, favorite marker.
2. The detail view was functional but plain; ingredient rows weren't interactive.

## Functional gaps vs competitors
1. **No ingredient check-off** on the detail — Paprika's signature "tap ingredients as you cook" interaction.
2. **No recipe printing** — Paprika prints clean recipe cards; the detail had no print path (grocery list did).

## Redesign plan
- **Richer recipe cards**: editorial hierarchy, meta row with stars, tag chips, favorite star, hover lift (kept, sharp edges).
- **Detail upgrades**: check-off ingredient rows (tap to check, in-memory), "Print recipe" button with a clean print stylesheet (title, meta, two-column ingredients/steps), serving scaler kept.
- All existing features preserved: search/tag/sort/favorites/top-rated, pantry match, week planner, grocery list (aisles, print, copy), custom recipes (add/edit/delete), ratings, cook mode with timer (cookMode ID untouched).

## Concept (1 paragraph)
Keep "The Cookbook" identity (cream paper, paprika red #c23a2b, Georgia serif) but push it toward the NYT Cooking shelf: editorial recipe cards with real hierarchy, and a detail page that behaves like Paprika — tap-to-check ingredients, serving scaler, one-tap print — so the box feels like the recipes you actually cook from, not a database you stare at.
