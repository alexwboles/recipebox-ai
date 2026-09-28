// RecipeBox AI — starter recipe bank (browser + node compatible).
(function () {
"use strict";

const RECIPES = [
  { id: "spag-bolognese", name: "Spaghetti Bolognese", tags: ["dinner", "italian", "family"], timeMin: 40, servings: 4,
    ingredients: [
      { name: "spaghetti", qty: 400, unit: "g" }, { name: "ground beef", qty: 500, unit: "g" },
      { name: "crushed tomatoes", qty: 800, unit: "g" }, { name: "onion", qty: 1, unit: "pc" },
      { name: "garlic cloves", qty: 2, unit: "pc" }, { name: "olive oil", qty: 2, unit: "tbsp" }],
    steps: ["Brown the beef in olive oil, breaking it up.", "Add onion and garlic; cook 5 min.", "Stir in tomatoes; simmer 25 min.", "Cook spaghetti; serve sauce over pasta."] },
  { id: "chicken-stirfry", name: "Chicken Stir-Fry", tags: ["dinner", "quick", "asian"], timeMin: 25, servings: 4,
    ingredients: [
      { name: "chicken breast", qty: 600, unit: "g" }, { name: "mixed vegetables", qty: 500, unit: "g" },
      { name: "soy sauce", qty: 3, unit: "tbsp" }, { name: "rice", qty: 300, unit: "g" },
      { name: "vegetable oil", qty: 2, unit: "tbsp" }, { name: "garlic cloves", qty: 2, unit: "pc" }],
    steps: ["Cook rice.", "Sear chicken in hot oil until golden.", "Add vegetables and garlic; stir-fry 5 min.", "Add soy sauce; serve over rice."] },
  { id: "veggie-curry", name: "Chickpea Coconut Curry", tags: ["dinner", "vegetarian", "vegan", "quick"], timeMin: 30, servings: 4,
    ingredients: [
      { name: "chickpeas", qty: 800, unit: "g" }, { name: "coconut milk", qty: 400, unit: "ml" },
      { name: "curry powder", qty: 2, unit: "tbsp" }, { name: "onion", qty: 1, unit: "pc" },
      { name: "rice", qty: 300, unit: "g" }, { name: "spinach", qty: 150, unit: "g" }],
    steps: ["Sauté onion until soft.", "Add curry powder; toast 1 min.", "Add chickpeas and coconut milk; simmer 15 min.", "Wilt in spinach; serve over rice."] },
  { id: "tacos", name: "Beef Tacos", tags: ["dinner", "mexican", "family", "quick"], timeMin: 25, servings: 4,
    ingredients: [
      { name: "ground beef", qty: 500, unit: "g" }, { name: "taco shells", qty: 12, unit: "pc" },
      { name: "taco seasoning", qty: 1, unit: "packet" }, { name: "lettuce", qty: 1, unit: "head" },
      { name: "tomatoes", qty: 2, unit: "pc" }, { name: "shredded cheese", qty: 150, unit: "g" }],
    steps: ["Brown beef; stir in seasoning and water; simmer.", "Warm taco shells.", "Chop lettuce and tomatoes.", "Assemble tacos and serve."] },
  { id: "salmon-sheet", name: "Sheet-Pan Salmon & Veggies", tags: ["dinner", "healthy", "quick"], timeMin: 30, servings: 4,
    ingredients: [
      { name: "salmon fillets", qty: 4, unit: "pc" }, { name: "broccoli", qty: 400, unit: "g" },
      { name: "baby potatoes", qty: 600, unit: "g" }, { name: "olive oil", qty: 3, unit: "tbsp" },
      { name: "lemon", qty: 1, unit: "pc" }],
    steps: ["Heat oven to 200°C.", "Toss potatoes and broccoli in oil; roast 15 min.", "Add salmon; roast 12 min more.", "Squeeze lemon over everything."] },
  { id: "pancakes", name: "Fluffy Pancakes", tags: ["breakfast", "family"], timeMin: 20, servings: 4,
    ingredients: [
      { name: "flour", qty: 250, unit: "g" }, { name: "milk", qty: 300, unit: "ml" },
      { name: "eggs", qty: 2, unit: "pc" }, { name: "sugar", qty: 2, unit: "tbsp" },
      { name: "baking powder", qty: 2, unit: "tsp" }, { name: "butter", qty: 30, unit: "g" }],
    steps: ["Whisk dry ingredients.", "Whisk in milk, eggs, melted butter.", "Cook ladles of batter 2 min per side.", "Serve with syrup or fruit."] },
  { id: "overnight-oats", name: "Overnight Oats", tags: ["breakfast", "healthy", "quick", "vegetarian"], timeMin: 10, servings: 2,
    ingredients: [
      { name: "rolled oats", qty: 100, unit: "g" }, { name: "milk", qty: 240, unit: "ml" },
      { name: "yogurt", qty: 120, unit: "g" }, { name: "honey", qty: 2, unit: "tbsp" },
      { name: "berries", qty: 100, unit: "g" }],
    steps: ["Mix oats, milk, yogurt, honey in jars.", "Refrigerate overnight.", "Top with berries in the morning."] },
  { id: "caesar-salad", name: "Chicken Caesar Salad", tags: ["lunch", "healthy", "quick"], timeMin: 20, servings: 2,
    ingredients: [
      { name: "chicken breast", qty: 300, unit: "g" }, { name: "romaine lettuce", qty: 1, unit: "head" },
      { name: "caesar dressing", qty: 60, unit: "ml" }, { name: "parmesan", qty: 40, unit: "g" },
      { name: "croutons", qty: 50, unit: "g" }],
    steps: ["Grill chicken; slice.", "Chop romaine.", "Toss with dressing, parmesan, croutons.", "Top with chicken."] },
  { id: "tomato-soup", name: "Creamy Tomato Soup", tags: ["lunch", "dinner", "vegetarian"], timeMin: 35, servings: 4,
    ingredients: [
      { name: "crushed tomatoes", qty: 1600, unit: "g" }, { name: "onion", qty: 1, unit: "pc" },
      { name: "vegetable broth", qty: 500, unit: "ml" }, { name: "cream", qty: 120, unit: "ml" },
      { name: "garlic cloves", qty: 3, unit: "pc" }, { name: "butter", qty: 30, unit: "g" }],
    steps: ["Sauté onion and garlic in butter.", "Add tomatoes and broth; simmer 20 min.", "Blend smooth.", "Stir in cream; season."] },
  { id: "fried-rice", name: "Egg Fried Rice", tags: ["dinner", "quick", "asian", "vegetarian"], timeMin: 20, servings: 4,
    ingredients: [
      { name: "cooked rice", qty: 600, unit: "g" }, { name: "eggs", qty: 4, unit: "pc" },
      { name: "frozen peas", qty: 150, unit: "g" }, { name: "soy sauce", qty: 3, unit: "tbsp" },
      { name: "spring onions", qty: 4, unit: "pc" }, { name: "vegetable oil", qty: 2, unit: "tbsp" }],
    steps: ["Scramble eggs; set aside.", "Fry rice in hot oil until toasty.", "Add peas, soy sauce, eggs.", "Top with spring onions."] },
  { id: "chili", name: "Slow Beef Chili", tags: ["dinner", "mexican", "family"], timeMin: 90, servings: 6,
    ingredients: [
      { name: "ground beef", qty: 750, unit: "g" }, { name: "kidney beans", qty: 800, unit: "g" },
      { name: "crushed tomatoes", qty: 800, unit: "g" }, { name: "onion", qty: 1, unit: "pc" },
      { name: "chili powder", qty: 2, unit: "tbsp" }, { name: "rice", qty: 300, unit: "g" }],
    steps: ["Brown beef with onion.", "Add beans, tomatoes, chili powder.", "Simmer 60+ min.", "Serve over rice."] },
  { id: "pesto-pasta", name: "Basil Pesto Pasta", tags: ["dinner", "italian", "quick", "vegetarian"], timeMin: 20, servings: 4,
    ingredients: [
      { name: "pasta", qty: 400, unit: "g" }, { name: "basil pesto", qty: 120, unit: "g" },
      { name: "parmesan", qty: 50, unit: "g" }, { name: "cherry tomatoes", qty: 250, unit: "g" },
      { name: "olive oil", qty: 1, unit: "tbsp" }],
    steps: ["Cook pasta; reserve a cup of water.", "Halve tomatoes; warm in oil.", "Toss pasta with pesto, loosened with pasta water.", "Top with parmesan."] },
  { id: "greek-salad", name: "Greek Salad", tags: ["lunch", "healthy", "vegetarian", "quick"], timeMin: 15, servings: 4,
    ingredients: [
      { name: "cucumber", qty: 1, unit: "pc" }, { name: "tomatoes", qty: 4, unit: "pc" },
      { name: "feta cheese", qty: 200, unit: "g" }, { name: "olives", qty: 100, unit: "g" },
      { name: "red onion", qty: 0.5, unit: "pc" }, { name: "olive oil", qty: 3, unit: "tbsp" }],
    steps: ["Chop vegetables.", "Combine with olives and feta.", "Dress with olive oil; season."] },
  { id: "banana-bread", name: "Banana Bread", tags: ["dessert", "baking", "vegetarian"], timeMin: 70, servings: 8,
    ingredients: [
      { name: "ripe bananas", qty: 3, unit: "pc" }, { name: "flour", qty: 250, unit: "g" },
      { name: "sugar", qty: 150, unit: "g" }, { name: "eggs", qty: 2, unit: "pc" },
      { name: "butter", qty: 115, unit: "g" }, { name: "baking soda", qty: 1, unit: "tsp" }],
    steps: ["Heat oven to 175°C.", "Mash bananas; mix with melted butter, sugar, eggs.", "Fold in flour and baking soda.", "Bake 55–60 min."] },
  { id: "choc-chip-cookies", name: "Chocolate Chip Cookies", tags: ["dessert", "baking", "family"], timeMin: 35, servings: 12,
    ingredients: [
      { name: "flour", qty: 280, unit: "g" }, { name: "butter", qty: 170, unit: "g" },
      { name: "brown sugar", qty: 150, unit: "g" }, { name: "sugar", qty: 100, unit: "g" },
      { name: "eggs", qty: 1, unit: "pc" }, { name: "chocolate chips", qty: 200, unit: "g" }],
    steps: ["Cream butter and sugars.", "Beat in egg; fold in flour.", "Stir in chocolate chips.", "Bake at 180°C for 11–12 min."] },
  { id: "lentil-soup", name: "Red Lentil Soup", tags: ["dinner", "healthy", "vegan", "vegetarian"], timeMin: 40, servings: 4,
    ingredients: [
      { name: "red lentils", qty: 300, unit: "g" }, { name: "carrots", qty: 2, unit: "pc" },
      { name: "onion", qty: 1, unit: "pc" }, { name: "vegetable broth", qty: 1, unit: "l" },
      { name: "cumin", qty: 1, unit: "tsp" }, { name: "olive oil", qty: 2, unit: "tbsp" }],
    steps: ["Sauté onion and carrots in oil.", "Add lentils, broth, cumin.", "Simmer 25 min until soft.", "Blend half for creaminess."] },
  { id: "quesadilla", name: "Cheese Quesadillas", tags: ["lunch", "quick", "mexican", "vegetarian", "family"], timeMin: 15, servings: 4,
    ingredients: [
      { name: "flour tortillas", qty: 8, unit: "pc" }, { name: "shredded cheese", qty: 300, unit: "g" },
      { name: "bell pepper", qty: 1, unit: "pc" }, { name: "salsa", qty: 120, unit: "ml" }],
    steps: ["Fill tortillas with cheese and pepper.", "Cook in a dry pan 2–3 min per side.", "Cut into wedges; serve with salsa."] },
  { id: "roast-chicken", name: "Roast Chicken & Potatoes", tags: ["dinner", "family"], timeMin: 80, servings: 4,
    ingredients: [
      { name: "whole chicken", qty: 1.6, unit: "kg" }, { name: "baby potatoes", qty: 800, unit: "g" },
      { name: "carrots", qty: 4, unit: "pc" }, { name: "olive oil", qty: 3, unit: "tbsp" },
      { name: "garlic cloves", qty: 4, unit: "pc" }, { name: "rosemary", qty: 2, unit: "sprigs" }],
    steps: ["Heat oven to 200°C.", "Rub chicken with oil, garlic, rosemary; season.", "Roast with vegetables 70 min.", "Rest 10 min before carving."] },
  { id: "smoothie-bowl", name: "Berry Smoothie Bowl", tags: ["breakfast", "healthy", "quick", "vegetarian"], timeMin: 10, servings: 1,
    ingredients: [
      { name: "frozen berries", qty: 150, unit: "g" }, { name: "banana", qty: 1, unit: "pc" },
      { name: "yogurt", qty: 150, unit: "g" }, { name: "granola", qty: 40, unit: "g" },
      { name: "honey", qty: 1, unit: "tbsp" }],
    steps: ["Blend berries, banana, yogurt until thick.", "Pour into a bowl.", "Top with granola and honey."] },
  { id: "pad-thai", name: "Shrimp Pad Thai", tags: ["dinner", "asian"], timeMin: 35, servings: 4,
    ingredients: [
      { name: "rice noodles", qty: 400, unit: "g" }, { name: "shrimp", qty: 400, unit: "g" },
      { name: "eggs", qty: 2, unit: "pc" }, { name: "bean sprouts", qty: 200, unit: "g" },
      { name: "peanuts", qty: 60, unit: "g" }, { name: "pad thai sauce", qty: 120, unit: "ml" }],
    steps: ["Soak noodles per package.", "Sear shrimp; set aside.", "Scramble eggs; add noodles, sauce, sprouts.", "Toss with shrimp; top with peanuts."] }
];

const api = { RECIPES };
if (typeof window !== "undefined") window.RBRecipes = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
