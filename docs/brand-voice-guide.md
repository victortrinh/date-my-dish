# Date My Dish: Brand Voice Guide

## Voice Definition

**"Confident home cook impressing a date. Flirty, romantic, never pretentious."**

We're the friend who cooks beautifully and tells great stories while doing it. Food is always the star; personality is the seasoning. The writing is sensual about food (the way a sauce clings, the sound of a sear, the warmth of a bowl in your hands) and romantic about the moment. Plain language always. If a sentence sounds like it belongs in a culinary textbook, rewrite it.

### Tone Spectrum

| Context | Tone Level | Example |
|---------|-----------|---------|
| Recipe prose (MDX body) | Flirty, romantic & confident | "This pasta doesn't need a reservation. It needs a candle." |
| Meta descriptions | Personality-infused, concise | "The slow-cooked ragu that says 'I've been thinking about you all day.'" |
| FAQ answers | Witty but helpful | "Can I skip the wine? Technically yes. Emotionally? That's between you and the dish." |
| Cooking instructions | Clear & authoritative | "Sear the beef on all sides until deeply browned, about 3 minutes per side." |
| Articles (technique/science) | Authoritative with personality | Warm intros/conclusions, factual body. Drop a quip in transitions. |
| Articles (lifestyle) | Full cheeky treatment | Story-driven, opinion-forward, conversational |

### What We Sound Like

- Flirty and romantic about the moment, sensual about the food
- Confident, not cocky
- Playful, not silly
- Plain language, never pretentious
- Opinionated about technique, generous about skill level
- PG-13: innuendo is fine, vulgarity is not

### What We Don't Sound Like

- Generic food blogger ("This recipe is SO good you guys!")
- Pretentious chef ("One must first consider the Maillard reaction...")
- Overly cutesy ("Yummy! This is totes adorbs!")
- Clickbait ("You WON'T BELIEVE what happens when you add butter")

---

## English Examples: Before & After

### Example 1: Recipe Prose Opening

**Before (generic):**
> Cacio e pepe is a classic Roman pasta dish. It uses just a few simple ingredients (pasta, Pecorino Romano, and black pepper) to create a creamy, flavorful sauce. This recipe is easy to make at home.

**After (cheeky & confident):**
> Three ingredients. No cream. No shortcuts. Cacio e pepe is the dish that proves you don't need a stocked pantry to cook something extraordinary; you just need the nerve to trust simplicity. This is the pasta that whispers "I know exactly what I'm doing" without raising its voice.

### Example 2: Meta Description

**Before:**
> A delicious beef ragu recipe with pappardelle pasta. Slow-cooked for tender, flavorful results.

**After:**
> The slow-cooked beef ragu that says "I've been thinking about you all day." Tender, rich, and worth every minute of the wait.

### Example 3: FAQ Answer

**Before:**
> Q: Can I use a different type of pasta?
> A: Yes, you can substitute pappardelle with tagliatelle or fettuccine. Any wide, flat pasta works well with this sauce.

**After:**
> Q: Can I use a different type of pasta?
> A: Wide and flat is the move: tagliatelle, fettuccine, or even mafaldine all catch the ragu beautifully. Spaghetti? It'll taste fine, but you'll lose the sauce-to-noodle magic. Go wide or go home.

---

## Quebec French Examples: Before & After

### Conventions
- Quebec French register: informal but not slangy
- "souper" not "dîner" for dinner, "déjeuner" not "petit-déjeuner" for breakfast
- "cuillère à soupe" not "cuillère à table"
- Natural Quebec expressions welcome (but avoid heavy joual)

### Example 1: Recipe Prose Opening

**Before (generic):**
> Le cacio e pepe est un plat de pâtes romain classique. Il utilise seulement quelques ingrédients simples (des pâtes, du Pecorino Romano et du poivre noir) pour créer une sauce crémeuse et savoureuse.

**After (cheeky & confident):**
> Trois ingrédients. Pas de crème. Pas de raccourcis. Le cacio e pepe, c'est la preuve qu'on n'a pas besoin d'un garde-manger bien garni pour cuisiner quelque chose d'extraordinaire; juste le culot de faire confiance à la simplicité. C'est le plat qui murmure « je sais exactement ce que je fais » sans jamais lever le ton.

### Example 2: Meta Description

**Before:**
> Une délicieuse recette de ragu de bœuf avec des pappardelle. Mijoté longuement pour un résultat tendre et savoureux.

**After:**
> Le ragù de bœuf mijoté qui dit « j'ai pensé à toi toute la journée ». Tendre, riche, et chaque minute d'attente en vaut la peine.

### Example 3: FAQ Answer

**Before:**
> Q: Puis-je utiliser un autre type de pâtes?
> A: Oui, vous pouvez remplacer les pappardelle par des tagliatelles ou des fettuccine. Toute pâte large et plate fonctionne bien avec cette sauce.

**After:**
> Q: Puis-je utiliser un autre type de pâtes?
> A: Large et plate, c'est la clé : tagliatelles, fettuccine, même des mafaldine, tout ça attrape le ragù à merveille. Des spaghettis? Le goût sera correct, mais tu vas perdre la magie sauce-pâte. Go wide or go home.

---

## Boundaries

### DO Apply Voice To
- MDX prose body (the blog post)
- `description` field (meta description, max 160 chars)
- FAQ `answer` fields
- `heroImageAlt` if too generic (make it vivid, not witty)
- Date night tips copy

### DO NOT Apply Voice To
- Cooking instructions (`instructionGroups.steps[].text`): keep these clear, precise, authoritative
- Ingredient lists: factual only
- Nutrition data: factual only
- `title` field: do NOT change recipe/article titles (URL stability)
- `slug`: never change
- Schema/JSON-LD data
- Navigation, UI labels, error messages

### Article Tone Calibration

| Article Type | Voice Level | Approach |
|-------------|-------------|----------|
| Technique (e.g., wok hei, velveting) | Authoritative + personality | Factual body, witty intro/conclusion, one quip per section |
| Food Science (e.g., MSG) | Informative + warmth | "Let's settle this once and for all" energy |
| Lifestyle (e.g., steak date night) | Full cheeky | Story-driven, opinion-forward, conversational throughout |
| Guides (e.g., pantry essentials) | Helpful + personality | Practical advice with attitude |

---

## Refresh Checklist (Per Content Piece)

- [ ] Rewrite MDX prose body with cheeky voice
- [ ] Refresh `description`: max 160 chars, personality-infused
- [ ] Refresh FAQ `answer` fields: witty but helpful
- [ ] Review `heroImageAlt`: make vivid if too generic
- [ ] Set `updatedDate` to refresh date
- [ ] Do NOT change `title` or `slug`
- [ ] Verify cooking instructions remain clear and authoritative
- [ ] Run `/seo-audit` after refresh
