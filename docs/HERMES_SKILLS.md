# HERMES_SKILLS.md — Hermes Skills and Tools

## Overview

Hermes는 Agent Control Room 운영을 위한 전문 스킬을 사용한다.

모든 스킬은 Hermes의 approval-based 실행 정책을 따른다.

---

## Core Skills

### 1. failure-log-analyzer

**목적**: 실패 로그를 분석하고 원인을 추정한다.

**입력**:
```json
{
  "phase_id": "phase-15",
  "agent": "Claude Code",
  "command": "pnpm build",
  "stderr": "Type error in components/roadmap/...",
  "stdout": "... compilation failed ...",
  "exit_code": 1
}
```

**출력**:
```json
{
  "failure_type": "typecheck",
  "severity": "medium",
  "root_cause": "Property 'roadmapStages' missing in RoadmapTimelineProps",
  "affected_files": [
    "components/roadmap/RoadmapTimeline.tsx",
    "lib/roadmap-ui-adapter.ts"
  ],
  "suggested_fixes": [
    {
      "priority": 1,
      "agent": "Codex",
      "action": "isolated type fix",
      "time_estimate": "5 min"
    },
    {
      "priority": 2,
      "agent": "Claude Code",
      "action": "full props refactor",
      "time_estimate": "30 min"
    }
  ],
  "pattern_match": "typecheck-failures.md",
  "obsidian_note": "AgentControlRoom/FailurePatterns/2026-05-22-typecheck.md"
}
```

---

### 2. orchestration-packet-writer

**목적**: Agent Control Room에 반환할 Orchestration Packet을 생성한다.

**입력**:
```json
{
  "phase_id": "phase-15",
  "phase_title": "Hermes Integration",
  "status": "completed",
  "source_agent": "Claude Code",
  "task_summary": "Added 12 Hermes policy documents",
  "changed_files": [
    "docs/HERMES_BACKGROUND_WORKER.md",
    "..."
  ]
}
```

**출력**: [[docs/ORCHESTRATION_PACKET.md]] 구조

---

### 3. phase-completion-reporter

**목적**: Phase 완료를 정리하고 보고한다.

**입력**:
```json
{
  "phase_id": "phase-15",
  "completion_type": "success",
  "test_results": { "pass": 8, "fail": 0 },
  "build_status": "success"
}
```

**출력**:
```md
[Hermes Phase Complete] ✅

🎉 완료: Phase 15 - Hermes Integration
👤 담당: Claude Code
📊 통계: ...
```

---

### 4. obsidian-insight-writer

**목적**: Obsidian 메모리에 인사이트를 저장한다.

**입력**:
```json
{
  "note_type": "failure_pattern",
  "pattern_name": "typecheck-failures",
  "occurrences": 3,
  "root_cause": "Props definition mismatch",
  "recommendation": "Props validation checklist"
}
```

**출력**:
```md
# Typecheck Failure Patterns

## Summary
총 3회 발생, 모두 동일한 원인

## Prevention
...
```

---

### 5. telegram-approval-requester

**목적**: 위험 작업에 대한 사용자 승인을 Telegram으로 요청한다.

**입력**:
```json
{
  "operation": "git push origin hermes-worker",
  "risk_level": "high",
  "details": {
    "commits": 3,
    "files": 12,
    "test_status": "pass"
  },
  "timeout_seconds": 600
}
```

**출력**:
```md
[Hermes Approval Request]

⚠️ 위험도: HIGH
...
```

**응답**:
```json
{
  "response": "approve",
  "timestamp": "2026-05-22T16:46:00Z",
  "user_id": "..."
}
```

---

### 6. git-operation-guard

**목적**: Git 작업의 위험도를 분류한다.

**입력**:
```json
{
  "command": "git push origin hermes-worker",
  "current_branch": "hermes-worker",
  "commits_ahead": 3
}
```

**출력**:
```json
{
  "risk_level": "high",
  "reason": "Remote repository will be modified",
  "required_approval": true,
  "approval_channel": "telegram",
  "safety_checks": [
    { "check": "working directory clean", "status": "pass" },
    { "check": "commits are safe", "status": "pass" },
    { "check": "no force push", "status": "pass" }
  ]
}
```

---

### 7. deployment-status-reporter

**목적**: 배포 상태를 확인하고 보고한다.

**입력**:
```json
{
  "operation": "vercel deploy --prod",
  "phase": "pre-deployment"
}
```

