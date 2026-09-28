# RecipeBox AI 🍳

Your recipes, organized. Keep every recipe in one searchable box: add your own with ingredients, steps, time, and servings, tag and favorite them, then drag the week together on the planner — the grocery list builds itself, merging duplicate ingredients and scaling to your servings.

**100% local.** No account, no API keys, no network calls. Your recipes, week plan, and grocery checks live in your browser's localStorage.

## Run it

Just open `index.html` in any browser. Or serve it:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Features

- **20 starter recipes** — dinners, lunches, breakfasts, desserts across Italian, Mexican, Asian, and healthy tags
- **Add your own** — ingredients with quantities/units, steps, time, servings, tags; validated on save
- **Search + tag filters + favorites** — find anything by name, ingredient, or tag
- **Week planner** — assign recipes to days, adjust servings per day
- **Auto grocery list** — aggregates the week's ingredients, merges duplicates (2 recipes needing garlic → one line), scales to your servings, check items off as you shop, printable
- **Smart suggestions** — filter the bank by max cook time ("dinner in 20 minutes")

## Tests

```bash
bash test/smoke.sh   # fast sanity checks
bash test/e2e.sh     # realistic user flows
```

## Optional AI upgrade

Set `OPENAI_API_KEY` and a future version could generate recipes from "what's in my fridge" or convert recipes between diets. The built-in bank and planner work great without it — the key is never required.

## License

MIT
