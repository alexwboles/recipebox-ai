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

// ---------- cook-with-what's-here ----------
function renderPantryMatch() {
  const pantry = store.get("pantry", "");
  return '<div class="card pantry-card"><h2>Cook with what\'s here</h2>' +
    '<p class="hint">Type ingredients you already have (comma-separated) — we rank every recipe by how much of it you own.</p>' +
    '<div class="pantry-row"><input type="text" id="rb-pantry" placeholder="e.g. chicken, rice, garlic, eggs" value="' + esc(pantry) + '" aria-label="Ingredients you have">' +
    '<button class="btn ghost small" id="rb-pantry-go">Find recipes</button></div>' +
    '<div id="rb-pantry-out"></div></div>';
}
function wirePantry() {
  const go = el("rb-pantry-go");
  if (!go) return;
  const run = () => {
    const raw = el("rb-pantry").value;
    store.set("pantry", raw);
    const owned = raw.split(",").map(s => s.trim()).filter(Boolean);
    const matches = RB.matchByPantry(allRecipes(), owned);
    const out = el("rb-pantry-out");
    if (!owned.length) { out.innerHTML = '<p class="hint">Enter some ingredients first.</p>'; return; }
    out.innerHTML = matches.length
      ? '<p class="hint">' + matches.length + ' recipe(s) use something you have:</p>' + matches.slice(0, 12).map(m =>
          '<div class="pmatch"><div><strong>' + esc(m.recipe.name) + '</strong>' +
          '<div class="hint">' + (m.missing ? m.missing + ' to buy: ' + m.missingNames.slice(0, 4).map(esc).join(", ") + (m.missingNames.length > 4 ? "…" : "") : "you have everything") + '</div></div>' +
          '<div class="pcov"><div class="bar"><div style="width:' + m.coverage + '%"></div></div><span>' + m.coverage + '%</span></div>' +
          '<button class="btn ghost small" data-pview="' + esc(m.recipe.id) + '">View</button></div>').join("")
      : '<p class="hint">Nothing matches — try different ingredients.</p>';
    out.querySelectorAll("[data-pview]").forEach(b => { b.onclick = () => renderDetail(b.getAttribute("data-pview")); });
  };
  go.onclick = run;
  el("rb-pantry").addEventListener("keydown", ev => { if (ev.key === "Enter") run(); });
  if (el("rb-pantry").value.trim()) run();
}

// ---------- recipes tab ----------
let q = "", tagFilter = "", favOnly = false, topOnly = false, sortKey = "name";
function starStr(n) { return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }
function renderRecipes() {
  const recipes = allRecipes();
  const tags = RB.allTags(recipes);
  const ratings = store.get("ratings", {});
  const list = RB.sortRecipes(
    RB.searchRecipes(recipes, q, tagFilter)
      .filter(r => !favOnly || favs().indexOf(r.id) !== -1)
      .filter(r => !topOnly || RB.getRating(ratings, r.id) >= 4),
    sortKey, ratings);
  let html = '<div class="card"><h2>Recipes (' + list.length + ')</h2><div class="toolbar">';
  html += '<input type="text" id="rb-q" placeholder="Search recipes, ingredients…" value="' + esc(q) + '">';
  html += '<select id="rb-tag"><option value="">All tags</option>' + tags.map(t =>
    '<option value="' + esc(t) + '"' + (tagFilter === t ? " selected" : "") + '>' + esc(t) + '</option>').join("") + '</select>';
  html += '<select id="rb-sort" aria-label="Sort recipes">' +
    [["name", "Sort: Name"], ["time", "Sort: Fastest"], ["servings", "Sort: Servings"], ["rating", "Sort: Top rated"]].map(o =>
      '<option value="' + o[0] + '"' + (sortKey === o[0] ? " selected" : "") + '>' + o[1] + '</option>').join("") + '</select>';
  html += '<button class="btn ghost small" id="rb-favonly" style="align-self:center">' + (favOnly ? "★ Favorites" : "☆ Favorites") + '</button>';
  html += '<button class="btn ghost small" id="rb-toponly" style="align-self:center">' + (topOnly ? "★ Top rated" : "☆ Top rated") + '</button></div>';
  html += '<div class="rgrid">';
  list.forEach(r => {
    const st = RB.getRating(ratings, r.id);
    html += '<div class="rcard" data-view="' + esc(r.id) + '"><h3>' + (favs().indexOf(r.id) !== -1 ? '<span class="fav">★</span> ' : "") + esc(r.name) + '</h3>' +
      '<div class="meta">' + r.timeMin + ' min · serves ' + r.servings +
      (st ? ' · <span class="stars" title="Your rating: ' + st + '/5">' + starStr(st) + '</span>' : '') + '</div>' +
      '<div>' + (r.tags || []).map(t => '<span class="tag">' + esc(t) + '</span>').join("") + '</div></div>';
  });
  html += '</div></div>';
  html += renderPantryMatch();
  el("tab-recipes").innerHTML = html;
  el("rb-q").oninput = ev => { q = ev.target.value; renderRecipes(); const nq = el("rb-q"); nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); };
  el("rb-tag").onchange = ev => { tagFilter = ev.target.value; renderRecipes(); };
  el("rb-sort").onchange = ev => { sortKey = ev.target.value; renderRecipes(); };
  el("rb-favonly").onclick = () => { favOnly = !favOnly; renderRecipes(); };
  el("rb-toponly").onclick = () => { topOnly = !topOnly; renderRecipes(); };
  wirePantry();
  document.querySelectorAll("[data-view]").forEach(c => { c.onclick = () => renderDetail(c.getAttribute("data-view")); });
}