**출력**:
```json
{
  "status": "ready",
  "checks": {
    "typecheck": "pass",
    "lint": "pass",
    "test": "pass",
    "build": "pass"
  },
  "preview_url": "https://...",
  "next_step": "approval_required"
}
```

---

### 8. agent-result-summarizer

**목적**: 에이전트 작업 결과를 요약한다.

**입력**:
```json
{
  "agent": "Claude Code",
  "phase": "phase-15",
  "duration": "2.5 days",
  "commits": 15,
  "files_changed": 12
}
```

**출력**:
```md
## Claude Code Performance

- 완료도: 100%
- 소요 시간: 2.5일
- 커밋: 15개
- 문제: RoadmapTimeline props (해결됨)
```

---

## Skill Integration

### Skill Call Flow

```
Hermes 작업 시작
  ├─ 1. failure-log-analyzer (실패 시)
  │   └─ 원인 분석
  │
  ├─ 2. git-operation-guard (Git 작업 전)
  │   └─ 위험도 판정
  │
  ├─ 3. telegram-approval-requester (고위험도)
  │   └─ 승인 요청
  │
  ├─ 4. deployment-status-reporter (배포 전)
  │   └─ 배포 준비 확인
  │
  ├─ 5. phase-completion-reporter (Phase 완료)
  │   └─ 완료 보고서 생성
  │
  ├─ 6. orchestration-packet-writer (결과 반환)
  │   └─ Packet 생성
  │
  ├─ 7. obsidian-insight-writer (학습)
  │   └─ 메모리 저장
  │
  └─ 8. agent-result-summarizer (정산)
      └─ 결과 요약
```

---

## Skill Dependencies

```json
{
  "failure-log-analyzer": {
    "dependencies": ["obsidian-insight-writer"],
    "timeout_seconds": 30,
    "retry_count": 1
  },
  "orchestration-packet-writer": {
    "dependencies": ["git-operation-guard"],
    "timeout_seconds": 20,
    "retry_count": 0
  },
  "telegram-approval-requester": {
    "dependencies": [],
    "timeout_seconds": 600,
    "retry_count": 0
  },
  "deployment-status-reporter": {
    "dependencies": ["git-operation-guard"],
    "timeout_seconds": 60,
    "retry_count": 1
  }
}
```

---

## Skill Failure Handling

### Failure Types

| 실패 유형 | 처리 | 재시도 |
|---|---|---|
| Timeout | Agent Control Room 반환 | 1회 후 중단 |
| Logic error | 상세 오류 로그 + 보고 | 0회 (중단) |
| External API error | Fallback 로직 사용 | 3회 |

### Example: Fallback Logic

```json
{
  "skill": "telegram-approval-requester",
  "failure": "Telegram API timeout",
  "fallback": {
    "method": "local_store",
    "message": "Approval request queued locally",
    "retry_when": "telegram_available"
  }
}
```

---

## Custom Skill Development

### Skill Template

```python
# ~/.hermes/skills/agent-control-room/[skill-name]/skill.py

class HermesSkill:
    def __init__(self, name: str):
        self.name = name
    
    def execute(self, input_data: dict) -> dict:
        """Execute the skill"""
        # 입력 검증
        self.validate_input(input_data)
        
        # 주요 로직
        result = self.process(input_data)
        
        # 결과 저장 (Obsidian)
        self.save_to_obsidian(result)
        
        return result
    
    def validate_input(self, input_data: dict):
        """입력 데이터 검증"""
        pass
    
    def process(self, input_data: dict) -> dict:
        """주요 로직"""
        pass
    
    def save_to_obsidian(self, result: dict):
        """결과를 Obsidian에 저장"""
        pass
```

---

## Skill Usage Examples

### Example 1: Build Failure Analysis

```bash
hermes-skill failure-log-analyzer \
  --phase phase-15 \
  --agent claude-code \
  --command "pnpm build" \
  --stderr "Type error in..."
```

### Example 2: Approval Request

```bash
hermes-skill telegram-approval-requester \
  --operation "git push origin hermes-worker" \
  --risk-level high \
  --details "{commits: 3}"
```

---

## See Also

- [[docs/HERMES_BACKGROUND_WORKER.md]]
- [[docs/HERMES_TERMINAL_POLICY.md]]
- [[docs/HERMES_OBSIDIAN_MEMORY_LOOP.md]]
