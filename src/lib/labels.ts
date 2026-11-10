/**
 * Display labels and colours shared by server and client components.
 * Kept out of "use client" files: server components cannot read values
 * exported from a client module.
 */

export const EXERCISE_TYPES: Record<string, { label: string; color: string; sticker: string }> = {
  strength: { label: "Strength", color: "orange", sticker: "dumbbell" },
  core: { label: "Core", color: "yellow", sticker: "bolt" },
  cardio: { label: "Cardio", color: "pink", sticker: "sneaker" },
  mobility: { label: "Mobility", color: "lilac", sticker: "lotus" },
  balance: { label: "Balance", color: "mint", sticker: "leaf" },
};

export const LEVEL_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const VERDICT: Record<string, { label: string; tone: string; sticker: string }> = {
  false: { label: "False", tone: "pink", sticker: "cross" },
  misleading: { label: "Misleading", tone: "yellow", sticker: "magnifier" },
  "partly-true": { label: "Partly true", tone: "blue", sticker: "sparkle" },
  true: { label: "True", tone: "lime", sticker: "check" },
};

export const FOOD_GROUPS: Record<string, { label: string; color: string; sticker: string }> = {
  vegetables: { label: "Vegetables", color: "green", sticker: "broccoli" },
  fruits: { label: "Fruit", color: "pink", sticker: "apple" },
  grains: { label: "Grains", color: "sand", sticker: "bread" },
  legumes: { label: "Beans and lentils", color: "tan", sticker: "bowl" },
  "nuts-seeds": { label: "Nuts and seeds", color: "peach", sticker: "leaf" },
  "meat-poultry": { label: "Meat and poultry", color: "orange", sticker: "flame" },
  "fish-seafood": { label: "Fish and seafood", color: "sky", sticker: "fish" },
  "dairy-eggs": { label: "Dairy and eggs", color: "yellow", sticker: "egg" },
  "plant-proteins": { label: "Plant proteins", color: "lime", sticker: "avocado" },
  "oils-fats": { label: "Oils and fats", color: "mint", sticker: "drop" },
  "snacks-sweets": { label: "Snacks and sweets", color: "rose", sticker: "donut" },
  drinks: { label: "Drinks", color: "blue", sticker: "coffee" },
};

export const SEARCH_TYPE_LABEL: Record<string, string> = {
  article: "Article",
  condition: "Condition",
  tool: "Tool",
  topic: "Topic",
  term: "Glossary",
  myth: "Myth or fact",
  food: "Food",
  exercise: "Exercise",
};
