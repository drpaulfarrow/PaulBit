# Tollbit Design System - Quick Reference

## 🎨 Color Swatches

```
PRIMARY COLORS
█ #2abbb0  Primary Teal (Brand)
█ #229e94  Primary Dark
█ #3dd4c8  Primary Light

ACCENT COLORS
█ #587eba  Accent Blue (Links, Secondary)
█ #f77402  Accent Orange (Warnings)

NEUTRAL PALETTE
█ #f9f8f7  Background
█ #f4f2f2  Hover Background
█ #e9e9e9  Border Light
█ #d3d1d1  Border Medium
█ #c5c5c5  Border
█ #bababa  Border Dark
█ #999999  Text Muted
█ #333333  Text Body
█ #211f1f  Text Heading
█ #111111  Text Black

SEMANTIC COLORS
█ #49b27b  Success (Green)
█ #e5de7d  Warning (Yellow)
█ #fffccd  Warning Background
█ #ed1c24  Error (Red)
█ #fef3f4  Error Background
```

## 🔘 Button Variations

```css
/* Primary - Main actions */
.btn-primary {
  background: #2abbb0;
  color: white;
  border: 1px solid #2abbb0;
}

/* Secondary - Alternative actions */
.btn-secondary {
  background: white;
  color: #333;
  border: 1px solid #d3d1d1;
}

/* Accent - Special features */
.btn-accent {
  background: #587eba;
  color: white;
  border: 1px solid #587eba;
}

/* Danger - Destructive actions */
.btn-danger {
  background: #ed1c24;
  color: white;
  border: 1px solid #ed1c24;
}

/* Success - Confirmations */
.btn-success {
  background: #49b27b;
  color: white;
  border: 1px solid #49b27b;
}
```

## 📐 Spacing Scale

```
PADDING/MARGIN
4px   - xs  (0.25rem)
8px   - sm  (0.5rem)
12px  - md  (0.75rem)
16px  - lg  (1rem)
20px  - xl  (1.25rem)
24px  - 2xl (1.5rem)
32px  - 3xl (2rem)
40px  - 4xl (2.5rem)
```

## 📝 Typography Scale

```
HEADINGS
h1 - 24px / 700 weight
h2 - 18px / 700 weight
h3 - 16px / 700 weight

BODY TEXT
p  - 12px / 400 weight
small - 11px / 400 weight

COLORS
Headings: #211f1f
Body: #333333
Muted: #999999
```

## 🎯 Component Patterns

### Card Structure
```
┌─────────────────────────────┐
│  CARD HEADER (Gradient)     │ ← #f8f8f8 to #e9e9e9
├─────────────────────────────┤
│                             │
│  CARD BODY (White)          │ ← Padding: 15px
│                             │
└─────────────────────────────┘
Border: 1px solid #bababa
Shadow: 0 0 10px rgba(0,0,0,0.2)
Radius: 5px
```

### Alert Box
```
┌─────────────────────────────┐
│ ⚠  Alert message here...    │
└─────────────────────────────┘
Icon space: 35px left padding
Text padding: 10px
Border radius: 4px

Types:
- Success: #e8f5ee bg, #49b27b border
- Warning: #fffccd bg, #e5de7d border
- Error: #fef3f4 bg, #ed1c24 border
- Info: #e8f2fb bg, #587eba border
```

### Form Input
```
┌─────────────────────────────┐
│ Input text...               │
└─────────────────────────────┘
Border: 1px solid #d3d1d1
Focus: 1px solid #2abbb0
Shadow: 0 0 3px rgba(185,185,185,0.1)
Focus Shadow: 0 0 5px rgba(42,187,176,0.2)
Radius: 2px
Padding: 5px 10px
```

### Button States
```
DEFAULT    → white bg, #d3d1d1 border
HOVER      → #f4f2f2 bg
ACTIVE     → #e8e6e6 bg
DISABLED   → 35% opacity, no pointer

PRIMARY BUTTON
DEFAULT    → #2abbb0 bg
HOVER      → 80% opacity
ACTIVE     → #229e94 bg
```

## 🎭 State Badges

```html
<!-- Success -->
<span class="badge badge-success">ACTIVE</span>
Background: #e8f5ee, Color: #49b27b

<!-- Warning -->
<span class="badge badge-warning">PENDING</span>
Background: #fffccd, Color: #9d8c00

<!-- Error -->
<span class="badge badge-error">FAILED</span>
Background: #fef3f4, Color: #ed1c24

<!-- Info -->
<span class="badge badge-info">NEW</span>
Background: #e8f2fb, Color: #587eba
```

## 📊 Table Styling

```
┌────────┬────────┬────────┐
│ Header │ Header │ Header │ ← #f8f8f8 bg, 2px bottom border
├────────┼────────┼────────┤
│ Cell   │ Cell   │ Cell   │ ← White bg
├────────┼────────┼────────┤
│ Cell   │ Cell   │ Cell   │ ← Hover: #f9f8f7
└────────┴────────┴────────┘

Cell padding: 10px 12px
Border: 1px solid #e9e9e9
Font size: 12px
```

## 🪟 Modal Layout

```
OVERLAY: rgba(255,255,255,0.8)
        z-index: 4000

┌───────────────────────────────────┐
│ Dialog Title              [X]     │ ← Header: 20px padding
├───────────────────────────────────┤
│                                   │
│ Dialog content area...            │ ← Body: 20px padding
│                                   │
├───────────────────────────────────┤
│              [Cancel] [Confirm]   │ ← Footer: 15px 20px
└───────────────────────────────────┘

Shadow: 0 0 4px rgba(0,0,0,0.5)
Radius: 4px
Max-width: 90vw
Max-height: 80vh
```

## 🎨 Gradients

```css
/* Card Header Gradient */
background: linear-gradient(to bottom, #f8f8f8 0%, #e9e9e9 100%);

/* Page Header Gradient */
background: linear-gradient(to bottom, #fff, #f9f8f7);
```

## ⌨️ Focus States

```css
/* Inputs */
input:focus {
  border-color: #2abbb0;
  box-shadow: 0 0 5px rgba(42, 187, 176, 0.2);
  outline: none;
}

/* Buttons */
button:focus-visible {
  outline: 2px solid #2abbb0;
  outline-offset: 2px;
}

/* Links */
a:focus-visible {
  outline: 2px solid #587eba;
  outline-offset: 2px;
}
```

## 📱 Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  font-size: 11px;
  padding: reduced;
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  /* Tablet-specific styles */
}

/* Desktop */
@media (min-width: 1025px) {
  /* Desktop-specific styles */
}
```

## ⚡ Transitions

```css
/* Standard timing */
transition: 0.1s linear;

/* Properties to animate */
- background-color
- border-color
- opacity
- box-shadow
- color

/* Avoid animating */
- width/height (use transform: scale)
- top/left (use transform: translate)
```

## ✅ Accessibility Checklist

- [ ] Color contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] Keyboard navigation supported
- [ ] Focus indicators visible
- [ ] Semantic HTML elements used
- [ ] ARIA labels where needed
- [ ] Touch targets ≥ 44x44px (mobile)

---

**Implementation**: All styles available in `design-system.css`
**Documentation**: See `DESIGN_SYSTEM.md` for detailed examples
**Dashboard**: View at `localhost:5173` after build
