# T028 — High-Fidelity UI Implementation (Plan)

## 요약
디자인 시스템(docs/DESIGN_SYSTEM.md)과 UX 리서치(docs/UX_RESEARCH.md) 결과를 바탕으로 모든 UI 컴포넌트를 리팩토링합니다.

## 변경 범위

### 대상 파일

```
components/
├── plan/
│   ├── KanbanCard.tsx        → Compact mode + new colors
│   ├── KanbanBoard.tsx       → Dark mode + grid improvements
│   └── KanbanCardCompact.tsx → New component (v2)
├── dashboard/
│   ├── ProjectCard.tsx       → New styling + quick actions
│   └── DashboardGrid.tsx     → Recent projects section
└── ui/
    ├── Badge.tsx            → New color system
    └── Button.tsx           → Design system variants
```

## 핵심 변경사항

### 1. 색상 시스템 (전사)
```typescript
// Before: Tailwind defaults
bg-blue-100, bg-blue-600, text-blue-700

// After: Design System (docs/DESIGN_SYSTEM.md)
bg-[#dbeafe], bg-[#2563eb], text-[#1d4ed8]
→ More consistent, tested for WCAG AA
```

### 2. KanbanCard 개선
```typescript
// Compact mode (default)
// Shows: Title | Status | Agent | [Details button]
// Hide: Prompt, diff, logs (accessible via Details panel)

// Expanded mode (click Details)
// Side panel shows full information
```

### 3. 반응형 디자인
```
Mobile (< 640px):
  - Single column Kanban
  - Full-width cards
  - Bottom sheet for details

Tablet (640px - 1024px):
  - Two column layout
  - Compact cards + side details

Desktop (> 1024px):
  - Full Kanban board (4 columns)
  - Persistent side panel
```

### 4. Dark Mode
```typescript
// Implemented in CSS with CSS variables
:root { --bg: white; --text: #111; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #0f172a; --text: #e2e8f0; }
}
```

## 구현 체크리스트

### Phase 1: 색상 시스템 (1일)
- [ ] tailwind.config.js 색상 값 업데이트
- [ ] CSS variables for dark mode 추가
- [ ] All components color props 확인

### Phase 2: KanbanCard (1.5일)
- [ ] Compact mode 구현 (title + status + agent)
- [ ] Details panel 구현 (side drawer)
- [ ] Sub-agent tracks 시각화
- [ ] Dark mode 테스트

### Phase 3: Dashboard/Pages (1.5일)
- [ ] Dashboard 새 레이아웃 (recent projects)
- [ ] ProjectCard 스타일링
- [ ] Responsive grid 구현

### Phase 4: 접근성 + 성능 (1일)
- [ ] axe DevTools 점수 90+
- [ ] Lighthouse 성능 측정
- [ ] Mobile 키보드 네비게이션

## 성공 기준

```
Design System:
  ✓ 모든 색상 WCAG AA 명암비 충족
  ✓ Typography 일관성
  ✓ Spacing 시스템 적용됨

Responsive:
  ✓ 375px, 640px, 1024px, 1440px 모두 테스트됨
  ✓ 모바일에서 모든 주요 기능 접근 가능

Performance:
  ✓ LCP < 2.5s
  ✓ FID < 100ms
  ✓ CLS < 0.1

Accessibility:
  ✓ WCAG AA 통과 (axe DevTools 90+)
  ✓ 키보드 네비게이션 가능
  ✓ 스크린 리더 호환

Dark Mode:
  ✓ Light ↔ Dark 전환 매끄러움
  ✓ 모든 색상 다크 모드에서 검증됨
```

## 구현 시 주의사항

1. **Backwards Compatibility**: 기존 prop structure 유지
2. **테스트**: 각 컴포넌트 manual 테스트 후 commit
3. **Dark Mode**: prefers-color-scheme media query 활용
4. **성능**: 번들 크기 모니터링 (Tailwind purge enabled)

## 다음 단계

T028 완료 후:
- Phase 7 완료 (T026+T027+T028)
- Phase 8 (QA 자동화) 시작
