# Revify Outreach - Design System

## Brand Identity

### Positioning
**Revify Outreach** is the AI-powered research engine that makes outbound sales smarter. Simple, powerful, and built for GHL users.

### Design Principles
1. **Clean & Modern** - Minimal clutter, clear hierarchy
2. **Professional Trust** - Enterprise-ready aesthetics
3. **Action-Oriented** - Clear CTAs, obvious next steps
4. **Data-Rich** - Show insights without overwhelming

---

## Color Palette

### Primary - Emerald Green
```css
--emerald-50: #ecfdf5;
--emerald-100: #d1fae5;
--emerald-200: #a7f3d0;
--emerald-300: #6ee7b7;
--emerald-400: #34d399;
--emerald-500: #10b981;  /* Primary */
--emerald-600: #059669;  /* Primary Dark */
--emerald-700: #047857;
--emerald-800: #065f46;
--emerald-900: #064e3b;
--emerald-950: #022c22;
```

### Neutrals - Slate
```css
--slate-50: #f8fafc;
--slate-100: #f1f5f9;
--slate-200: #e2e8f0;
--slate-300: #cbd5e1;
--slate-400: #94a3b8;
--slate-500: #64748b;
--slate-600: #475569;
--slate-700: #334155;
--slate-800: #1e293b;
--slate-900: #0f172a;
--slate-950: #020617;
```

### Semantic Colors
```css
--success: #10b981;  /* emerald-500 */
--warning: #f59e0b;  /* amber-500 */
--error: #ef4444;    /* red-500 */
--info: #3b82f6;     /* blue-500 */
```

### Gradients
```css
/* Hero/CTA Gradient */
--gradient-primary: linear-gradient(135deg, #10b981 0%, #059669 100%);

/* Subtle Card Gradient */
--gradient-card: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);

/* Glass Effect */
--glass-bg: rgba(255, 255, 255, 0.8);
--glass-border: rgba(255, 255, 255, 0.2);
```

---

## Typography

### Font Stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Scale
| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display | 36px | 700 | 1.1 | Page titles |
| H1 | 30px | 600 | 1.2 | Section headers |
| H2 | 24px | 600 | 1.3 | Card titles |
| H3 | 20px | 600 | 1.4 | Subsections |
| H4 | 16px | 600 | 1.5 | Labels |
| Body | 14px | 400 | 1.6 | Default text |
| Small | 12px | 400 | 1.5 | Captions, hints |
| Tiny | 11px | 500 | 1.4 | Badges, tags |

---

## Spacing System

Based on 4px grid:
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

---

## Components

### Sidebar
- **Width**: 260px (desktop), collapsible to 72px
- **Background**: White with subtle shadow
- **Active item**: Emerald-500 background with white text
- **Hover**: Slate-100 background

### Cards
```css
.card {
  background: white;
  border: 1px solid var(--slate-200);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
}

.card:hover {
  border-color: var(--emerald-300);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
}

.card-selected {
  border-color: var(--emerald-500);
  background: var(--emerald-50);
}
```

### Buttons
```css
/* Primary */
.btn-primary {
  background: var(--gradient-primary);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

/* Secondary */
.btn-secondary {
  background: white;
  color: var(--slate-700);
  border: 1px solid var(--slate-200);
  padding: 10px 20px;
  border-radius: 8px;
}

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--emerald-600);
  padding: 10px 20px;
}
```

### Input Fields
```css
.input {
  background: white;
  border: 1px solid var(--slate-200);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--emerald-500);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}
```

### Badges/Pills
```css
.badge {
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
}

.badge-success { background: var(--emerald-100); color: var(--emerald-700); }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-info { background: #dbeafe; color: #1e40af; }
```

---

## Layout Structure

### Dashboard Layout
```
┌────────────────────────────────────────────────────────────────────┐
│  Header (Logo + User Menu)                            [User Avatar]│
├──────────────┬─────────────────────────────────────────────────────┤
│              │                                                     │
│   Sidebar    │              Main Content Area                      │
│              │                                                     │
│  ┌────────┐  │  ┌─────────────────────────────────────────────┐   │
│  │Dashboard│  │  │                                             │   │
│  ├────────┤  │  │                                             │   │
│  │Research │  │  │         Page Content                       │   │
│  ├────────┤  │  │                                             │   │
│  │ Bulk   │  │  │                                             │   │
│  ├────────┤  │  │                                             │   │
│  │ Email  │  │  │                                             │   │
│  ├────────┤  │  │                                             │   │
│  │History │  │  │                                             │   │
│  ├────────┤  │  └─────────────────────────────────────────────┘   │
│  │Settings│  │                                                     │
│  └────────┘  │                                                     │
│              │                                                     │
│  ┌────────┐  │                                                     │
│  │Credits │  │                                                     │
│  │ 450/500│  │                                                     │
│  └────────┘  │                                                     │
│              │                                                     │
└──────────────┴─────────────────────────────────────────────────────┘
```

