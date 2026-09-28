// E2E flows for RecipeBox AI. Run with: node test/run-e2e.js
"use strict";
const assert = require("assert");
const RB = require("../js/logic.js");
const R = require("../js/recipes.js").RECIPES;

let passed = 0;
function flow(name, fn) {
  try { fn(); passed++; console.log("PASS: " + name); }
  catch (e) { console.error("FAIL: " + name + " — " + e.message); process.exitCode = 1; }
}

// Flow 1: new user adds a family recipe, favorites it, plans it Monday, checks grocery list
flow("add -> favorite -> plan Monday -> grocery list", () => {
  const res = RB.addRecipe(R, {
    name: "Grandma's Lasagna", tags: ["dinner", "family", "italian"], timeMin: 75, servings: 6,
    ingredients: [{ name: "lasagna noodles", qty: 12, unit: "pc" }, { name: "ricotta", qty: 500, unit: "g" }, { name: "olive oil", qty: 1, unit: "tbsp" }],
    steps: ["Layer noodles, ricotta, sauce.", "Bake 45 min."]
  });
  assert.strictEqual(res.errors.length, 0, res.errors.join(","));
  const all = R.concat([res.recipe]);
  let favs = RB.toggleFavorite([], res.recipe.id);
  assert.ok(favs.indexOf(res.recipe.id) !== -1);
  const found = RB.searchRecipes(all, "lasagna");
  assert.ok(found.some(r => r.id === res.recipe.id), "search finds new recipe");
  let plan = RB.assignToDay({}, 0, res.recipe.id);
  const list = RB.groceryList(plan, all, {});
  assert.ok(list.some(g => g.name === "ricotta"), "grocery list has ricotta");
  assert.strictEqual(RB.searchRecipes(all, "lasagna", "").filter(r => favs.indexOf(r.id) !== -1).length, 1);
});

// Flow 2: full week plan from starter bank -> grocery list is substantial and merged
flow("week plan -> merged grocery list", () => {
  const picks = ["spag-bolognese", "chicken-stirfry", "tacos", "pesto-pasta", "salmon-sheet", "veggie-curry", "roast-chicken"];
  let plan = {};
  picks.forEach((id, i) => { plan = RB.assignToDay(plan, i, id); });
  const list = RB.groceryList(plan, R, {});
  assert.ok(list.length > 20, "substantial list, got " + list.length);
  // garlic cloves appear in bolognese + stirfry + roast chicken -> merged
  const garlic = list.filter(g => g.name === "garlic cloves");
  assert.strictEqual(garlic.length, 1, "garlic merged, got " + garlic.length);
  assert.ok(garlic[0].qty >= 6, "garlic qty summed: " + garlic[0].qty);
  assert.ok(garlic[0].recipes.length >= 3, "garlic tracks source recipes");
});

// Flow 3: scaling a weeknight dinner for guests
flow("scale servings for guests", () => {
  const r = R.find(x => x.id === "tacos"); // serves 4
  const scaled = RB.scaleRecipe(r, 10);
  assert.strictEqual(scaled.servings, 10);
  const beef = scaled.ingredients.find(i => i.name === "ground beef");
  assert.strictEqual(beef.qty, 1250, "beef scaled 500g -> 1250g, got " + beef.qty);
  const plan = RB.assignToDay({}, 5, "tacos");
  const list = RB.groceryList(plan, R, { 5: 10 });
  const lb = list.find(g => g.name === "ground beef");
  assert.strictEqual(lb.qty, 1250, "week grocery respects per-day servings");
});

// Flow 4: quick vegetarian lunch hunt
flow("quick vegetarian lunch search", () => {
  const quick = RB.suggestRecipes(R, { maxTime: 20 });
  const vegQuick = quick.filter(r => r.tags.indexOf("vegetarian") !== -1);
  assert.ok(vegQuick.length >= 2, "at least 2 quick vegetarian options, got " + vegQuick.length);
  const q = RB.searchRecipes(R, "salad", "healthy");
  assert.ok(q.every(r => r.tags.indexOf("healthy") !== -1));
  assert.ok(q.length >= 1);
});

// Flow 5: plan changes mid-week — swap Wednesday, grocery list updates
flow("mid-week swap updates grocery list", () => {
  let plan = RB.assignToDay(RB.assignToDay({}, 2, "tacos"), 4, "chili");
  let list = RB.groceryList(plan, R, {});
  assert.ok(list.some(g => g.name === "taco shells"), "tacos in list");
  plan = RB.assignToDay(plan, 2, "pad-thai"); // swap Wednesday
  list = RB.groceryList(plan, R, {});
  assert.ok(!list.some(g => g.name === "taco shells"), "taco shells gone after swap");
  assert.ok(list.some(g => g.name === "rice noodles"), "pad thai noodles present");
});

// Flow 6: invalid recipe rejected with helpful errors, valid one passes
flow("validation catches bad recipes", () => {
  const bad = RB.addRecipe(R, { name: "  ", ingredients: [{ name: "", qty: 0, unit: "" }], steps: [" "], servings: 0, timeMin: 10 });
  assert.ok(bad.errors.length >= 3, "multiple errors, got: " + bad.errors.join(" | "));
  assert.ok(!bad.recipe, "no recipe on failure");
  const ok = RB.addRecipe(R, { name: "Toast", tags: [], timeMin: 5, servings: 1,
    ingredients: [{ name: "bread", qty: 2, unit: "slices" }], steps: ["Toast it."] });
  assert.strictEqual(ok.errors.length, 0);
  assert.ok(ok.recipe.id.indexOf("custom-") === 0);
});

console.log(passed + " e2e flows passed.");
