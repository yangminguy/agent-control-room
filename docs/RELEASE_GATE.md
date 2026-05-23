# Release Gate — Approval System for Dangerous Operations

## Overview

The Release Gate is a **scaffolding system** that prevents dangerous operations from executing without explicit user approval.

**Protected Operations:**
- Git operations (push, force push)
- Production deployments
- Database migrations
- Supabase production writes
- Sensitive file changes (.env, secrets, etc.)
- Telegram approval authority changes

## Design Philosophy

**"No silent execution of dangerous operations."**

- High/critical risk work must be reviewed before execution
- Users explicitly approve each dangerous operation
- System tracks approval history and reasons
- Dangerous operations can be rejected or expire

## Core Types

```typescript
export type ReleaseGateRequest = {
  id: string;
  taskId: string;
  riskLevel: "high" | "critical";
  operation: DangerousOperation;
  summary: string;
  changedFiles: string[];
  riskExplanation: string;
  rollbackPlan?: string;
  requiredChecks: string[];
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  expiresAt: string;
};
```

## API Reference

### Creating a Release Gate Request

```typescript
import { createReleaseGateRequest } from "@/lib/agents/release-gate";

const request = createReleaseGateRequest(
  "task-42", // taskId
  "git_push", // operation
  "high", // riskLevel
  {
    summary: "Push feature branch to main",
    changedFiles: ["src/components/Auth.tsx", "src/api/auth.ts"],
    riskExplanation: "Modifies core authentication logic. Risk: Breaking changes affecting all users.",
    rollbackPlan: "Revert commit 7d3e2c1 if issues detected",
    requiredChecks: [
      "typecheck passed",
      "tests passed",
      "code review approved",
      "no breaking API changes",
    ],
  }
);

// Returns:
// {
//   id: "rg-1234567890",
//   taskId: "task-42",
//   status: "pending", // Awaiting approval
//   expiresAt: "2026-05-24T...", // 24-hour expiry
//   ... rest of request data
// }
```

### Approving a Request

```typescript
import { approveReleaseGateRequest } from "@/lib/agents/release-gate";

const approved = approveReleaseGateRequest(
  "rg-1234567890",
  "user@example.com"
);

// Returns the updated request with:
// {
//   status: "approved",
//   approvedAt: "2026-05-23T...",
//   approvedBy: "user@example.com"
// }
```

### Rejecting a Request

```typescript
import { rejectReleaseGateRequest } from "@/lib/agents/release-gate";

const rejected = rejectReleaseGateRequest(
  "rg-1234567890",
  "Insufficient code review"
);

// Returns:
// {
//   status: "rejected",
//   rejectionReason: "Insufficient code review"
// }
```

### Checking Operation Dangerousness

```typescript
import {
  requiresReleaseGate,
  isDangerousFilePath,
  determineRiskLevel,
  buildRiskExplanation,
} from "@/lib/agents/release-gate";

// Check if operation requires gate
if (requiresReleaseGate("git_push")) {
  // Must create and approve release gate
}

// Check if file is sensitive
if (isDangerousFilePath(".env.production")) {
  // Mark as dangerous_file_change
}

// Determine risk level
const riskLevel = determineRiskLevel("git_force_push"); // "critical"

// Build explanation
const explanation = buildRiskExplanation(
  "production_deploy",
  ["src/api/payment.ts"]
); // "프로덕션 환경에 즉시 영향을 미칩니다."
```

### Getting Requests

```typescript
import {
  getReleaseGateRequest,
  getPendingReleaseGateRequests,
  getAllReleaseGateRequests,
} from "@/lib/agents/release-gate";

// Get specific request
const request = getReleaseGateRequest("rg-1234567890");

// Get pending (not yet approved/rejected)
const pending = getPendingReleaseGateRequests();

// Get all requests (for admin/audit)
const all = getAllReleaseGateRequests();
```

## Integration with Agent × Model Router

### High/Critical Risk Detection

```typescript
import { routeAgentAndModel } from "@/lib/agents/agent-model-router";

const decision = routeAgentAndModel(
  "deployment", // taskKind
  undefined,
  undefined,
  "critical" // riskLevel
);

// Returns:
// {
//   executionMode: "release_gate", // ← BLOCKED
//   requiresApproval: true,
//   riskNotes: ["Risk level: critical"]
// }
```

### Release Gate Required Checks

When creating a Release Gate request, the system automatically determines **required checks** based on operation type:

```typescript
import { buildRequiredChecks } from "@/lib/agents/release-gate";

// For git_push
buildRequiredChecks("git_push");
// → ["typecheck passed", "tests passed", "lint passed", "code review completed"]

// For production_deploy
buildRequiredChecks("production_deploy");
// → ["smoke tests passed", "staging deployment verified", "rollback plan confirmed", "oncall notified"]

// For db_migration
buildRequiredChecks("db_migration");
// → ["backup created", "migration tested on staging", "rollback script verified", "data loss risk assessed"]
```