function renderDetail(id) {
  const r = allRecipes().find(x => x.id === id);
  if (!r) { renderRecipes(); return; }
  const isFav = favs().indexOf(id) !== -1;
  let viewServ = r.servings;
  let html = '<div class="card detail"><button class="btn ghost small" id="rb-back">← All recipes</button> ';
  html += '<button class="btn ghost small" id="rb-fav">' + (isFav ? "★ Unfavorite" : "☆ Favorite") + '</button>';
  html += '<button class="btn ghost small" id="rb-cook">Cook mode</button>';
  html += ' <button class="btn ghost small" id="rb-print">Print recipe</button>';
  if (r.custom) {
    html += ' <button class="btn ghost small" id="rb-edit">Edit</button>';
    html += ' <button class="btn ghost small" id="rb-del">Delete</button>';
  }
  const myStars = RB.getRating(store.get("ratings", {}), id);
  html += '<span class="rate-widget" role="group" aria-label="Rate this recipe">' +
    [1, 2, 3, 4, 5].map(s =>
      '<button class="star' + (s <= myStars ? " on" : "") + '" data-star="' + s + '" aria-label="' + s + ' star' + (s > 1 ? "s" : "") + '">★</button>'
    ).join("") +
    (myStars ? '<button class="btn ghost small" id="rb-unrate">Clear</button>' : '') + '</span>';
  html += '<h2 style="margin-top:12px;">' + esc(r.name) + '</h2>';
  html += '<div class="meta hint">' + r.timeMin + ' min · serves ' +
    '<button class="btn ghost small stepper" id="rb-dec" aria-label="Fewer servings">−</button> ' +
    '<strong id="rb-serv">' + viewServ + '</strong> ' +
    '<button class="btn ghost small stepper" id="rb-inc" aria-label="More servings">+</button></div>';
  html += '<div>' + (r.tags || []).map(t => '<span class="tag">' + esc(t) + '</span>').join("") + '</div>';
  html += '<div class="detail-cols"><div><h3>Ingredients</h3><p class="ing-hint">Tap an ingredient to check it off as you cook.</p><table class="ing" id="rb-ings"></table></div>';
  html += '<div><h3>Steps</h3><ol>' + r.steps.map(s => '<li>' + esc(s) + '</li>').join("") + '</ol></div></div>';
  html += '<div class="addrow"><div><label>Add to week plan</label><select id="rb-day">' + RB.DAYS.map((d, i) => '<option value="' + i + '">' + d + '</option>').join("") + '</select></div>';
  html += '<button class="btn" id="rb-addweek">Add to week</button></div></div>';
  el("tab-recipes").innerHTML = html;
  el("rb-back").onclick = renderRecipes;
  el("rb-fav").onclick = () => { store.set("favs", RB.toggleFavorite(favs(), id)); renderDetail(id); };
  el("rb-cook").onclick = () => openCookMode(r);
  el("rb-print").onclick = () => printRecipe(r, viewServ);
  document.querySelectorAll(".rate-widget [data-star]").forEach(b => {
    b.onclick = () => { store.set("ratings", RB.setRating(store.get("ratings", {}), id, parseInt(b.dataset.star, 10))); renderDetail(id); };
  });
  const unrate = el("rb-unrate");
  if (unrate) unrate.onclick = () => { store.set("ratings", RB.setRating(store.get("ratings", {}), id, 0)); renderDetail(id); };
  const checkedIngs = new Set();
  const drawIngs = () => {
    const scaled = RB.scaleRecipe(r, viewServ);
    el("rb-ings").innerHTML = scaled.ingredients.map((i, idx) =>
      '<tr data-ing="' + idx + '"' + (checkedIngs.has(idx) ? ' class="checked"' : "") + '><td>' + esc(i.name) + '</td><td>' + esc(String(i.qty)) + ' ' + esc(i.unit) + '</td></tr>').join("");
    el("rb-serv").textContent = viewServ;
  };
  drawIngs();
  el("rb-ings").addEventListener("click", ev => {
    const tr = ev.target.closest("tr[data-ing]");
    if (!tr) return;
    const idx = parseInt(tr.getAttribute("data-ing"), 10);
    if (checkedIngs.has(idx)) checkedIngs.delete(idx); else checkedIngs.add(idx);
    tr.classList.toggle("checked");
  });
  el("rb-dec").onclick = () => { if (viewServ > 1) { viewServ--; drawIngs(); } };
  el("rb-inc").onclick = () => { viewServ++; drawIngs(); };
  const ed = el("rb-edit"), del = el("rb-del");
  if (ed) ed.onclick = () => { switchTab("add"); renderAdd(r); };
  if (del) del.onclick = () => {
    if (!confirm('Delete "' + r.name + '"?')) return;
    store.set("custom", RB.deleteCustomRecipe(store.get("custom", []), id));
    const plan = store.get("plan", {});
    Object.keys(plan).forEach(d => { if (plan[d] === id) delete plan[d]; });
    store.set("plan", plan);
    store.set("favs", favs().filter(f => f !== id));
    renderRecipes();
  };
  el("rb-addweek").onclick = () => {
    const plan = RB.assignToDay(store.get("plan", {}), parseInt(el("rb-day").value, 10), id);
    store.set("plan", plan);
    el("rb-addweek").textContent = "Added";
  };
}

