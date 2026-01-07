# Typography System - UpNext

This document defines the global typography hierarchy and capitalization rules for UpNext. All typography decisions are centralized in Tailwind config, ensuring consistency and easy maintenance.

## Table of Contents

1. [Principles](#principles)
2. [Text Types](#text-types)
3. [Tailwind Tokens](#tailwind-tokens)
4. [Components](#components)
5. [Usage Guidelines](#usage-guidelines)
6. [Examples](#examples)

---

## Principles

### 1. Capitalization Rules

**Uppercase is for categorization, not emphasis.**

- Uppercase is used to **categorize** content (section labels, UI badges, states)
- Uppercase is **never** used to emphasize main messages
- The main message never "shouts"

### 2. Hierarchy Construction

Visual hierarchy is built with:

- **Size** - Different font sizes create clear levels
- **Weight** - Font weight adds emphasis without shouting
- **Spacing** (tracking) - Letter spacing helps categorize (uppercase labels)
- **Color** - Color contrast supports hierarchy
- **Position** - Layout and spacing reinforce importance

### 3. Consistency and Reusability

- All typography decisions must be **consistent**
- All typography tokens must be **reusable**
- All typography rules must be **documented**
- Changes must be made from a **single point** (Tailwind config)

---

## Text Types

### A. Section Overline / Label

**Purpose:** Label sections, introduce blocks, contextualize without stealing focus.

**Rules:**
- Always in **UPPERCASE**
- Short text (1–3 words)
- Optional, not mandatory
- Uses `text-overline` or `text-label` with `uppercase` class

**Examples:**
- `EL PROBLEMA`
- `CÓMO FUNCIONA`
- `DIFERENCIAS`
- `FAQ`

**Tailwind Classes:**
```vue
<span class="text-overline uppercase tracking-overline font-label">
  EL PROBLEMA
</span>
```

### B. Hero Title (H1 - Landing Only)

**Purpose:** Main message of the landing page hero section.

**Rules:**
- **Sentence case** (first letter capitalized, rest lowercase)
- **Never** full uppercase
- **Maximum visual hierarchy** - Must dominate the page
- **ONLY used in the Hero section** - No other section should use this size
- Uses `text-hero` with `font-heading`
- Responsive sizing using `clamp()` for optimal scaling

**Examples:**
- `¿No sabes qué ver ahora?`
- `Descubre tu próxima serie favorita`

**Tailwind Classes:**
```vue
<h1 class="text-hero font-heading font-bold">
  ¿No sabes qué ver ahora?
</h1>
```

### B.1. Heading 1 (H1 - Non-Hero)

**Purpose:** Main message of non-hero pages or sections.

**Rules:**
- **Sentence case** (first letter capitalized, rest lowercase)
- **Never** full uppercase
- Clear hierarchy, but less than Hero
- Uses `text-h1` with `font-heading`

**Examples:**
- `Mi lista de favoritos`
- `Configuración de preferencias`

**Tailwind Classes:**
```vue
<h1 class="text-h1 font-heading font-semibold">
  Mi lista de favoritos
</h1>
```

### C. Heading 2 (H2)

**Purpose:** Section titles.

**Rules:**
- **Sentence case**
- Clear hierarchy, but less than H1
- Uses `text-h2` with `font-heading`

**Examples:**
- `Elegir qué ver se ha vuelto agotador`
- `Cómo funciona UpNext`

**Tailwind Classes:**
```vue
<h2 class="text-h2 font-heading font-semibold">
  Elegir qué ver se ha vuelto agotador
</h2>
```

### D. Supporting / Subtitle

**Purpose:** Explain the title, add context.

**Rules:**
- **Sentence case**
- Normal weight (400)
- Secondary color
- Uses `text-subtitle` with `font-body`
- Size: 1.25rem (20px) - Increased for better readability

**Examples:**
- `UpNext te ayuda a encontrar contenido perfecto para cada momento`
- `Basado en tus preferencias y el estado de ánimo actual`

**Tailwind Classes:**
```vue
<p class="text-subtitle font-body text-gray-600 dark:text-gray-400">
  UpNext te ayuda a encontrar contenido perfecto para cada momento
</p>
```

### E. Body Text

**Purpose:** Paragraphs, bullets, descriptions.

**Rules:**
- **Sentence case**
- **Never** uppercase
- Comfortable reading
- Uses `text-body` with `font-body`

**Examples:**
- `Pasar horas navegando sin encontrar nada que realmente te interese.`
- `Recomendaciones personalizadas basadas en tu estado de ánimo.`

**Tailwind Classes:**
```vue
<p class="text-body font-body text-gray-800 dark:text-gray-300">
  Pasar horas navegando sin encontrar nada que realmente te interese.
</p>
```

### F. UI Labels / Badges

**Purpose:** UI labels, states, categories, product mockups.

**Rules:**
- **UPPERCASE**
- Small size
- Medium weight (500)
- Uses `text-label` with `uppercase` and `tracking-overline`

**Examples:**
- `ATENCIÓN BAJA`
- `ATENCIÓN MEDIA`
- `RECOMENDACIÓN`
- `PARA TI`

**Tailwind Classes:**
```vue
<span class="text-label uppercase tracking-overline font-label">
  ATENCIÓN BAJA
</span>
```

### G. CTA / Buttons

**Purpose:** Primary and secondary actions.

**Rules:**
- **Sentence case**
- **Never** full uppercase
- Uses `text-body` or `text-subtitle` with `font-body`

**Examples:**
- `Descubrir qué ver ahora`
- `Saber cómo funciona`

**Tailwind Classes:**
```vue
<button class="text-body font-body">
  Descubrir qué ver ahora
</button>
```

---

## Tailwind Tokens

All typography tokens are defined in `tailwind.config.js`:

### Font Families

```javascript
fontFamily: {
  heading: ['Satoshi', 'Inter', ...], // For H1, H2, H3
  body: ['Inter', ...],              // For body, subtitle, labels
}
```

### Font Sizes (Semantic)

```javascript
fontSize: {
  'hero': ['clamp(2.75rem, 5vw, 4rem)', { lineHeight: '1.1', letterSpacing: '-0.03em' }], // Responsive: 44px-64px - HERO ONLY
  'h1': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],      // 36px - Page titles (non-hero)
  'h2': ['1.75rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],    // 28px - Section titles
  'h3': ['1.5rem', { lineHeight: '1.3', letterSpacing: '0' }],            // 24px - Subsection titles
  'subtitle': ['1.25rem', { lineHeight: '1.5', letterSpacing: '0' }],    // 20px - Supporting text
  'body': ['1rem', { lineHeight: '1.6', letterSpacing: '0' }],            // 16px - Body text
  'label': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.12em' }],    // 12px - UI labels
  'overline': ['0.75rem', { lineHeight: '1', letterSpacing: '0.12em' }],   // 12px - Section overlines
}
```

**⚠️ CRITICAL:** The `hero` token is **ONLY** for the main Hero H1. No other section should use this size. It's designed to create maximum visual dominance on landing pages.

### Font Weights

```javascript
fontWeight: {
  'heading': '600',  // For H1, H2, H3
  'body': '400',     // For body text
  'label': '500',    // For labels and overlines
}
```

### Letter Spacing

```javascript
letterSpacing: {
  'overline': '0.12em', // For section labels and UI labels
}
```

---

## Components

### SectionLabel

**Location:** `components/typography/SectionLabel.vue`

**Purpose:** Section overline/label (uppercase).

**Usage:**
```vue
<SectionLabel>EL PROBLEMA</SectionLabel>
```

**Classes Applied:**
- `text-overline`
- `uppercase`
- `tracking-overline`
- `font-label`

### PageTitle

**Location:** `components/typography/PageTitle.vue`

**Purpose:** Main page title (H1) for non-hero pages.

**Usage:**
```vue
<PageTitle>Mi lista de favoritos</PageTitle>
```

**Classes Applied:**
- `text-h1`
- `font-heading` (font family)
- `font-semibold` (font weight)

**Note:** For the Hero section, use `text-hero` directly instead of this component.

### SectionTitle

**Location:** `components/layout/SectionTitle.vue` (existing, updated)

**Purpose:** Section titles (H2).

**Usage:**
```vue
<SectionTitle>Elegir qué ver se ha vuelto agotador</SectionTitle>
```

**Classes Applied:**
- `text-h2`
- `font-heading` (font family)
- `font-semibold` (font weight)

### BodyText

**Location:** `components/typography/BodyText.vue`

**Purpose:** Body text paragraphs.

**Usage:**
```vue
<BodyText>
  Pasar horas navegando sin encontrar nada que realmente te interese.
</BodyText>
```

**Classes Applied:**
- `text-body`
- `font-body`

### UILabel

**Location:** `components/typography/UILabel.vue`

**Purpose:** UI labels and badges (uppercase).

**Usage:**
```vue
<UILabel>ATENCIÓN BAJA</UILabel>
```

**Classes Applied:**
- `text-label`
- `uppercase`
- `tracking-overline`
- `font-label`

---

## Usage Guidelines

### ✅ DO

1. **Use semantic tokens** for all critical typography:
   - `text-hero` (ONLY for Hero H1), `text-h1`, `text-h2`, `text-subtitle`, `text-body`, `text-label`, `text-overline`
   - `font-heading` (font family for headings), `font-body` (font family for body)
   - `font-bold` (weight 700 for hero), `font-semibold` (weight 600 for headings), `font-normal` (weight 400 for body), `font-medium` (weight 500 for labels)

2. **Use components** when available:
   - `<SectionLabel>` for section overlines
   - `<PageTitle>` for H1
   - `<SectionTitle>` for H2
   - `<BodyText>` for paragraphs
   - `<UILabel>` for UI labels

3. **Follow capitalization rules:**
   - Uppercase only for categorization (labels, badges, overlines)
   - Sentence case for all main content (H1, H2, body, buttons)

4. **Maintain hierarchy:**
   - H1 > H2 > H3 > Subtitle > Body
   - Use size, weight, and color to reinforce hierarchy

### ❌ DON'T

1. **Don't use direct sizes** for critical typography:
   - ❌ `text-xl`, `text-sm`, `text-base` for titles
   - ✅ `text-h1`, `text-h2`, `text-body` instead

2. **Don't hardcode typography values:**
   - ❌ `font-size: 24px` in CSS
   - ❌ `text-[24px]` in Tailwind
   - ✅ Use semantic tokens

3. **Don't use uppercase for emphasis:**
   - ❌ `¡DESCUBRE AHORA!`
   - ✅ `Descubre ahora`

4. **Don't mix typography patterns:**
   - ❌ Some labels uppercase, others sentence case
   - ✅ Consistent: labels uppercase, content sentence case

---

## Examples

### Correct Usage

```vue
<template>
  <section>
    <!-- Section Overline -->
    <SectionLabel>EL PROBLEMA</SectionLabel>
    
    <!-- Hero Title (ONLY in Hero section) -->
    <h1 class="text-hero font-heading font-bold">
      ¿No sabes qué ver ahora?
    </h1>
    
    <!-- Section Title -->
    <SectionTitle>Elegir qué ver se ha vuelto agotador</SectionTitle>
    
    <!-- Or use directly with classes -->
    <h1 class="text-h1 font-heading font-semibold">Mi lista de favoritos</h1>
    <h2 class="text-h2 font-heading font-semibold">Elegir qué ver se ha vuelto agotador</h2>
    
    <!-- Subtitle -->
    <p class="text-subtitle font-body text-gray-600 dark:text-gray-400">
      UpNext te ayuda a encontrar contenido perfecto para cada momento
    </p>
    
    <!-- Body Text -->
    <BodyText>
      Pasar horas navegando sin encontrar nada que realmente te interese.
    </BodyText>
    
    <!-- UI Label -->
    <UILabel>ATENCIÓN BAJA</UILabel>
    
    <!-- Button -->
    <button class="text-body font-body">
      Descubrir qué ver ahora
    </button>
  </section>
</template>
```

### Incorrect Usage

```vue
<template>
  <section>
    <!-- ❌ Wrong: Using direct size instead of semantic token -->
    <h1 class="text-4xl font-bold">¿No sabes qué ver ahora?</h1>
    
    <!-- ❌ Wrong: Uppercase for emphasis -->
    <h1>¡DESCUBRE AHORA!</h1>
    
    <!-- ❌ Wrong: Inconsistent capitalization -->
    <span class="text-sm uppercase">Atención Baja</span>
    
    <!-- ❌ Wrong: Hardcoded size -->
    <p style="font-size: 18px">Body text</p>
  </section>
</template>
```

---

## Migration Guide

When updating existing components:

1. **Replace direct sizes** with semantic tokens:
   - Hero H1: Use `text-hero` (responsive, much larger)
   - `text-4xl` → `text-h1` (for non-hero pages)
   - `text-2xl` → `text-h2`
   - `text-base` → `text-body`
   - `text-sm` → `text-label` (if uppercase) or `text-body` (if sentence case)

2. **Update capitalization:**
   - Remove uppercase from main content (H1, H2, body, buttons)
   - Keep uppercase only for labels, badges, overlines

3. **Use components** when available:
   - Replace custom H1 with `<PageTitle>`
   - Replace custom labels with `<SectionLabel>` or `<UILabel>`

4. **Test visual hierarchy:**
   - Ensure H1 > H2 > H3 > Subtitle > Body
   - Verify uppercase is only for categorization

---

## References

- `tailwind.config.js` - Typography tokens definition
- `components/typography/` - Typography components
- `components/layout/SectionTitle.vue` - Section title component
- `docs/DESIGN_UX_GUIDELINES.md` - General design guidelines

