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

// Flow 7: custom recipe lifecycle — add, edit, delete
flow("custom recipe edit + delete lifecycle", () => {
  const made = RB.addRecipe(R, { name: "Weeknight Chili", tags: ["dinner"], timeMin: 30, servings: 4,
    ingredients: [{ name: "beans", qty: 400, unit: "g" }], steps: ["Heat.", "Serve."] });
  assert.strictEqual(made.errors.length, 0);
  const upd = RB.updateRecipe([made.recipe], made.recipe.id, { name: "Weeknight Chili", tags: ["dinner", "spicy"], timeMin: 35, servings: 6,
    ingredients: [{ name: "beans", qty: 600, unit: "g" }, { name: "chili powder", qty: 2, unit: "tsp" }], steps: ["Heat.", "Serve."] });
  assert.strictEqual(upd.errors.length, 0, upd.errors.join(","));
  assert.strictEqual(upd.recipe.servings, 6);
  assert.ok(upd.recipe.tags.indexOf("spicy") !== -1);
  const gone = RB.deleteCustomRecipe(upd.custom, made.recipe.id);
  assert.strictEqual(gone.length, 0, "deleted recipe is gone");
  assert.strictEqual(RB.deleteCustomRecipe(gone, "nope").length, 0, "deleting unknown id is a no-op");
});

// Flow 8: sort + detail-view scaler math
flow("sort orders and scaler math", () => {
  const byTime = RB.sortRecipes(R, "time");
  assert.ok(byTime[0].timeMin <= byTime[byTime.length - 1].timeMin, "fastest first");
  const byName = RB.sortRecipes(R, "name");
  assert.ok(byName[0].name.localeCompare(byName[1].name) <= 0, "A-Z order");
  // scaler: halving servings halves quantities (what the − / + stepper shows)
  const r = R.find(x => x.id === "pancakes"); // serves 4
  const half = RB.scaleRecipe(r, 2);
  const flour = half.ingredients.find(i => i.name === "flour");
  assert.strictEqual(flour.qty, 125, "flour halved 250g -> 125g, got " + flour.qty);
});

// Flow 9: grocery list copy text from a real week plan
flow("grocery list copy text", () => {
  let plan = RB.assignToDay(RB.assignToDay({}, 0, "tacos"), 1, "pesto-pasta");
  const list = RB.groceryList(plan, R, {});
  const text = RB.groceryListText(list);
  assert.ok(text.length > 0, "copy text non-empty");
  assert.strictEqual(text.split("\n").length, list.length, "one line per item");
  assert.ok(list.every(g => text.indexOf(g.name) !== -1), "every item appears in copy text");
});

// Flow 10: ratings — set/clear, sort by rating, top-rated filter
flow("recipe ratings + top-rated sort", () => {
  let ratings = RB.setRating({}, "tacos", 5);
  ratings = RB.setRating(ratings, "pancakes", 3);
  ratings = RB.setRating(ratings, "quesadilla", 4);
  assert.strictEqual(RB.getRating(ratings, "tacos"), 5, "get rating");
  assert.strictEqual(RB.getRating(ratings, "unknown"), 0, "unrated -> 0");
  // invalid stars clear instead of storing garbage
  ratings = RB.setRating(ratings, "tacos", 9);
  assert.strictEqual(RB.getRating(ratings, "tacos"), 0, "9 stars should clear");
  ratings = RB.setRating(ratings, "tacos", 5);
  // rating sort: 5, 4, 3 first; unrated after
  const sorted = RB.sortRecipes(R, "rating", ratings);
  const order = sorted.map(r => RB.getRating(ratings, r.id));
  const firstRated = order.findIndex(s => s > 0);
  const lastRated = order.map((s, i) => s > 0 ? i : -1).filter(i => i >= 0).pop();
  assert.ok(firstRated === 0, "rated recipes lead");
  assert.ok(order.slice(0, lastRated + 1).every((s, i, a) => i === 0 || a[i - 1] >= s), "rated desc");
  assert.strictEqual(sorted[0].id, "tacos", "5-star first");
  // topRated(>=4)
  const top = RB.topRated(R, ratings);
  assert.strictEqual(top.length, 2, "tacos + quesadilla rated >= 4, got " + top.length);
  assert.ok(top.every(r => RB.getRating(ratings, r.id) >= 4), "all >= 4");
  // backward compat: sort without ratings still works
  assert.ok(RB.sortRecipes(R, "rating").length === R.length, "rating sort without ratings map");
});

