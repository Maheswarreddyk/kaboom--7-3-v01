# IndiaTV Design System

> Premium, calm, trust-first visual language inspired by Apple HIG and Material Design 3 principles.

## Design Philosophy

| Principle | Implementation |
|-----------|----------------|
| Premium | Soft shadows, glass surfaces, generous spacing |
| Minimal | Limited palette, no decorative gradients |
| Trustworthy | Blue primary — banking/health association |
| Calming | Deep navy background, low saturation |
| Accessible | 44px touch targets, focus rings, reduced motion |

## Color Tokens

| Token | Value | Psychology |
|-------|-------|------------|
| `canvas` | `#090E1A` | Deep calm — reduces eye strain during video |
| `surface` | `#111827` | Elevated content areas |
| `brand` | `#4F8EF7` | Trust, safety, technology |
| `violet` | `#7C6BF0` | Curiosity, connection |
| `sky` | `#38BDF8` | Conversation, openness |
| `success` | `#4ADE80` | Positive confirmation |
| `warning` | `#FBBF24` | Caution without alarm |
| `danger` | `#FB7185` | Soft rose — not aggressive red |
| `like` | `#F472B6` | Warmth, affection (likes only) |

## Typography Scale

| Class | Size | Use |
|-------|------|-----|
| `text-display-lg` | 48px | Hero headlines |
| `text-display` | 36px | Page titles |
| `text-heading` | 24px | Section headers |
| `text-subheading` | 18px | Card titles |
| `text-body` | 16px | Body copy |
| `text-caption` | 14px | UI labels, chat |
| `text-micro` | 12px | Badges, timestamps |

## Spacing (8pt grid)

4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64

## Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `sm` | 8px | Tags, badges |
| `md` | 12px | Inputs, small buttons |
| `lg` | 16px | Cards |
| `xl` | 20px | Modals |
| `2xl` | 24px | Bottom sheets |
| `3xl` | 32px | Large modals |
| `full` | 9999px | Control buttons, PiP |

## Motion

| Animation | Duration | Use |
|-----------|----------|-----|
| `fade-in` | 400ms | Page enter |
| `slide-up` | 350ms spring | Bottom sheets, toasts |
| `scale-up` | 350ms spring | Modals |
| `heart-beat` | 550ms | Like feedback |
| `search-ring` | 2s loop | Matching search |
| `float-particle` | 3.5s | Mutual like celebration |

All animations respect `prefers-reduced-motion`.

## Components

- `.btn-primary` / `.btn-secondary` / `.btn-danger` / `.btn-ghost`
- `.control-btn` — 48px circular video controls
- `.glass` / `.glass-card` / `.surface-elevated`
- `.input-field` / `.textarea-field`
- `.chat-bubble-self` / `.chat-bubble-partner`
- `.badge-success` / `.badge-warning` / `.badge-info`

## Accessibility

- Minimum touch target: 44×44px
- Focus: 2px brand ring with offset
- Contrast: content-primary on canvas ≥ 7:1
- ARIA labels on all icon-only buttons
- `role="dialog"`, `aria-modal`, `aria-live` on dynamic regions
