```markdown
# Design System Specification: Editorial Trust & Fluidity

## 1. Overview & Creative North Star
The "Creative North Star" of this design system is **The Digital Curator**. 

In an industry often defined by complex jargon and rigid spreadsheets, this system moves in the opposite direction. It prioritizes clarity through high-end editorial layouts, intentional asymmetry, and a sense of "breathable authority." We reject the "boxed-in" feeling of traditional insurance platforms. Instead, we utilize overlapping elements and shifting tonal planes to guide the user through a narrative journey. This is a premium experience that communicates security not through heavy borders, but through sophisticated depth and typographic precision.

---

## 2. Colors: Tonal Architecture
The palette is rooted in deep navy and vibrant teal, but its strength lies in its "Surface" hierarchy. We use color to define space, eliminating the need for structural lines.

### Key Tokens
- **Primary (Deep Authority):** `#002356` (Use for core branding and high-impact headlines).
- **Secondary (Action):** `#006398` (The functional bridge for primary actions).
- **Tertiary (The Accent):** `#002935` (Deep teal for refined details and containers).
- **Background:** `#f7f9fb` (The "canvas" upon which all layers sit).

### The "No-Line" Rule
**Explicit Instruction:** Prohibition of 1px solid borders for sectioning. 
Boundaries must be defined solely through background color shifts. For example, a feature section in `surface-container-low` (#f2f4f6) should sit directly against a `surface` background (#f7f9fb). The contrast is felt, not seen as a line.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper. 
- **Base:** `surface` (#f7f9fb)
- **Secondary Plane:** `surface-container` (#eceef0)
- **Elevated Interactive Layer:** `surface-container-lowest` (#ffffff) for cards and inputs.

### The "Glass & Gradient" Rule
To elevate the "Professional Modern" aesthetic, use Glassmorphism for floating elements (like sticky navigation or floating CTAs). Use the `primary` to `primary_container` gradient for Hero backgrounds to inject visual "soul" and depth that a flat fill cannot provide.

---

## 3. Typography: Editorial Authority
The type system uses a dual-font approach to balance personality with readability.

- **The Display Scale (Plus Jakarta Sans):** Used for Headlines (`display-lg` to `headline-sm`). Plus Jakarta Sans offers a geometric, modern feel that looks "custom" and expensive. It conveys the brand's forward-thinking nature.
- **The Functional Scale (Manrope):** Used for Body and Labels (`title-lg` to `label-sm`). Manrope is highly legible and provides a sturdy, trustworthy counterpoint to the more fluid display face.

**Hierarchy Strategy:** 
Large `display-lg` (3.5rem) headers should be paired with generous letter spacing (tracking) and ample leading to create an "Editorial" feel. Use `on_primary_container` (#80a4f4) for sub-headers to create a soft, sophisticated hierarchy within dark sections.

---

## 4. Elevation & Depth: Tonal Layering
We do not use structural lines to separate ideas. We use "Atmospheric Depth."

- **The Layering Principle:** Place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#f2f4f6) background. This 2% shift in brightness creates a "Soft Lift" that is more premium than a shadow.
- **Ambient Shadows:** When an element must "float" (like a plan selection card), use an extra-diffused shadow. 
    - *Formula:* `y-20, blur-40, color: rgba(25, 28, 30, 0.06)`. 
    - The shadow color should be a tint of `on-surface`, never a pure neutral grey.
- **The "Ghost Border" Fallback:** If a container requires definition for accessibility (e.g., input fields), use the `outline_variant` (#c3c6d3) at **15% opacity**. High-contrast borders are strictly forbidden.
- **Backdrop Blurs:** For modals or floating headers, use `surface-container-lowest` with a 70% opacity and a 20px Backdrop Blur.

---

## 5. Components: Refined Interaction

### Buttons
- **Primary:** `primary` (#002356) fill with `on_primary` (#ffffff) text. Use `rounded-full` (9999px) for a modern, friendly feel.
- **Secondary (Ghost):** Use a `primary` label with no fill. For hover states, introduce a `primary_fixed` (#d9e2ff) background at 10% opacity.
- **Sizing:** Large buttons (Hero) require `px-8 py-4`. Small buttons (Cards) use `px-6 py-2`.

### Cards & Plan Selection
- **The Rule of No Dividers:** Never use a line to separate "Monthly Price" from "Benefits." Use a vertical spacing increment of `1.5rem` (xl) or a subtle background shift using `surface-container-highest` (#e0e3e5) for the footer of a card.
- **Corner Radius:** All cards must use `rounded-lg` (1rem) for a softened, premium look.

### Input Fields & Toggles
- **Inputs:** Use `surface-container-lowest` (#ffffff) as the fill. The label should use `label-md` in `on_surface_variant`. 
- **Segmented Toggles:** For selecting "Age Group" or "Plan Type," use a pill-shaped container (`surface-container-high`) with a `primary` (#002356) "active" state that physically slides between options.

### Chips (Badges)
- **Style:** Use `secondary_container` (#65bafd) with `on_secondary_container` (#004971) text. These should be `rounded-full` and use `label-sm` typography. They serve as "micro-headlines" to highlight key features like "Selected" or "Recommended."

---

## 6. Do's and Don'ts

### Do:
- **Do** use intentional white space. If a section feels crowded, double the padding before adding a border.
- **Do** use "Editorial Offsets." Place a decorative element or icon slightly overlapping the edge of a container to break the grid.
- **Do** use high-contrast typography. Pair a huge `display-md` header with a small, high-tracking `label-md` tag above it.

### Don't:
- **Don't** use 100% opaque borders. They make the UI look like a template.
- **Don't** use standard "Drop Shadows." If the shadow is noticeable at first glance, it is too heavy.
- **Don't** use dividers. If you need to separate content, use a `surface-container` background shift or increased vertical padding.
- **Don't** mix the typography roles. `Plus Jakarta Sans` is for the "Soul" (Headers); `Manrope` is for the "Information" (Body). Keep them distinct.

---

*This design system is designed to evolve. When in doubt, prioritize visual "breath" and tonal depth over structural rigidity.*```