// Flow 11: "have it" pantry exclusion shrinks the shoppable list
flow("pantry have-it exclusion", () => {
  let plan = RB.assignToDay(RB.assignToDay({}, 0, "tacos"), 1, "pesto-pasta");
  const list = RB.groceryList(plan, R, {});
  assert.ok(list.length > 3, "list should be substantial");
  const key = (list[0].name + "|" + list[0].unit).toLowerCase();
  const have = {};
  have[key] = true;
  const shop = RB.filterHave(list, have);
  assert.strictEqual(shop.length, list.length - 1, "one item excluded");
  assert.ok(!shop.some(g => (g.name + "|" + g.unit).toLowerCase() === key), "owned item gone");
  assert.strictEqual(RB.haveCount(list, have), 1, "haveCount");
  // copy text excludes owned items
  const text = RB.groceryListText(shop);
  assert.ok(text.indexOf(list[0].name) === -1, "owned item not in copy text");
  // no have-set -> unchanged copy
  assert.deepStrictEqual(RB.filterHave(list, null), list, "null have-set keeps all");
});


// Flow 12: cook-with-what's-here ranks recipes by owned-ingredient coverage
flow("cook with what's here", () => {
  const matches = RB.matchByPantry(R, ["ground beef", "taco shells", "lettuce", "tomatoes"]);
  const tacos = matches.find(m => m.recipe.id === "tacos");
  assert.ok(tacos, "tacos matched");
  assert.strictEqual(tacos.coverage, 67, "4 of 6 ingredients = 67%, got " + tacos.coverage);
  assert.ok(tacos.missingNames.includes("taco seasoning"), "missing seasoning listed");
  // best match first
  assert.strictEqual(matches[0].recipe.id, "tacos", "tacos ranks first");
});

// Flow 13: grocery list groups into store aisles in stable order
flow("grocery list aisle grouping", () => {
  const plan = RB.assignToDay(RB.assignToDay({}, 0, "tacos"), 1, "pesto-pasta");
  const list = RB.groceryList(plan, R, {});
  const groups = RB.groupByAisle(list);
  assert.ok(groups.length >= 3, "several aisles, got " + groups.length);
  const names = groups.map(g => g.aisle);
  assert.ok(names.includes("Produce") && names.includes("Meat & Seafood"), "produce + meat present");
  assert.strictEqual(names.indexOf("Produce") < names.indexOf("Meat & Seafood"), true, "produce before meat");
  const flat = groups.reduce((a, g) => a + g.items.length, 0);
  assert.strictEqual(flat, list.length, "every item grouped exactly once");
  const txt = RB.groceryListTextGrouped(groups);
  assert.ok(/PRODUCE/.test(txt) && /MEAT & SEAFOOD/.test(txt), "grouped copy text has aisle headers");
});

// Flow 14: week template save -> reload -> delete round trip
flow("week template round trip", () => {
  let weeks = [];
  const plan = RB.assignToDay(RB.assignToDay({}, 0, "tacos"), 5, "pesto-pasta");
  const r = RB.addWeekTemplate(weeks, "Rotation A", plan, { 0: 4 });
  weeks = r.weeks;
  assert.strictEqual(weeks.length, 1, "one template saved");
  // reload: plan + servings restore exactly
  const loaded = weeks[0];
  assert.deepStrictEqual(loaded.plan, { 0: "tacos", 5: "pesto-pasta" }, "plan restored");
  assert.deepStrictEqual(loaded.servings, { 0: 4 }, "servings restored");
  const list = RB.groceryList(loaded.plan, R, loaded.servings);
  assert.ok(list.length > 0, "reloaded plan builds a grocery list");
  weeks = RB.removeWeekTemplate(weeks, loaded.id);
  assert.strictEqual(weeks.length, 0, "template deleted");
});

flow("serving scaler math (detail + print path)", () => {
  const R = require("../js/logic.js");
  const recipe = { servings: 4, ingredients: [{ name: "flour", qty: 200, unit: "g" }, { name: "eggs", qty: 2, unit: "" }] };
  const s2 = R.scaleRecipe(recipe, 2);
  assert.strictEqual(s2.ingredients[0].qty, 100, "flour halved");
  assert.strictEqual(s2.ingredients[1].qty, 1, "eggs halved");
  const s6 = R.scaleRecipe(recipe, 6);
  assert.strictEqual(s6.ingredients[0].qty, 300, "flour 1.5x");
});

console.log(passed + " e2e flows passed.");
