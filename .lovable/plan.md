

# Fix: Header and Comment Bar Width on PostDetail Desktop

## Root Cause

The `motion.header` element from framer-motion applies inline `style` properties via `useTransform` (backgroundColor, borderBottomColor). Framer-motion motion elements can inject `will-change` or `transform` styles that create containing block issues, preventing `fixed` + `left-0 right-0` from spanning the true viewport width.

Additionally, the inner header div has `lg:max-w-6xl lg:mx-auto` which adds an unnecessary max-width constraint that doesn't match the full-width intent.

The CommentInput has nested wrappers (`max-w-6xl mx-auto lg:px-10` > `lg:max-w-[760px]`) that add unnecessary constraint layers.

## Fix (3 files)

### 1. `PostHeader.tsx` — Replace `motion.header` with plain `<header>`

Remove framer-motion dependency entirely. Use a scroll listener with React state for the background opacity effect. Remove `lg:max-w-6xl lg:mx-auto` from the inner div — use only `lg:px-10` for padding alignment (matching the article container's padding).

The `<header>` will be `fixed top-0 left-0 right-0 w-full` — guaranteed full viewport width with no framer-motion interference.

### 2. `CommentInput.tsx` — Simplify wrapper structure

Remove the nested `max-w-6xl mx-auto lg:px-10` > `lg:max-w-[760px]` wrappers. Use a single inner div with `lg:px-10` padding to match the article container's horizontal alignment. The outer fixed div stays `fixed bottom-0 left-0 right-0 w-full`.

### 3. `PostDetail.tsx` — Guest banner consistency

Add `w-full` to the guest banner fixed container for consistency.

## What changes

| Element | Before | After |
|---|---|---|
| PostHeader outer | `motion.header` with framer-motion transforms | Plain `<header>` with scroll state |
| PostHeader inner | `lg:max-w-6xl lg:mx-auto lg:px-10` | `lg:px-10` only |
| CommentInput outer | `fixed bottom-0 left-0 right-0` | `fixed bottom-0 left-0 right-0 w-full` |
| CommentInput inner | `max-w-6xl mx-auto lg:px-10` > `lg:max-w-[760px]` | Single div with `lg:px-10` |

## What doesn't change

- Mobile layout (all changes use `lg:` prefix or are structural simplifications)
- Article content width, engagement section, comment section
- Right sidebar
- Visual identity, colors, typography
- Business logic

## Files modified

1. `src/components/post/PostHeader.tsx`
2. `src/components/post/CommentInput.tsx`
3. `src/pages/PostDetail.tsx`