// ---------- add tab ----------
let editingId = null;
function renderAdd(existing) {
  editingId = existing ? existing.id : null;
  let html = '<div class="card"><h2>' + (existing ? "Edit recipe" : "Add a recipe") + '</h2><div id="rb-err"></div>';
  html += '<label>Name</label><input type="text" id="ra-name" value="' + esc(existing ? existing.name : "") + '">';
  html += '<label>Tags (comma-separated)</label><input type="text" id="ra-tags" placeholder="dinner, quick, vegetarian" value="' +
    esc(existing ? (existing.tags || []).join(", ") : "") + '">';
  html += '<label>Time (minutes)</label><input type="number" id="ra-time" value="' + (existing ? existing.timeMin : 30) + '" min="0">';
  html += '<label>Servings</label><input type="number" id="ra-serv" value="' + (existing ? existing.servings : 4) + '" min="1">';
  html += '<label>Ingredients</label><div id="ra-ings"></div><button class="btn ghost small" id="ra-adding">+ ingredient</button>';
  html += '<label>Steps (one per line)</label><textarea id="ra-steps">' + esc(existing ? (existing.steps || []).join("\n") : "") + '</textarea>';
  html += '<br><button class="btn" id="ra-save">' + (existing ? "Save changes" : "Save recipe") + '</button>';
  if (existing) html += ' <button class="btn ghost" id="ra-cancel">Cancel</button>';
  html += '</div>';
  el("tab-add").innerHTML = html;
  const addRow = (n, qt, u) => {
    const div = document.createElement("div");
    div.className = "ingrow";
    div.innerHTML = '<input type="text" placeholder="ingredient" value="' + esc(n || "") + '">' +
      '<input type="number" placeholder="qty" min="0" step="any" value="' + esc(qt == null ? "" : String(qt)) + '">' +
      '<input type="text" placeholder="unit" value="' + esc(u || "") + '">';
    el("ra-ings").appendChild(div);
  };
  if (existing && existing.ingredients.length) existing.ingredients.forEach(i => addRow(i.name, i.qty, i.unit));
  else { addRow(); addRow(); addRow(); }
  el("ra-adding").onclick = () => addRow();
  const cancelBtn = el("ra-cancel");
  if (cancelBtn) cancelBtn.onclick = () => { editingId = null; renderAdd(); };
  el("ra-save").onclick = () => {
    const ings = Array.prototype.slice.call(document.querySelectorAll("#ra-ings .ingrow")).map(row => {
      const ins = row.querySelectorAll("input");
      return { name: ins[0].value, qty: parseFloat(ins[1].value), unit: ins[2].value };
    }).filter(i => i.name.trim());
    const data = {
      name: el("ra-name").value,
      tags: el("ra-tags").value.split(","),
      timeMin: parseFloat(el("ra-time").value),
      servings: parseFloat(el("ra-serv").value),
      ingredients: ings,
      steps: el("ra-steps").value.split("\n")
    };
    if (editingId) {
      const res = RB.updateRecipe(store.get("custom", []), editingId, data);
      if (res.errors.length) { el("rb-err").innerHTML = '<p class="err">' + res.errors.map(esc).join("<br>") + '</p>'; return; }
      store.set("custom", res.custom);
      editingId = null;
      el("tab-add").innerHTML = '<div class="card"><h2>Updated</h2><p class="hint">"' + esc(res.recipe.name) + '" was updated.</p></div>';
      return;
    }
    const res = RB.addRecipe(allRecipes(), data);
    if (res.errors.length) { el("rb-err").innerHTML = '<p class="err">' + res.errors.map(esc).join("<br>") + '</p>'; return; }
    const custom = store.get("custom", []);
    custom.push(res.recipe);
    store.set("custom", custom);
    el("tab-add").innerHTML = '<div class="card"><h2>Saved</h2><p class="hint">"' + esc(res.recipe.name) + '" is now in your box.</p></div>';
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
        '" data-serv="' + i + '"></div>' +
        '<button class="btn ghost small" data-unassign="' + i + '">Remove</button>';
    } else {
      html += '<select data-assign="' + i + '"><option value="">— pick —</option>' +
        recipes.map(x => '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>').join("") + '</select>';
    }
    html += '</div>';
  });
  html += '</div></div>';
  // week-plan templates
  const weeks = store.get("weeks", []);
  html += '<div class="card weektpl"><h2>Saved weeks</h2>' +
    '<p class="hint">Save this week as a template and reload it any time — handy for rotating menus.</p>' +
    '<div class="pantry-row"><input type="text" id="rb-weekname" placeholder="Template name, e.g. Easy dinners" maxlength="60" aria-label="Template name">' +
    '<button class="btn ghost small" id="rb-weeksave">Save this week</button></div>' +
    (weeks.length ? weeks.slice().reverse().map(w =>
      '<div class="pmatch"><div><strong>' + esc(w.name) + '</strong>' +
      '<div class="hint">' + Object.keys(w.plan || {}).length + ' day(s) planned · saved ' + esc(String(w.savedAt || "").slice(0, 10)) + '</div></div>' +
      '<div><button class="btn ghost small" data-wload="' + esc(w.id) + '">Load</button> ' +
      '<button class="btn ghost small danger" data-wdel="' + esc(w.id) + '">Delete</button></div></div>').join("")
      : '<p class="hint">No saved weeks yet.</p>') + '</div>';
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
  const wsave = el("rb-weeksave");
  if (wsave) wsave.onclick = () => {
    const name = el("rb-weekname").value;
    const res = RB.addWeekTemplate(store.get("weeks", []), name, store.get("plan", {}), store.get("servings", {}));
    store.set("weeks", res.weeks);
    renderWeek();
  };
  document.querySelectorAll("[data-wload]").forEach(b => {
    b.onclick = () => {
      const w = store.get("weeks", []).filter(x => x.id === b.getAttribute("data-wload"))[0];
      if (!w) return;
      store.set("plan", Object.assign({}, w.plan));
      store.set("servings", Object.assign({}, w.servings));
      renderWeek();
    };
  });
  document.querySelectorAll("[data-wdel]").forEach(b => {
    b.onclick = () => {
      store.set("weeks", RB.removeWeekTemplate(store.get("weeks", []), b.getAttribute("data-wdel")));
      renderWeek();
    };
  });
}

