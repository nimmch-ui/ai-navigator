# AI Navigator - Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from Google Maps and Apple Maps for navigation excellence, combined with modern chat interfaces like ChatGPT for AI interaction. The design balances utility-first navigation with conversational AI guidance.

**Core Principle**: Clean, uncluttered map-first interface with intelligent layering of AI assistance and navigation controls.

---

## Typography

**Primary Font**: Inter or SF Pro Display (via Google Fonts)
- Headers: 600-700 weight, sizes 24px-32px
- Body text: 400-500 weight, 14px-16px
- Map labels/controls: 500 weight, 13px-15px
- AI chat: 400 weight, 15px for readability

**Hierarchy**:
- Location names: Bold, 20px
- Route instructions: Medium, 16px
- AI responses: Regular, 15px with good line-height (1.6)

---

## Layout System

**Spacing Units**: Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, h-8)
- Component padding: p-4 to p-6
- Section gaps: gap-4 to gap-6
- Icon spacing: 2-4 units from text

**Grid Structure**:
- Full-viewport map with overlaid UI panels
- Collapsible sidebar (320px) for AI chat on desktop
- Bottom sheet pattern for mobile route/chat display
- Fixed header bar (h-16) with search and controls

---

## Core Layout Patterns

### Desktop (lg:)
- Map fills entire viewport
- Left sidebar (320px wide) slides in for AI chat
- Top search bar (h-16) spans full width
- Right-side floating controls (zoom, layers, location)
- Route panel overlays bottom-left when active

### Mobile (base)
- Full-screen map
- Sticky top search bar (h-14)
- Floating action button for AI chat (bottom-right)
- Slide-up bottom sheet for routes and chat
- Minimal UI chrome for maximum map visibility

---

## Component Library

### Navigation Header
- Prominent search bar with autocomplete dropdown
- Logo/app name (left aligned)
- Menu icon and profile (right aligned)
- Shadow on scroll for depth

### Map Interface
- Clean, border-free map container
- Custom location markers with shadow and pulse animation
- Route polylines with gradient treatment
- Cluster markers for multiple POIs

### AI Chat Panel
- Chat bubble design (user right-aligned, AI left-aligned)
- Avatar icons for AI assistant
- Timestamp metadata (subtle, small text)
- Input field with send button at bottom
- Suggested prompts as chips below input

### Route Display
- Turn-by-turn cards with icons
- Distance and time estimates prominently displayed
- Alternate route options as tabs
- Start/End location cards with addresses

### Controls & Buttons
- Floating circular buttons (zoom +/-, layers, current location)
- Primary CTAs: solid background with shadow
- Secondary actions: subtle border, transparent
- Icon-only controls: 44px tap targets minimum

### Search & Autocomplete
- Generous input height (h-12)
- Icon prefix (search/magnifying glass)
- Dropdown results with category headers
- Recent searches section
- Clear button when text present

### Location Cards
- POI name and category
- Rating stars and review count
- Distance from current location
- Quick action buttons (Directions, Save, Share)
- Thumbnail image when available

---

## Interactive States

**Hover**: Subtle elevation increase, slight opacity change
**Active/Selected**: Accent color indicator, bold text
**Focus**: Clear outline for keyboard navigation
**Loading**: Skeleton screens for map tiles, spinner for route calculation

---

## Animations

**Minimalist approach**:
- Map marker drop-in (subtle bounce)
- Panel slide transitions (300ms ease-out)
- Route drawing animation (path reveal)
- Chat message fade-in (200ms)
- NO excessive scroll animations or parallax

---

## Images

### Hero/Primary Visuals
**No large hero image** - this is a utility app where the map IS the primary visual element.

### Supporting Images
- Location thumbnail photos in search results and POI cards (aspect ratio 16:9, rounded corners)
- AI avatar icon (simple, friendly illustration)
- Empty state illustrations (when no routes or search results)
- Category icons for POI types (restaurants, gas, hotels)

**Image Treatment**: 
- Rounded corners (4px-8px radius)
- Subtle shadow for depth
- Lazy loading for performance

---

## Accessibility

- High contrast text on map overlays
- 44px minimum touch targets for all interactive elements
- Keyboard navigation for all controls
- Screen reader labels for map controls
- Clear focus indicators throughout
- Voice output option for turn-by-turn directions

---

## Mobile-First Considerations

- Bottom-heavy UI for thumb-friendly interaction
- Swipeable panels and sheets
- Large, clear tap targets
- Minimal text input requirements (voice search support)
- Offline mode indicators
- Battery-conscious auto-refresh intervals

---

This design creates a professional, utility-focused navigation experience with seamless AI integration—prioritizing clarity, efficiency, and intelligent assistance over visual flourish.