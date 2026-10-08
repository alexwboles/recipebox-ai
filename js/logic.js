// RecipeBox AI — pure logic layer (browser + node compatible).
(function () {
"use strict";

const R = (typeof require !== "undefined")
  ? require("./recipes.js")
  : window.RBRecipes;

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem("recipebox:" + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("recipebox:" + key, JSON.stringify(value)); } catch (e) {}
  }
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function allTags(recipes) {
  const s = {};
  (recipes || []).forEach(r => (r.tags || []).forEach(t => { s[t] = true; }));
  return Object.keys(s).sort();
}

function searchRecipes(recipes, query, tag) {
  const q = (query || "").trim().toLowerCase();
  return (recipes || []).filter(r => {
    if (tag && (r.tags || []).indexOf(tag) === -1) return false;
    if (!q) return true;
    const hay = (r.name + " " + (r.tags || []).join(" ") + " " +
      (r.ingredients || []).map(i => i.name).join(" ")).toLowerCase();
    return q.split(/\s+/).every(w => hay.indexOf(w) !== -1);
  });
}

function validateRecipe(data) {
  const errors = [];
  if (!data.name || !data.name.trim()) errors.push("Name is required.");
  if (!Array.isArray(data.ingredients) || !data.ingredients.length) errors.push("Add at least one ingredient.");
  else data.ingredients.forEach((ing, i) => {
    if (!ing.name || !ing.name.trim()) errors.push("Ingredient " + (i + 1) + " needs a name.");
    if (!(ing.qty > 0)) errors.push("Ingredient '" + (ing.name || i + 1) + "' needs a quantity.");
  });
  if (!Array.isArray(data.steps) || !data.steps.filter(s => s && s.trim()).length) errors.push("Add at least one step.");
  if (!(data.servings > 0)) errors.push("Servings must be at least 1.");
  if (!(data.timeMin >= 0)) errors.push("Time must be 0 or more.");
  return errors;
}

function buildRecipe(id, data) {
  return {
    id,
    name: data.name.trim(),
    tags: (data.tags || []).map(t => t.trim().toLowerCase()).filter(Boolean),
    timeMin: data.timeMin | 0,
    servings: data.servings | 0,
    ingredients: data.ingredients.map(i => ({ name: i.name.trim(), qty: Number(i.qty), unit: (i.unit || "").trim() })),
    steps: data.steps.map(s => s.trim()).filter(Boolean),
    custom: true
  };
}

function addRecipe(recipes, data) {
  const errors = validateRecipe(data);
  if (errors.length) return { errors };
  const id = "custom-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e4).toString(36);
  return { recipe: buildRecipe(id, data), errors: [] };
}

// Update a custom recipe in place (keeps id + custom flag). Pure: returns {custom, recipe, errors}.
function updateRecipe(custom, id, data) {
  const errors = validateRecipe(data);
  if (errors.length) return { errors };
  const list = (custom || []).slice();
  const i = list.findIndex(r => r.id === id);
  if (i === -1) return { errors: ["Recipe not found."] };
  const recipe = buildRecipe(id, data);
  list[i] = recipe;
  return { custom: list, recipe, errors: [] };
}

function deleteCustomRecipe(custom, id) {
  return (custom || []).filter(r => r.id !== id);
}

// Sort helpers for the recipe bank view. key: "name" | "time" | "servings".
function sortRecipes(recipes, key) {
  const arr = (recipes || []).slice();
  if (key === "time") arr.sort((a, b) => (a.timeMin - b.timeMin) || a.name.localeCompare(b.name));
  else if (key === "servings") arr.sort((a, b) => (a.servings - b.servings) || a.name.localeCompare(b.name));
  else arr.sort((a, b) => a.name.localeCompare(b.name));
  return arr;
}

// Plain-text version of the grocery list, for copy-to-clipboard / sharing.
function groceryListText(list) {
  return (list || []).map(g => {
    const qty = (g.qty != null && g.qty !== "") ? String(g.qty) + (g.unit ? " " + g.unit : "") : "";
    return "\u2022 " + g.name + (qty ? " — " + qty : "");
  }).join("\n");
}

function toggleFavorite(favs, id) {
  favs = favs || [];
  const i = favs.indexOf(id);
  if (i === -1) favs.push(id); else favs.splice(i, 1);
  return favs;
}

function assignToDay(plan, dayIdx, recipeId) {
  plan = plan || {};
  plan[dayIdx] = recipeId;
  return plan;
}

function removeFromDay(plan, dayIdx) {
  plan = plan || {};
  delete plan[dayIdx];
  return plan;
}

function scaleRecipe(recipe, servings) {
  const factor = servings / recipe.servings;
  return {
    name: recipe.name,
    servings,
    ingredients: recipe.ingredients.map(i => ({
      name: i.name,
      qty: Math.round(i.qty * factor * 100) / 100,
      unit: i.unit
    }))
  };
}

function groceryList(plan, recipes, servingsMap) {
  // aggregate ingredients across the week's assigned recipes; merge by name|unit
  const byId = {};
  (recipes || []).forEach(r => { byId[r.id] = r; });
  const merged = {};
  Object.keys(plan || {}).forEach(dayIdx => {
    const r = byId[plan[dayIdx]];
    if (!r) return;
    const servings = (servingsMap && servingsMap[dayIdx]) || r.servings;
    scaleRecipe(r, servings).ingredients.forEach(i => {
      const key = (i.name + "|" + i.unit).toLowerCase();
      if (!merged[key]) merged[key] = { name: i.name, unit: i.unit, qty: 0, recipes: [] };
      merged[key].qty = Math.round((merged[key].qty + i.qty) * 100) / 100;
      if (merged[key].recipes.indexOf(r.name) === -1) merged[key].recipes.push(r.name);
    });
  });
  return Object.keys(merged).sort().map(k => merged[k]);
}

function suggestRecipes(recipes, opts) {
  opts = opts || {};
  return (recipes || []).filter(r => {
    if (opts.tag && (r.tags || []).indexOf(opts.tag) === -1) return false;
    if (opts.maxTime != null && r.timeMin > opts.maxTime) return false;
    if (opts.excludeId && r.id === opts.excludeId) return false;
    return true;
  });
}

const api = { store, DAYS, allTags, searchRecipes, validateRecipe, addRecipe, updateRecipe,
              deleteCustomRecipe, sortRecipes,
              toggleFavorite, assignToDay, removeFromDay, scaleRecipe, groceryList, groceryListText, suggestRecipes };

if (typeof window !== "undefined") window.RecipeBox = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