// ---------- cook mode ----------
// Full-screen step-by-step cooking view with a built-in countdown timer.
let cook = null; // {recipe, idx, timer:{total,left,running,iv}}
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    o.start();
    o.stop(ctx.currentTime + 0.7);
    setTimeout(() => ctx.close(), 900);
  } catch (e) { /* audio unavailable */ }
}
function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}
function printRecipe(r, viewServ) {
  const scaled = RB.scaleRecipe(r, viewServ);
  let sheet = el("recipePrint");
  if (!sheet) { sheet = document.createElement("div"); sheet.id = "recipePrint"; document.body.appendChild(sheet); }
  sheet.innerHTML = '<h1>' + esc(r.name) + '</h1>' +
    '<p class="rp-meta">' + r.timeMin + ' min · serves ' + viewServ + '</p>' +
    '<div class="rp-cols"><div><h2>Ingredients</h2><ul>' +
    scaled.ingredients.map(i => '<li>' + esc(i.name) + ' — ' + esc(String(i.qty)) + ' ' + esc(i.unit) + '</li>').join("") +
    '</ul></div><div><h2>Steps</h2><ol>' + r.steps.map(x => '<li>' + esc(x) + '</li>').join("") + '</ol></div></div>' +
    '<p class="rp-foot">Printed from RecipeBox AI</p>';
  document.body.classList.add("printing-recipe");
  window.print();
  setTimeout(() => document.body.classList.remove("printing-recipe"), 500);
}

