// RecipeBox AI — UI wiring. Depends on js/recipes.js + js/logic.js.
(function () {
"use strict";
const RB = window.RecipeBox;
const BANK = window.RBRecipes.RECIPES;
const store = RB.store;

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

function allRecipes() { return BANK.concat(store.get("custom", [])); }
function favs() { return store.get("favs", []); }

function switchTab(name) {
  document.querySelectorAll("nav.tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tabpage").forEach(p => p.style.display = p.id === "tab-" + name ? "" : "none");
  if (name === "recipes") renderRecipes();
  if (name === "week") renderWeek();
  if (name === "grocery") renderGrocery();
}

// ---------- recipes tab ----------
let q = "", tagFilter = "", favOnly = false;
function renderRecipes() {
  const recipes = allRecipes();
  const tags = RB.allTags(recipes);
  const list = RB.searchRecipes(recipes, q, tagFilter).filter(r => !favOnly || favs().indexOf(r.id) !== -1);
  let html = '<div class="card"><h2>Recipes (' + list.length + ')</h2><div class="toolbar">';
  html += '<input type="text" id="rb-q" placeholder="Search recipes, ingredients…" value="' + esc(q) + '">';
  html += '<select id="rb-tag"><option value="">All tags</option>' + tags.map(t =>
    '<option value="' + esc(t) + '"' + (tagFilter === t ? " selected" : "") + '>' + esc(t) + '</option>').join("") + '</select>';
  html += '<button class="btn ghost small" id="rb-favonly" style="align-self:center">' + (favOnly ? "★ Favorites" : "☆ Favorites") + '</button></div>';
  html += '<div class="rgrid">';
  list.forEach(r => {
    html += '<div class="rcard" data-view="' + esc(r.id) + '"><h3>' + (favs().indexOf(r.id) !== -1 ? '<span class="fav">★</span> ' : "") + esc(r.name) + '</h3>' +
      '<div class="meta">⏱ ' + r.timeMin + ' min · serves ' + r.servings + '</div>' +
      '<div>' + (r.tags || []).map(t => '<span class="tag">' + esc(t) + '</span>').join("") + '</div></div>';
  });
  html += '</div></div>';
  el("tab-recipes").innerHTML = html;
  el("rb-q").oninput = ev => { q = ev.target.value; renderRecipes(); const nq = el("rb-q"); nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); };
  el("rb-tag").onchange = ev => { tagFilter = ev.target.value; renderRecipes(); };
  el("rb-favonly").onclick = () => { favOnly = !favOnly; renderRecipes(); };
  document.querySelectorAll("[data-view]").forEach(c => { c.onclick = () => renderDetail(c.getAttribute("data-view")); });
}

function renderDetail(id) {
  const r = allRecipes().find(x => x.id === id);
  if (!r) { renderRecipes(); return; }
  const isFav = favs().indexOf(id) !== -1;
  let html = '<div class="card detail"><button class="btn ghost small" id="rb-back">← All recipes</button> ';
  html += '<button class="btn ghost small" id="rb-fav">' + (isFav ? "★ Unfavorite" : "☆ Favorite") + '</button>';
  html += '<h2 style="margin-top:12px;">' + esc(r.name) + '</h2>';
  html += '<div class="meta hint">⏱ ' + r.timeMin + ' min · serves ' + r.servings + '</div>';
  html += '<div>' + (r.tags || []).map(t => '<span class="tag">' + esc(t) + '</span>').join("") + '</div>';
  html += '<h3>Ingredients</h3><table class="ing">' + r.ingredients.map(i =>
    '<tr><td>' + esc(i.name) + '</td><td style="text-align:right">' + esc(i.qty) + ' ' + esc(i.unit) + '</td></tr>').join("") + '</table>';
  html += '<h3>Steps</h3><ol>' + r.steps.map(s => '<li>' + esc(s) + '</li>').join("") + '</ol>';
  html += '<label>Add to week plan</label><select id="rb-day">' + RB.DAYS.map((d, i) => '<option value="' + i + '">' + d + '</option>').join("") + '</select>';
  html += '<button class="btn" id="rb-addweek">Add to week</button></div>';
  el("tab-recipes").innerHTML = html;
  el("rb-back").onclick = renderRecipes;
  el("rb-fav").onclick = () => { store.set("favs", RB.toggleFavorite(favs(), id)); renderDetail(id); };
  el("rb-addweek").onclick = () => {
    const plan = RB.assignToDay(store.get("plan", {}), parseInt(el("rb-day").value, 10), id);
    store.set("plan", plan);
    el("rb-addweek").textContent = "Added ✓";
  };
}

// ---------- add tab ----------
function renderAdd() {
  let html = '<div class="card"><h2>Add a recipe</h2><div id="rb-err"></div>';
  html += '<label>Name</label><input type="text" id="ra-name">';
  html += '<label>Tags (comma-separated)</label><input type="text" id="ra-tags" placeholder="dinner, quick, vegetarian">';
  html += '<label>Time (minutes)</label><input type="number" id="ra-time" value="30" min="0">';
  html += '<label>Servings</label><input type="number" id="ra-serv" value="4" min="1">';
  html += '<label>Ingredients</label><div id="ra-ings"></div><button class="btn ghost small" id="ra-adding">+ ingredient</button>';
  html += '<label>Steps (one per line)</label><textarea id="ra-steps"></textarea>';
  html += '<br><button class="btn" id="ra-save">Save recipe</button></div>';
  el("tab-add").innerHTML = html;
  const addRow = (n, qt, u) => {
    const div = document.createElement("div");
    div.className = "ingrow";
    div.innerHTML = '<input type="text" placeholder="ingredient" value="' + esc(n || "") + '">' +
      '<input type="number" placeholder="qty" min="0" step="any" value="' + esc(qt || "") + '">' +
      '<input type="text" placeholder="unit" value="' + esc(u || "") + '">';
    el("ra-ings").appendChild(div);
  };
  addRow(); addRow(); addRow();
  el("ra-adding").onclick = () => addRow();
  el("ra-save").onclick = () => {
    const ings = Array.prototype.slice.call(document.querySelectorAll("#ra-ings .ingrow")).map(row => {
      const ins = row.querySelectorAll("input");
      return { name: ins[0].value, qty: parseFloat(ins[1].value), unit: ins[2].value };
    }).filter(i => i.name.trim());
    const res = RB.addRecipe(allRecipes(), {
      name: el("ra-name").value,
      tags: el("ra-tags").value.split(","),
      timeMin: parseFloat(el("ra-time").value),
      servings: parseFloat(el("ra-serv").value),
      ingredients: ings,
      steps: el("ra-steps").value.split("\n")
    });
    if (res.errors.length) { el("rb-err").innerHTML = '<p class="err">' + res.errors.map(esc).join("<br>") + '</p>'; return; }
    const custom = store.get("custom", []);
    custom.push(res.recipe);
    store.set("custom", custom);
    el("tab-add").innerHTML = '<div class="card"><h2>Saved ✓</h2><p class="hint">"' + esc(res.recipe.name) + '" is now in your box.</p></div>';
  };
}

// ---------- week tab ----------
function renderWeek() {
  const recipes = allRecipes();
  const byId = {};
  recipes.forEach(r => { byId[r.id] = r; });
  const plan = store.get("plan", {});
  const servingsMap = store.get("servings", {});
  let html = '<div class="card"><h2>Week plan</h2><p class="hint">Assign a recipe to each day — the grocery list builds itself.</p><div class="weekplan">';
  RB.DAYS.forEach((d, i) => {
    const r = byId[plan[i]];
    html += '<div class="wday"><h4>' + d + '</h4>';
    if (r) {
      html += '<div class="rname">' + esc(r.name) + '</div><div class="hint">serves <input type="number" min="1" value="' + (servingsMap[i] || r.servings) +
        '" data-serv="' + i + '" style="width:52px;padding:2px 4px;font-size:12px;"></div>' +
        '<button class="btn ghost small" data-unassign="' + i + '">Remove</button>';
    } else {
      html += '<select data-assign="' + i + '"><option value="">— pick —</option>' +
        recipes.map(x => '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>').join("") + '</select>';
    }
    html += '</div>';
  });
  html += '</div></div>';
  el("tab-week").innerHTML = html;
  document.querySelectorAll("[data-assign]").forEach(s => {
    s.onchange = () => {
      if (!s.value) return;
      store.set("plan", RB.assignToDay(store.get("plan", {}), parseInt(s.getAttribute("data-assign"), 10), s.value));
      renderWeek();
    };
  });
  document.querySelectorAll("[data-unassign]").forEach(b => {
    b.onclick = () => {
      const i = parseInt(b.getAttribute("data-unassign"), 10);
      store.set("plan", RB.removeFromDay(store.get("plan", {}), i));
      renderWeek();
    };
  });
  document.querySelectorAll("[data-serv]").forEach(inp => {
    inp.onchange = () => {
      const m = store.get("servings", {});
      m[inp.getAttribute("data-serv")] = parseFloat(inp.value) || 1;
      store.set("servings", m);
    };
  });
}

// ---------- grocery tab ----------
function renderGrocery() {
  const list = RB.groceryList(store.get("plan", {}), allRecipes(), store.get("servings", {}));
  const checked = store.get("gchecked", {});
  let html = '<div class="card"><h2>Grocery list (' + list.length + ' items)</h2>';
  if (!list.length) html += '<p class="hint">Plan some meals on the Week tab first.</p>';
  else {
    html += '<table class="ing">';
    list.forEach((g, i) => {
      const key = (g.name + "|" + g.unit).toLowerCase();
      html += '<tr><td><label style="margin:0;display:flex;gap:8px;align-items:center;cursor:pointer;">' +
        '<input type="checkbox" data-g="' + i + '"' + (checked[key] ? " checked" : "") + '> ' +
        '<span style="' + (checked[key] ? "text-decoration:line-through;color:#999" : "") + '">' + esc(g.name) + '</span></label>' +
        '<div class="hint">for: ' + g.recipes.map(esc).join(", ") + '</div></td>' +
        '<td style="text-align:right;white-space:nowrap">' + esc(g.qty) + ' ' + esc(g.unit) + '</td></tr>';
    });
    html += '</table><button class="btn ghost" id="g-print">Print list</button>';
  }
  html += '</div>';
  el("tab-grocery").innerHTML = html;
  document.querySelectorAll("[data-g]").forEach(cb => {
    cb.onchange = () => {
      const g = list[parseInt(cb.getAttribute("data-g"), 10)];
      const c = store.get("gchecked", {});
      const key = (g.name + "|" + g.unit).toLowerCase();
      if (cb.checked) c[key] = true; else delete c[key];
      store.set("gchecked", c);
      renderGrocery();
    };
  });
  const pr = el("g-print");
  if (pr) pr.onclick = () => window.print();
}

document.addEventListener("DOMContentLoaded", () => {
  renderAdd();
  renderRecipes();
  document.querySelectorAll("nav.tabs button").forEach(b => { b.onclick = () => switchTab(b.dataset.tab); });
});
})();
