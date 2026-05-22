# ORCHESTRATION_PACKET.md — Orchestration Packet Structure

## Overview

**Orchestration Packet**은 Hermes가 Agent Control Room에 반환하는 구조화된 결과 문서다.

Phase가 완료되었거나, 차단되었거나, 재시도가 필요할 때 생성된다.

---

## Complete Packet Example

```json
{
  "packet_id": "orch-2026-05-22-001",
  "packet_type": "orchestration_packet",
  "created_at": "2026-05-22T16:45:00Z",
  "version": "1.0",
  
  "source": "hermes",
  "source_model": "gemini-2.0-pro",
  "model_confidence": 0.94,
  
  "phase": {
    "id": "phase-15",
    "title": "Hermes Integration",
    "start_time": "2026-05-20T10:00:00Z",
    "actual_completion_time": "2026-05-22T16:45:00Z",
    "duration_hours": 54.75
  },
  
  "status": "completed",
  "status_details": {
    "overall": "successful",
    "acceptance_criteria_met": 11,
    "acceptance_criteria_total": 11,
    "acceptance_criteria_percentage": 100
  },
  
  "assigned_agent": "Claude Code",
  "assigned_agent_status": "available",
  
  "task_summary": "Create Hermes approval-based execution worker policy and documentation",
  
  "result_summary": "Successfully created 12 policy documents (8,500+ lines) defining Hermes as an approval-based execution worker with Telegram integration, operational automation, and Obsidian memory system.",
  
  "changed_files": {
    "new": [
      "docs/HERMES_BACKGROUND_WORKER.md",
      "docs/HERMES_TERMINAL_POLICY.md",
      "docs/HERMES_GIT_POLICY.md",
      "docs/HERMES_DEPLOYMENT_POLICY.md",
      "docs/HERMES_AUTOMATION_POLICY.md",
      "docs/HERMES_TELEGRAM_APPROVAL.md",
      "docs/HERMES_OBSIDIAN_MEMORY_LOOP.md",
      "docs/HERMES_SKILLS.md",
      "docs/HERMES_MODEL_PROVIDER.md",
      "docs/ORCHESTRATION_PACKET.md",
      "docs/PHASE_COMPLETION_PACKET.md"
    ],
    "modified": [
      {
        "file": "AGENTS.md",
        "lines_added": 50,
        "lines_removed": 0,
        "change_type": "enhancement"
      }
    ],
    "deleted": [],
    "total_files_changed": 12,
    "total_lines_added": 8547,
    "total_lines_removed": 0
  },
  
  "verification": {
    "typecheck": {
      "status": "pass",
      "timestamp": "2026-05-22T16:30:00Z",
      "details": "No type errors"
    },
    "lint": {
      "status": "pass",
      "timestamp": "2026-05-22T16:31:00Z",
      "errors": 0,
      "warnings": 0
    },
    "tests": {
      "status": "pass",
      "timestamp": "2026-05-22T16:32:00Z",
      "total": 8,
      "passed": 8,
      "failed": 0,
      "skipped": 0
    },
    "build": {
      "status": "pass",
      "timestamp": "2026-05-22T16:33:00Z",
      "build_time_seconds": 2.3
    }
  },
  
  "failure_summary": null,
  "suspected_cause": null,
  "error_logs": null,
  
  "issues_encountered": [
    {
      "severity": "low",
      "description": "RoadmapTimeline props type mismatch during initial implementation",
      "resolution": "Codex QA caught and fixed within 5 minutes",
      "prevention": "Include props validation checklist in next phase"
    }
  ],
  
  "risk_assessment": {
    "conflict_risk": "low",
    "regression_risk": "low",
    "production_impact": "minimal",
    "rollback_needed": false
  },
  
  "suggestions": {
    "suggested_next_agent": {
      "type": "Codex",
      "reason": "QA verification of all new Hermes documentation",
      "task": "Run typecheck, lint, and test suite on Phase 15 changes",
      "estimated_time_minutes": 30
    },
    "next_phase_recommendation": "Phase 16 - Hermes Skills Implementation",
    "next_phase_description": "Implement Hermes skills for failure analysis, packet generation, Obsidian integration, and Telegram approval workflow"
  },
  
  "do_not_touch_files": [
    "runner/",
    "lib/approval-token-store.ts",
    "package.json",
    "tsconfig.json",
    "next.config.js",
    "app/api/*/route.ts (unless specific Hermes API additions)"
  ],
  
  "required_context": [
    "Hermes approval-based execution policy",
    "Telegram integration workflow",
    "Obsidian memory system structure",
    "Phase completion criteria",
    "Agent scheduling policies",
    "Risk classification matrix"
  ],
  
  "deployment_readiness": {
    "ready_for_preview": true,
    "ready_for_production": true,
    "preview_url": "https://agent-control-room-abc123.vercel.app",
    "preview_validation_status": "pass",
    "production_notes": "Can be deployed immediately if approved"
  },
  
  "agent_availability": {
    "Claude Code": {
      "status": "available",
      "next_availability": "immediately",
      "estimated_token_usage": "45%"
    },
    "Codex": {
      "status": "available",
      "next_availability": "immediately",
      "estimated_token_usage": "30%"
    },
    "Antigravity": {
      "status": "idle",
      "next_availability": "available"
    },
    "Hermes": {
      "status": "operational",
      "next_availability": "immediately"
    }
  },
  
  "suggested_prompt": "Review and QA all Hermes integration documentation. Verify that: 1) Terminal, Git, Deployment policies are clear and comprehensive; 2) Approval boundaries are well-defined; 3) Telegram workflow is properly documented; 4) Obsidian memory structure supports future learning; 5) All cross-references and links are accurate.",
  
  "context_pack_generated": true,
  "context_pack_location": "docs/CONTEXT_PACK_PHASE_15.md",
  
  "handoff_suggested": false,
  "handoff_reason": null,
  
  "user_approval_needed": false,
  "user_approval_reason": null,
  
  "telegram_notification_sent": true,
  "telegram_notification_time": "2026-05-22T16:45:30Z",
  
  "obsidian_notes": {
    "phase_completion": "AgentControlRoom/Phases/phase-15-hermes-integration.md",
    "failure_patterns": null,
    "success_patterns": "AgentControlRoom/PromptPatterns/successful-hermes-prompts.md",
    "daily_summary": "AgentControlRoom/Daily/2026-05-22.md"
  },
  
  "metrics": {
    "phase_completion_percentage": 100,
    "quality_score": 0.95,
    "agent_efficiency": 0.92,
    "regression_risk_score": 0.05,
    "documentation_completeness": 0.98
  },
  
  "next_actions": [
    "1. Agent Control Room reviews this packet",
    "2. Codex performs QA on Phase 15 changes",
    "3. If approved, Phase 16 begins (Hermes Skills Implementation)",
    "4. Hermes monitors Phase 16 progress",
    "5. Obsidian memory updated with patterns and lessons learned"
  ],
  
  "packet_validity": {
    "created_by": "hermes",
    "valid_until": "2026-05-29T16:45:00Z",
    "requires_review_by": "Agent Control Room",
    "signature": "hermes-orch-packet-phase-15-complete"
  }
}
```