function openCookMode(recipe) {
  cook = { recipe, idx: 0, timer: { total: 0, left: 0, running: false, iv: null } };
  el("cookMode").style.display = "";
  renderCook();
}
function closeCookMode() {
  if (cook && cook.timer.iv) clearInterval(cook.timer.iv);
  cook = null;
  el("cookMode").style.display = "none";
}
function renderCook() {
  if (!cook) return;
  const r = cook.recipe, n = r.steps.length, i = cook.idx;
  const t = cook.timer;
  el("cookMode").innerHTML =
    '<div class="cook-inner"><button class="btn ghost" id="cookExit">✕ Exit cook mode</button>' +
    '<h2>' + esc(r.name) + '</h2>' +
    '<p class="cook-progress">Step ' + (i + 1) + ' of ' + n + '</p>' +
    '<div class="cook-bar"><div style="width:' + Math.round((i + 1) / n * 100) + '%"></div></div>' +
    '<p class="cook-step">' + esc(r.steps[i]) + '</p>' +
    '<div class="cook-nav">' +
    '<button class="btn ghost" id="cookPrev"' + (i === 0 ? " disabled" : "") + '>← Prev</button>' +
    (i === n - 1
      ? '<button class="btn" id="cookDone">Done — enjoy!</button>'
      : '<button class="btn" id="cookNext">Next →</button>') +
    '</div>' +
    '<div class="cook-timer"><h3>Timer</h3>' +
    '<div class="cook-clock" id="cookClock">' + fmtClock(t.left) + '</div>' +
    '<div class="cook-nav">' +
    '<input type="number" id="cookMins" min="1" max="240" value="10" style="width:70px" aria-label="Minutes"> ' +
    '<button class="btn ghost small" id="cookSet">Set</button> ' +
    '<button class="btn ghost small" id="cookToggle">' + (t.running ? "Pause" : "Start") + '</button> ' +
    '<button class="btn ghost small" id="cookReset">Reset</button>' +
    '</div></div></div>';
  el("cookExit").onclick = closeCookMode;
  const prev = el("cookPrev"), next = el("cookNext"), done = el("cookDone");
  if (prev) prev.onclick = () => { if (cook.idx > 0) { cook.idx--; renderCook(); } };
  if (next) next.onclick = () => { if (cook.idx < n - 1) { cook.idx++; renderCook(); } };
  if (done) done.onclick = closeCookMode;
  el("cookSet").onclick = () => {
    const mins = Math.max(1, Math.min(240, parseInt(el("cookMins").value, 10) || 0));
    stopTimerTick();
    cook.timer.total = cook.timer.left = mins * 60;
    cook.timer.running = false;
    renderCook();
  };
  el("cookToggle").onclick = () => {
    if (cook.timer.running) { stopTimerTick(); cook.timer.running = false; renderCook(); return; }
    if (cook.timer.left <= 0) return;
    cook.timer.running = true;
    cook.timer.iv = setInterval(() => {
      cook.timer.left--;
      const c = el("cookClock");
      if (c) c.textContent = fmtClock(cook.timer.left);
      if (cook.timer.left <= 0) {
        stopTimerTick();
        cook.timer.running = false;
        beep();
        renderCook();
      }
    }, 1000);
    renderCook();
  };
  el("cookReset").onclick = () => {
    stopTimerTick();
    cook.timer.left = cook.timer.total;
    cook.timer.running = false;
    renderCook();
  };
}
function stopTimerTick() { if (cook && cook.timer.iv) { clearInterval(cook.timer.iv); cook.timer.iv = null; } }
document.addEventListener("keydown", (e) => {
  if (!cook || el("cookMode").style.display === "none") return;
  if (e.key === "ArrowRight" && cook.idx < cook.recipe.steps.length - 1) { cook.idx++; renderCook(); }
  else if (e.key === "ArrowLeft" && cook.idx > 0) { cook.idx--; renderCook(); }
  else if (e.key === "Escape") closeCookMode();
});

