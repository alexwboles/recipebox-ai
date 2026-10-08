#!/usr/bin/env bash
# RecipeBox AI smoke tests — fast sanity checks. Exit non-zero on first failure.
set -euo pipefail
cd "$(dirname "$0")/.."

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

# 1: required files exist
for f in index.html css/style.css js/recipes.js js/logic.js js/app.js README.md test/e2e.sh test/run-e2e.js; do
  [ -f "$f" ] || fail "missing file $f"
done
pass "all required files exist"

# 2: JS syntax valid
for f in js/recipes.js js/logic.js js/app.js test/run-e2e.js; do
  node --check "$f" || fail "syntax error in $f"
done
pass "JS syntax valid"

# 3: starter bank has 20+ recipes
count=$(node -e "const R=require('./js/recipes.js'); console.log(R.RECIPES.length)")
[ "$count" -ge 20 ] || fail "recipe bank too small: $count"
pass "starter bank has $count recipes (>=20)"

# 4: every recipe has required fields
node -e "
const R = require('./js/recipes.js');
R.RECIPES.forEach(r => {
  if (!r.id || !r.name || !Array.isArray(r.tags) || !(r.timeMin >= 0) || !(r.servings > 0)) throw new Error('bad recipe: ' + r.id);
  if (!r.ingredients.length || !r.steps.length) throw new Error('empty recipe: ' + r.id);
  r.ingredients.forEach(i => { if (!i.name || !(i.qty > 0)) throw new Error('bad ingredient in ' + r.id); });
});
console.log('OK');
" || fail "recipe schema check"
pass "every recipe has id/name/tags/time/servings/ingredients/steps"

# 5: search finds recipes by ingredient
node -e "
const RB = require('./js/logic.js');
const R = require('./js/recipes.js');
const hits = RB.searchRecipes(R.RECIPES, 'chickpea');
if (!hits.some(r => r.id === 'veggie-curry')) throw new Error('chickpea search missed curry');
const all = RB.searchRecipes(R.RECIPES, '');
if (all.length !== R.RECIPES.length) throw new Error('empty query should return all');
console.log('OK');
" || fail "search"
pass "search by ingredient works; empty query returns all"

# 6: tag filter narrows results
node -e "
const RB = require('./js/logic.js');
const R = require('./js/recipes.js');
const v = RB.searchRecipes(R.RECIPES, '', 'vegan');
if (!v.length) throw new Error('no vegan recipes');
v.forEach(r => { if (r.tags.indexOf('vegan') === -1) throw new Error('non-vegan in vegan filter: ' + r.id); });
console.log('OK: ' + v.length + ' vegan');
" || fail "tag filter"
pass "tag filter returns only matching recipes"

# 7: addRecipe validates bad input
node -e "
const RB = require('./js/logic.js');
const bad = RB.addRecipe([], { name: '', ingredients: [], steps: [], servings: 0, timeMin: -1 });
if (!bad.errors.length) throw new Error('expected validation errors');
const good = RB.addRecipe([], { name: 'Test Soup', tags: ['dinner'], timeMin: 20, servings: 2,
  ingredients: [{ name: 'water', qty: 500, unit: 'ml' }], steps: ['Boil.'] });
if (good.errors.length) throw new Error('unexpected errors: ' + good.errors.join(','));
if (!good.recipe.id || !good.recipe.custom) throw new Error('new recipe needs id + custom flag');
console.log('OK');
" || fail "addRecipe validation"
pass "addRecipe rejects bad input, accepts good input"

# 8: grocery list merges duplicate ingredients across recipes
node -e "
const RB = require('./js/logic.js');
const R = require('./js/recipes.js');
// chili and tacos both use ground beef? tacos yes; use two recipes sharing 'olive oil'
const plan = { 0: 'pesto-pasta', 2: 'salmon-sheet' }; // both use olive oil
const list = RB.groceryList(plan, R.RECIPES, {});
const oil = list.filter(g => g.name === 'olive oil');
if (oil.length !== 1) throw new Error('olive oil should merge to 1 row, got ' + oil.length);
if (!(oil[0].qty > 1)) throw new Error('merged qty should sum');
console.log('OK: olive oil qty=' + oil[0].qty + oil[0].unit);
" || fail "grocery merge"
pass "grocery list merges duplicate ingredients"

# 9: scaling servings scales quantities
node -e "
const RB = require('./js/logic.js');
const R = require('./js/recipes.js');
const r = R.RECIPES.find(x => x.id === 'pancakes');
const s = RB.scaleRecipe(r, 8);
const flour = s.ingredients.find(i => i.name === 'flour');
if (flour.qty !== 500) throw new Error('expected 500g flour for 8 servings, got ' + flour.qty);
console.log('OK');
" || fail "scaling"
pass "doubling servings doubles ingredient quantities"