## User-Facing Workflow

### PM View (Korean)

1. **Task submitted** with high/critical risk
2. **Release Gate prompt** appears:
   ```
   ⚠️ 고위험 작업 승인 필요

   작업: git 브랜치를 main에 푸시
   위험도: 높음
   변경 파일: src/components/Auth.tsx, src/api/auth.ts
   설명: 핵심 인증 로직을 수정합니다. 모든 사용자에게 영향을 미칠 수 있습니다.
   
   필수 확인 사항:
   ☑ 타입 체크 완료
   ☑ 테스트 통과
   ☑ 코드 리뷰 승인
   ☑ API 변경 없음

   롤백 계획:
   커밋 7d3e2c1 되돌리기 (문제 감지 시)

   [승인]  [거부]  [자세히 보기]
   ```

3. **User approves**: Task proceeds to execution
4. **User rejects**: Task marked as blocked, reason recorded
5. **Request expires**: After 24 hours if not actioned

### Dangerous Operations List

| Operation | Risk | Checks | Rollback |
|-----------|------|--------|----------|
| git_push | HIGH | Tests, review, typecheck, lint | Revert commit |
| git_force_push | CRITICAL | Team notified, backup, review | Force revert |
| production_deploy | CRITICAL | Smoke tests, staging OK, rollback plan, oncall | Deploy previous version |
| db_migration | CRITICAL | Backup, staging test, rollback script, risk assessment | Run rollback script |
| supabase_write | HIGH | Data valid, backup, schema compatible | Restore backup |
| telegram_approval_authority | CRITICAL | Token verified, whitelist, workflow documented | Disable bot |
| dangerous_file_change | HIGH | File review, impact assessment, alternative considered | Revert changes |

## Testing

All Release Gate functionality is tested:

```bash
npm test -- __tests__/multi-agent-multi-model-runtime.test.ts -t "Release Gate"
```

**Tests:**
- Create release gate request
- Approve request
- Reject request
- Identify dangerous operations
- Identify dangerous file paths
- Determine risk levels

## Future Enhancements

### Phase 1: Basic Scaffolding (CURRENT)
✅ Type definitions
✅ In-memory request storage
✅ Creation, approval, rejection APIs
✅ Auto-detection of dangerous operations
✅ Required checks generation

### Phase 2: Persistent Storage
- [ ] Save requests to control-room-runs.json
- [ ] Request audit log
- [ ] Approval history tracking
- [ ] Report generation

### Phase 3: Advanced Routing
- [ ] Integrate with orchestration decision engine
- [ ] Block dangerous operations in scheduler
- [ ] Automatic Release Gate creation from routing decision
- [ ] Required checks validation before approval

### Phase 4: User Interface
- [ ] Release Gate approval panel in workbench
- [ ] Pending requests list with details
- [ ] Approval/rejection UI
- [ ] Audit log viewer
- [ ] Risk explanation display

### Phase 5: Multi-Channel Approval
- [ ] Telegram approval bot (with durable state)
- [ ] Email approval links
- [ ] Slack integration (if team uses Slack)
- [ ] Browser notifications

## Safety Guarantees

1. **No Silent Execution**: All dangerous operations are blocked until approved
2. **Explicit Approval**: PM must explicitly approve each dangerous operation
3. **Audit Trail**: All approvals/rejections are logged with timestamp and user
4. **Expiry**: Requests expire after 24 hours (re-approval required)
5. **Type Safety**: All operations and statuses are TypeScript-defined
6. **Rollback Plans**: System encourages documenting rollback strategies

## Configuration

Release Gate is **enabled by default** for all installations.

Configuration is intentionally minimal — the system is conservative about what's dangerous.

To modify dangerous operations or required checks, edit `lib/agents/release-gate.ts`.

## FAQ

**Q: Can Release Gate be disabled?**
A: Not yet. It's a safety feature. Contact product team if you need different behavior.

**Q: What happens if a request expires?**
A: The operation cannot proceed. Re-approve the request or re-submit the task.

**Q: Can the same user approve their own dangerous operation?**
A: Yes, by design. In production, teams can implement peer review workflows.

**Q: What if all checks aren't passing?**
A: System will flag them, but user can still approve. UI should show status.

**Q: Can we make some operations non-dangerous?**
A: Yes, modify `requiresReleaseGate()` in `lib/agents/release-gate.ts`.

## See Also

- [Multi-Agent Multi-Model Runtime](./MULTI_AGENT_MULTI_MODEL_RUNTIME.md)
- [Agent × Model Router](./MULTI_AGENT_MULTI_MODEL_RUNTIME.md#3-agent--model-router)
- [ARCHITECTURE.md](./ARCHITECTURE.md)