// ---------- grocery tab ----------
let groupAisles = false;
function groceryRow(g, i, checked, have) {
  const key = (g.name + "|" + g.unit).toLowerCase();
  const done = !!checked[key];
  const owned = !!have[key];
  return '<div class="grow' + (done ? ' done' : '') + (owned ? ' owned' : '') + '">' +
    '<label class="grow-main"><input type="checkbox" data-g="' + i + '"' + (done ? " checked" : "") + (owned ? " disabled" : "") + '> ' +
    '<span class="gname">' + esc(g.name) + '<span class="gfor">for: ' + g.recipes.map(esc).join(", ") + '</span></span>' +
    '<span class="gqty">' + esc(g.qty) + ' ' + esc(g.unit) + '</span></label>' +
    '<button class="btn ghost small" data-have="' + i + '">' + (owned ? "Need it" : "Have it") + '</button></div>';
}
function renderGrocery() {
  const list = RB.groceryList(store.get("plan", {}), allRecipes(), store.get("servings", {}));
  const checked = store.get("gchecked", {});
  const have = store.get("ghave", {});
  const haveN = RB.haveCount(list, have);
  const shopList = RB.filterHave(list, have);
  let html = '<div class="card"><h2>Grocery list (' + shopList.length + ' to buy' + (haveN ? ', ' + haveN + ' already owned' : '') + ')</h2>';
  if (!list.length) html += '<p class="hint">Plan some meals on the Week tab first — the list will build itself here.</p>';
  else {
    html += '<p class="hint">Tick off items as you shop. Mark staples you already own with "Have it" — they drop out of the list you print or copy.</p>' +
      '<label class="aisle-toggle"><input type="checkbox" id="g-aisles"' + (groupAisles ? " checked" : "") + '> Group by store aisle</label><div class="glist">';
    if (groupAisles) {
      RB.groupByAisle(list).forEach(grp => {
        html += '<h3 class="aisle-head">' + esc(grp.aisle) + '</h3>';
        grp.items.forEach(g => { html += groceryRow(g, list.indexOf(g), checked, have); });
      });
    } else {
      list.forEach((g, i) => { html += groceryRow(g, i, checked, have); });
    }
    html += '</div><button class="btn ghost" id="g-print">Print list</button> <button class="btn ghost" id="g-copy">Copy list</button>';
  }
  html += '</div>';
  el("tab-grocery").innerHTML = html;
  const at = el("g-aisles");
  if (at) at.onchange = () => { groupAisles = at.checked; renderGrocery(); };
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
  document.querySelectorAll("[data-have]").forEach(b => {
    b.onclick = () => {
      const g = list[parseInt(b.getAttribute("data-have"), 10)];
      const h = store.get("ghave", {});
      const key = (g.name + "|" + g.unit).toLowerCase();
      if (h[key]) delete h[key]; else h[key] = true;
      store.set("ghave", h);
      renderGrocery();
    };
  });
  const pr = el("g-print");
  if (pr) pr.onclick = () => window.print();
  const cp = el("g-copy");
  if (cp) cp.onclick = () => {
    const shop = RB.filterHave(list, store.get("ghave", {}));
    const text = groupAisles ? RB.groceryListTextGrouped(RB.groupByAisle(shop)) : RB.groceryListText(shop);
    const done = () => { cp.textContent = "Copied!"; setTimeout(() => { cp.textContent = "Copy list"; }, 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else done();
  };
}

document.addEventListener("DOMContentLoaded", () => {
  renderAdd();
  renderRecipes();
  document.querySelectorAll("nav.tabs button").forEach(b => { b.onclick = () => switchTab(b.dataset.tab); });
});
})();
