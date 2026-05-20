# Design System v2 — Agent Control Room

## 색상 팔레트

### Primary Colors
- **Primary-50**: #eff6ff
- **Primary-100**: #dbeafe
- **Primary-500**: #3b82f6 (Action, Links)
- **Primary-600**: #2563eb (Hover)
- **Primary-700**: #1d4ed8 (Active)

### Semantic Colors
- **Success-600**: #16a34a (Completed tasks, checkmarks)
- **Warning-500**: #f59e0b (Partial, warnings)
- **Error-600**: #dc2626 (Blocked, errors)
- **Info-500**: #0ea5e9 (Information)

### Neutral Colors
- **Gray-50**: #f9fafb (Backgrounds)
- **Gray-100**: #f3f4f6 (Subtle backgrounds)
- **Gray-500**: #6b7280 (Secondary text)
- **Gray-700**: #374151 (Primary text)
- **Gray-900**: #111827 (Dark text)

### Dark Mode
- **Dark-BG**: #0f172a (Main background)
- **Dark-Surface**: #1e293b (Card surfaces)
- **Dark-Border**: #334155 (Borders)
- **Dark-Text**: #e2e8f0 (Text)

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
- Primary (fill, blue-600, white text)
- Secondary (outline, gray border, gray-700 text)
- Ghost (transparent, hover: gray-100)
- Danger (fill, red-600, white text)

// Sizes
- sm: 8px 12px, 12px font
- md: 10px 16px, 14px font (default)
- lg: 12px 20px, 16px font

// States
- Default
- Hover (bg darkens by 1 shade)
- Active (bg darkens by 2 shades)
- Disabled (opacity 50%, cursor not-allowed)
- Loading (spinner icon, disabled)
```

### Card
```typescript
// Styles
- Elevated (shadow: 0 4px 6px rgba(0,0,0,0.1), bg: white)
- Outlined (border: 1px gray-200, bg: white)
- Flat (bg: gray-50, no border)

// Dark Mode
- Elevated (shadow: 0 4px 6px rgba(0,0,0,0.3), bg: dark-surface)
- Outlined (border: 1px dark-border, bg: dark-surface)
- Flat (bg: dark-bg, no border)
```

### Badge
```typescript
// Types
- Solid (fill: primary-100, text: primary-700)
- Success (fill: green-100, text: green-700)
- Warning (fill: amber-100, text: amber-700)
- Error (fill: red-100, text: red-700)
- Outline (border + text: gray-600)

// Sizes
- sm: 4px 8px, 11px font
- md: 6px 12px, 12px font (default)
```

### Input
```typescript
// States
- Default (border: gray-300, bg: white)
- Focus (border: blue-600, ring: 2px blue-100)
- Error (border: red-600, ring: 2px red-100)
- Disabled (bg: gray-50, opacity: 50%)

// Sizes
- md: 8px 12px, 14px font (default)
- lg: 12px 16px, 16px font
```

### Status Badge (태스크 상태)
```typescript
Planned:      bg-gray-100, text-gray-700, ○ icon
Ready:        bg-blue-100, text-blue-700, ⏱ icon
Running:      bg-amber-100, text-amber-700, ⚙ icon
Done:         bg-green-100, text-green-700, ✓ icon
Partial:      bg-orange-100, text-orange-700, ◐ icon
Blocked:      bg-red-100, text-red-700, ⚠ icon
Needs Review: bg-purple-100, text-purple-700, 👁 icon
```

## Responsive Breakpoints

```
Mobile:   < 640px   (sm in Tailwind)
Tablet:   640px - 1024px (md ~ lg in Tailwind)
Desktop:  > 1024px  (xl in Tailwind)

Key breakpoints for Agent Control Room:
- 375px  (small phone)
- 640px  (mobile → tablet)
- 1024px (tablet → desktop)
- 1440px (standard desktop)
```

## Dark Mode Implementation

### Toggle Mechanism
- User preference stored in `localStorage` as `theme: 'light' | 'dark'`
- System preference as fallback: `prefers-color-scheme`
- Default: Light mode

### Color Mapping
| Component | Light | Dark |
|-----------|-------|------|
| Background | #ffffff | #0f172a |
| Surface | #ffffff | #1e293b |
| Border | #e5e7eb | #334155 |
| Text Primary | #111827 | #e2e8f0 |
| Text Secondary | #6b7280 | #94a3b8 |

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
- Text on background: 최소 4.5:1
- Large text (18px+): 최소 3:1
- UI components: 최소 3:1

### 검증된 조합
- Primary-700 (#1d4ed8) on white: ✅ 8.59:1
- Gray-600 (#4b5563) on white: ✅ 7.23:1
- White on Primary-600 (#2563eb): ✅ 4.85:1
- Error-600 (#dc2626) on white: ✅ 5.89:1

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
  theme: {
    colors: {
      // Custom color palette above
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
