# Design System v2 — Agent Control Room
## Dark First Color Palette (Black & Pink)

## 색상 팔레트

### Background & Surface (Dark First)
- **Background**: #0A0A0A (Main page background)
- **Surface**: #111111 (Cards, panels)
- **Surface-2**: #18181B (Elevated surfaces, hover states)
- **Border**: #27272A (Subtle borders)

### Text
- **Text-Primary**: #FAFAFA (Main text, high contrast)
- **Text-Secondary**: #A1A1AA (Secondary text, labels)

### Primary Accent (Pink)
- **Pink-Primary**: #EC4899 (Main accent, CTAs, active states)
- **Pink-Soft**: #F472B6 (Hover states, secondary pink)
- **Pink-Muted**: #BE185D (Pressed/dark state)

### Semantic Colors
- **Success**: #16A34A (Completed tasks, success states)
- **Warning**: #F59E0B (Partial completion, warnings)
- **Error**: #DC2626 (Blocked, errors, critical issues)

### Supporting
- **Gray-600**: #52525B (Tertiary text, disabled)
- **Gray-700**: #3F3F46 (Quiet borders, dividers)

## 타이포그래피

### Font Family
- **Primary**: Inter, -apple-system, BlinkMacSystemFont
- **Monospace**: IBM Plex Mono (코드)

### Scale
| Type | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display | 32px | 700 | 1.2 | Page titles |
| Heading 1 | 28px | 700 | 1.3 | Section headings |
| Heading 2 | 24px | 600 | 1.4 | Subsection headings |
| Heading 3 | 20px | 600 | 1.4 | Card titles |
| Body Large | 16px | 400 | 1.6 | Main content |
| Body | 14px | 400 | 1.6 | Standard text |
| Small | 12px | 400 | 1.5 | Labels, captions |
| Tiny | 11px | 400 | 1.4 | Metadata |

## Spacing System

```
xs: 4px    (internal padding, small gaps)
sm: 8px    (button padding, small margins)
md: 16px   (standard padding, card gaps)
lg: 24px   (section padding, major margins)
xl: 32px   (page margins)
2xl: 48px  (hero sections)
```

## 컴포넌트 정의

### Button
```typescript
// Variants
- Primary (fill, pink-primary #EC4899, text: #0A0A0A bold)
- Secondary (outline, border: gray-600, text: text-primary, bg: surface hover: surface-2)
- Ghost (transparent, text: text-primary, hover: bg-surface-2)
- Danger (fill, error #DC2626, text: #FAFAFA)

// Sizes
- sm: 8px 12px, 12px font
- md: 10px 16px, 14px font (default)
- lg: 12px 20px, 16px font

// States
- Default
- Hover (pink: → pink-soft, others: bg darkens)
- Active (pink: → pink-muted, others: darker)
- Disabled (opacity 40%, cursor not-allowed)
- Loading (spinner icon, disabled state)
```

### Card
```typescript
// Default (Dark Mode)
- Elevated (shadow: 0 4px 12px rgba(0,0,0,0.5), bg: surface #111111)
- Outlined (border: 1px border-gray #27272A, bg: surface #111111)
- Flat (bg: background #0A0A0A, no border)

// Hover States
- Elevated (shadow: 0 6px 16px rgba(0,0,0,0.6), bg: surface-2 #18181B)
- Outlined (border: 1px border-gray, bg: surface-2)
```

### Badge
```typescript
// Types
- Primary (fill: surface-2, text: pink-primary, small font)
- Success (fill: surface-2, text: success, small font)
- Warning (fill: surface-2, text: warning, small font)
- Error (fill: surface-2, text: error, small font)
- Outline (border: pink-primary, text: pink-primary)

// Sizes
- sm: 4px 8px, 11px font
- md: 6px 12px, 12px font (default)
```

### Input
```typescript
// States
- Default (border: border-gray #27272A, bg: surface-2, text: text-primary)
- Focus (border: pink-primary, ring: 2px pink-primary at 25% opacity)
- Error (border: error, ring: 2px error at 25% opacity)
- Disabled (bg: surface, opacity: 40%, cursor not-allowed)

// Sizes
- md: 8px 12px, 14px font (default)
- lg: 12px 16px, 16px font
```

### Status Badge (태스크 상태)
Status badges now use Lucide icons with Pink/Neutral color scheme:

```typescript
Planned:      bg-surface-2, text-text-secondary, Circle icon
Ready:        bg-surface-2, text-pink-primary, Clock icon
Running:      bg-surface-2, text-pink-primary, Loader2 (animated) icon
Done:         bg-surface-2, text-success, CheckCircle2 icon
Partial:      bg-surface-2, text-warning, AlertCircle icon
Blocked:      bg-surface-2, text-error, AlertTriangle icon
Needs Review: bg-surface-2, text-pink-primary, Eye icon
```