# 10: favorites toggle on/off
node -e "
const RB = require('./js/logic.js');
let f = RB.toggleFavorite([], 'x');
if (f.length !== 1) throw new Error('add failed');
f = RB.toggleFavorite(f, 'x');
if (f.length !== 0) throw new Error('remove failed');
console.log('OK');
" || fail "favorites"
pass "favorite toggle adds and removes"

# 13: sortRecipes orders by name / time / servings
node -e "
const RB = require('./js/logic.js');
const R = require('./js/recipes.js');
const byName = RB.sortRecipes(R.RECIPES, 'name');
for (let i = 1; i < byName.length; i++) {
  if (byName[i-1].name.localeCompare(byName[i].name) > 0) throw new Error('name sort broken at ' + i);
}
const byTime = RB.sortRecipes(R.RECIPES, 'time');
for (let i = 1; i < byTime.length; i++) {
  if (byTime[i-1].timeMin > byTime[i].timeMin) throw new Error('time sort broken at ' + i);
}
const byServ = RB.sortRecipes(R.RECIPES, 'servings');
for (let i = 1; i < byServ.length; i++) {
  if (byServ[i-1].servings > byServ[i].servings) throw new Error('servings sort broken at ' + i);
}
console.log('OK');
" || fail "sortRecipes"
pass "sortRecipes orders by name, time, servings"

# 14: update + delete custom recipes
node -e "
const RB = require('./js/logic.js');
const made = RB.addRecipe([], { name: 'Test Stew', tags: ['dinner'], timeMin: 40, servings: 4,
  ingredients: [{ name: 'beef', qty: 500, unit: 'g' }], steps: ['Simmer.'] });
if (made.errors.length) throw new Error('setup failed');
const upd = RB.updateRecipe([made.recipe], made.recipe.id, { name: 'Test Stew v2', tags: ['dinner'], timeMin: 45, servings: 6,
  ingredients: [{ name: 'beef', qty: 750, unit: 'g' }], steps: ['Simmer longer.'] });
if (upd.errors.length) throw new Error('update errors: ' + upd.errors.join(','));
if (upd.custom.length !== 1 || upd.recipe.name !== 'Test Stew v2' || upd.recipe.servings !== 6) throw new Error('update did not apply');
if (upd.recipe.id !== made.recipe.id || !upd.recipe.custom) throw new Error('update must keep id + custom flag');
const bad = RB.updateRecipe([made.recipe], made.recipe.id, { name: '', ingredients: [], steps: [], servings: 0, timeMin: 0 });
if (!bad.errors.length) throw new Error('update should validate');
const missing = RB.updateRecipe([], 'nope', { name: 'X', ingredients: [{name:'a',qty:1,unit:''}], steps: ['s'], servings: 1, timeMin: 1 });
if (!missing.errors.length) throw new Error('update of unknown id should fail');
const gone = RB.deleteCustomRecipe(upd.custom, made.recipe.id);
if (gone.length !== 0) throw new Error('delete failed');
console.log('OK');
" || fail "update/delete custom recipes"
pass "updateRecipe validates + preserves id; deleteCustomRecipe removes"

# 15: groceryListText builds a shareable plain-text list
node -e "
const RB = require('./js/logic.js');
const t = RB.groceryListText([{ name: 'garlic', qty: 6, unit: 'cloves' }, { name: 'salt', qty: 1, unit: '' }]);
if (!/garlic — 6 cloves/.test(t)) throw new Error('bad line: ' + t);
if (t.split('\n').length !== 2) throw new Error('expected 2 lines');
console.log('OK');
" || fail "groceryListText"
pass "groceryListText renders plain-text list"

# 16: new UI wiring present
for id in rb-sort rb-edit rb-del rb-inc rb-dec g-copy groceryListText; do
  grep -q "$id" js/app.js || fail "UI wiring missing: $id"
done
pass "edit/delete/sort/scaler/copy-list wiring present"

# 11: assign/remove day
node -e "
const RB = require('./js/logic.js');
let p = RB.assignToDay({}, 0, 'tacos');
if (p[0] !== 'tacos') throw new Error('assign failed');
p = RB.removeFromDay(p, 0);
if (p[0]) throw new Error('remove failed');
console.log('OK');
" || fail "week plan assign/remove"
pass "week plan assign and remove work"

# 12: suggest respects maxTime
node -e "
const RB = require('./js/logic.js');
const R = require('./js/recipes.js');
const s = RB.suggestRecipes(R.RECIPES, { maxTime: 15 });
if (!s.length) throw new Error('no quick recipes');
s.forEach(r => { if (r.timeMin > 15) throw new Error('too slow: ' + r.id); });
console.log('OK: ' + s.length + ' quick recipes');
" || fail "suggest maxTime"
pass "suggestRecipes respects maxTime"

echo "All smoke tests passed."