---

## Page Designs

### 1. Dashboard / Research Selection
Similar to AixUP's search selection - card grid showing research types:

```
What would you like to research?

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│      🔍         │  │      📊         │  │      📧         │
│                 │  │                 │  │                 │
│ Quick Research  │  │  Deep Research  │  │ Email Campaign  │
│                 │  │                 │  │                 │
│ Fast company    │  │ Comprehensive   │  │ Generate emails │
│ overview        │  │ analysis        │  │ from research   │
│                 │  │                 │  │                 │
│ 1 credit        │  │ 3 credits       │  │ Included        │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│      📦         │  │      ⚡         │
│                 │  │                 │
│ Bulk Research   │  │  GHL Import     │
│                 │  │                 │
│ Research many   │  │ Pull companies  │
│ companies       │  │ from GHL        │
│                 │  │                 │
│ Per company     │  │ Free            │
└─────────────────┘  └─────────────────┘
```

### 2. Research Input
Clean form with company details:

```
┌─────────────────────────────────────────────────────────────────┐
│  Research Company                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Company Name *                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Acme Corporation                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Website                                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ https://acme.com                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Industry                                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Manufacturing                                        ▼    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Research Depth                                                 │
│  ○ Quick (1 credit)   ● Standard (2 credits)   ○ Deep (3)     │
│                                                                 │
│                                        ┌─────────────────────┐ │
│                                        │   Start Research    │ │
│                                        └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Research Results
Rich, scannable results layout:

```
┌─────────────────────────────────────────────────────────────────┐
│  Acme Corporation                              Confidence: 87%  │
│  Manufacturing • Est. $50M Revenue • 200 employees              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Recent Signals                                    [View All]   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🟢 Expansion announced - new facility opening Q2 2026    │  │
│  │    Source: Press Release • Jan 15, 2026                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🟡 Leadership change - new CFO joined from competitor    │  │
│  │    Source: LinkedIn • Dec 20, 2025                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Pain Points                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 💡 Pricing complexity with new product lines             │  │
│  │    Evidence: Multiple SKU variations mentioned in job... │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Talking Points by Persona                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │    CFO     │ │  Pricing   │ │   Sales    │ │    CEO     │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  Generate Email │  │   Push to GHL   │  │  Save to List  │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Icon System

Using **Lucide React** icons consistently:

| Function | Icon | Usage |
|----------|------|-------|
| Dashboard | `LayoutDashboard` | Nav item |
| Research | `Search` | Nav item, actions |
| Bulk | `Layers` | Nav item |
| Email | `Mail` | Nav item, actions |
| History | `Clock` | Nav item |
| Settings | `Settings` | Nav item |
| Credits | `Wallet` | Sidebar widget |
| Company | `Building2` | Research cards |
| Person | `User` | Persona tabs |
| Signal | `Activity` | Research signals |
| Success | `CheckCircle` | Confirmations |
| Warning | `AlertTriangle` | Alerts |
| Info | `Info` | Tooltips |
| External | `ExternalLink` | Links |
| Copy | `Copy` | Copy actions |
| Download | `Download` | Export |
| Push | `Send` | GHL push |

---

## Motion & Animation

### Transitions
```css
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

### Hover States
- Cards: Subtle lift (translateY -2px) + shadow increase
- Buttons: Brightness increase + shadow
- Links: Color shift to emerald-600

### Loading States
- Skeleton screens for content loading
- Spinner for actions (emerald-500)
- Progress bar for bulk operations

---

## Responsive Breakpoints

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

### Mobile Behavior
- Sidebar collapses to hamburger menu
- Cards stack vertically
- Full-width inputs
- Bottom navigation option

---

## Dark Mode (Future)

Color mappings for dark mode:
```css
/* Background */
--bg-primary: var(--slate-900);
--bg-secondary: var(--slate-800);
--bg-card: var(--slate-800);

/* Text */
--text-primary: var(--slate-100);
--text-secondary: var(--slate-400);

/* Accent remains emerald */
--accent: var(--emerald-400);
```