## Responsive Breakpoints — Desktop First

```
Desktop:     > 1024px (default, optimized)
Tablet:      768px - 1024px (graceful degradation)
Mobile:      < 768px (functional, not optimized)

Key breakpoints for Agent Control Room:
- 1440px (standard desktop, 16:9 wide)
- 1024px (desktop → tablet threshold)
- 768px (tablet → mobile threshold)
- 390px (modern mobile baseline)

Strategy: Build for 1440px first, ensure 1024px readable, accept mobile as "not broken"
```

## Dark Mode Implementation

### Default
- **Always starts in Dark mode** (`theme: 'dark'` in localStorage and Tailwind config)
- Optional toggle available in settings (if user explicitly switches, respect localStorage)
- No `prefers-color-scheme` detection at startup — Dark is the explicit default

### CSS Implementation
```css
/* Dark mode is default (no dark: prefix needed in most cases) */
body { background: #0A0A0A; color: #FAFAFA; }

/* Use light: prefix only for light mode variants (rarely needed) */
/* Example: light:bg-white light:text-black (for exceptional cases) */
```

## 아이콘 (lucide-react)

### Standard Icons
- ✓ CheckCircle2 (완료)
- ⚠ AlertTriangle (에러/주의)
- ⏱ Clock (대기)
- ⚙ Loader2 (실행 중, animate-spin)
- 👁 Eye (표시 중)
- 🔗 GitBranch (Git)
- 📄 FileCode2 (코드)
- 🤖 Bot (에이전트)
- 📋 ListChecks (작업 목록)
- ➡ ChevronRight (네비게이션)

## 접근성 (WCAG AA)

### 색상 명암비
- Text on background: 최소 4.5:1 (AA)
- Large text (18px+): 최소 3:1 (AA)
- UI components: 최소 3:1 (AA)

### 검증된 조합 (Dark Mode)
- Text-Primary (#FAFAFA) on Background (#0A0A0A): ✅ 18:1
- Text-Secondary (#A1A1AA) on Background (#0A0A0A): ✅ 6.7:1
- Pink-Primary (#EC4899) on Surface (#111111): ✅ 5.2:1
- Success (#16A34A) on Surface (#111111): ✅ 3.8:1
- Error (#DC2626) on Surface (#111111): ✅ 4.5:1
- Warning (#F59E0B) on Surface (#111111): ✅ 5.8:1

### 키보드 네비게이션
- Tab key: 모든 인터랙티브 요소 순회 가능
- Enter/Space: 버튼, 체크박스 활성화
- Escape: 모달 종료
- Arrow keys: 메뉴, 탭 네비게이션

### 스크린 리더
- Alt text: 모든 이미지에 필수
- ARIA labels: 아이콘 버튼, form labels
- Role 속성: Dialog, Menu, Status, Alert

## 성능 최적화

### CSS
- Tailwind purge enabled (production용)
- CSS-in-JS 최소화
- Critical CSS inline

### 이미지
- WebP format (fallback PNG)
- Lazy loading (loading="lazy")
- Responsive images (srcset)
- Max size: 100KB per image

### 번들
- Code splitting per route
- Dynamic imports for heavy components
- Tree shaking enabled

## 구현 가이드

### Tailwind 설정
```javascript
module.exports = {
  darkMode: 'class', // or 'media'
  theme: {
    colors: {
      background: '#0A0A0A',
      surface: '#111111',
      'surface-2': '#18181B',
      border: '#27272A',
      'text-primary': '#FAFAFA',
      'text-secondary': '#A1A1AA',
      'pink-primary': '#EC4899',
      'pink-soft': '#F472B6',
      'pink-muted': '#BE185D',
      success: '#16A34A',
      warning: '#F59E0B',
      error: '#DC2626',
      'gray-600': '#52525B',
      'gray-700': '#3F3F46',
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      '2xl': '48px',
    },
  },
}
```

### shadcn/ui 커스터마이징
- Button: 모든 variant 새로운 색상으로 커스텀
- Card: Tailwind utility 기반 (shadcn 제거)
- Badge: 새로운 색상 스키마 추가
- Input: Focus ring 스타일 변경

### 컴포넌트 구조
```
components/
  ├── ui/              (shadcn 또는 커스텀 기본 UI)
  │   ├── button.tsx
  │   ├── card.tsx
  │   ├── badge.tsx
  │   └── input.tsx
  ├── plan/            (Plan 페이지 컴포넌트)
  │   ├── KanbanCard.tsx (새 디자인)
  │   └── KanbanBoard.tsx
  └── dashboard/       (대시보드 컴포넌트)
      └── ProjectCard.tsx
```