---

## Field Descriptions

### Header Fields

| 필드 | 설명 | 예시 |
|---|---|---|
| `packet_id` | 고유 패킷 ID | `orch-2026-05-22-001` |
| `packet_type` | 패킷 유형 | `orchestration_packet` |
| `created_at` | 생성 시간 | ISO 8601 timestamp |
| `version` | 스키마 버전 | `1.0` |

### Phase Information

```json
"phase": {
  "id": "phase-15",
  "title": "Hermes Integration",
  "start_time": "2026-05-20T10:00:00Z",
  "actual_completion_time": "2026-05-22T16:45:00Z",
  "duration_hours": 54.75
}
```

### Status Types

```json
"status": "completed" | "failed" | "blocked" | "partial" | "needs_approval"
```

| 상태 | 의미 | 다음 단계 |
|---|---|---|
| `completed` | Phase 완료 | 다음 Phase 시작 또는 QA |
| `failed` | Phase 실패 | 재시도 또는 대안 검토 |
| `blocked` | Phase 차단됨 | 차단 원인 해결 필요 |
| `partial` | 부분 완료 | 나머지 작업 계획 |
| `needs_approval` | 승인 대기 | 사용자/Control Room 승인 필요 |

### Verification Status

```json
"verification": {
  "typecheck": { "status": "pass | fail", ... },
  "lint": { "status": "pass | fail", ... },
  "tests": { "status": "pass | fail", ... },
  "build": { "status": "pass | fail", ... }
}
```

---

## Minimal Packet (실패 시)

실패한 Phase도 Packet을 생성한다:

```json
{
  "packet_id": "orch-2026-05-22-fail-001",
  "status": "failed",
  "phase": {
    "id": "phase-16",
    "title": "Hermes Skills Implementation"
  },
  "assigned_agent": "Claude Code",
  "failure_summary": "Type error in hermes-skill base class",
  "suspected_cause": "Missing import statement in lib/hermes/skills/base.ts",
  "error_logs": "Property 'execute' is missing in type...",
  "issues_encountered": [
    {
      "severity": "high",
      "description": "Base class implementation incomplete",
      "resolution": "Needs Claude Code review and completion"
    }
  ],
  "suggested_next_agent": {
    "type": "Claude Code",
    "reason": "Fix base class implementation",
    "estimated_time_minutes": 20
  },
  "user_approval_needed": false,
  "telegram_notification_sent": true,
  "obsidian_notes": {
    "failure_patterns": "AgentControlRoom/FailurePatterns/phase-16-type-error.md"
  }
}
```

---

## Packet Storage

### 저장 위치

```
docs/orchestration-packets/
  2026-05-22-001-phase-15-complete.json
  2026-05-22-002-phase-16-failed.json
  archive/
    2026-05-21-*.json
```

### Obsidian 동기화

```bash
Orchestration Packet (JSON)
  └─ Obsidian (Markdown)
      ├─ Daily/2026-05-22.md
      ├─ Phases/phase-15.md
      └─ FailurePatterns/*.md (if failed)
```

---

## Packet Validation

### 필수 필드

```json
{
  "packet_id": required,
  "packet_type": required,
  "created_at": required,
  "status": required,
  "phase": required,
  "assigned_agent": required,
  "changed_files": required (if completed)
}
```

### 선택적 필드

```json
{
  "failure_summary": optional,
  "suggested_next_agent": optional,
  "context_pack_generated": optional
}
```

---

## See Also

- [[docs/PHASE_COMPLETION_PACKET.md]]
- [[docs/HERMES_BACKGROUND_WORKER.md]]
- [[docs/HERMES_OBSIDIAN_MEMORY_LOOP.md]]
