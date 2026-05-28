/**
 * Phase 18 — /api/clarify-reply integration test
 *
 * Verifies:
 *   1. Body validation (l5_task_id, questions[]/answers[] lengths match)
 *   2. 404 when no CTOTaskMetadata matches l5_task_id
 *   3. Successful append writes clarificationAnswers to PlanTask
 *   4. L5_SHARED_SECRET enforcement when configured
 */
import os from "os";
import path from "path";
import { promises as fs } from "fs";

const tmpDir = path.join(os.tmpdir(), `acr-clarify-reply-${Date.now()}`);

beforeAll(async () => {
  await fs.mkdir(tmpDir, { recursive: true });
  process.env.FEATURE_PLANS_DATA_DIR = tmpDir;
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  delete process.env.L5_SHARED_SECRET;
});

beforeEach(() => {
  jest.resetModules();
  delete (globalThis as Record<string, unknown>).__featurePlanMemoryStore;
  delete (globalThis as Record<string, unknown>).__ctoTaskMetaStore;
  delete process.env.L5_SHARED_SECRET;
});

async function seedPlanAndMeta(l5_task_id: string) {
  const { addFeaturePlan } = await import("@/lib/storage/feature-plan-store");
  const { saveCTOTaskMetadata } = await import("@/lib/storage/cto-task-metadata-store");
  const now = new Date().toISOString();
  const plan = await addFeaturePlan({
    projectId: "p-1",
    title: "Test plan",
    userGoal: "Build X",
    status: "planned",
    tasks: [
      {
        id: "task-001",
        planId: "",
        title: "Implement",
        description: "Do the thing",
        status: "planned",
        assignedAgent: "claude-code",
        priority: "P1",
        acceptanceCriteria: [],
        subAgentTracks: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
  } as any);
  await saveCTOTaskMetadata({
    planId: plan.id,
    taskId: "task-001",
    l5_task_id,
    auto_execute: true,
    release_gate_type: "none",
    risk_level: "D2",
    runtime: "claude",
    createdAt: now,
  });
  return plan.id;
}

test("400 when l5_task_id missing", async () => {
  const { POST } = await import("@/app/api/clarify-reply/route");
  const req = new Request("http://localhost:3001/api/clarify-reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions: [], answers: [] }),
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
});

test("400 when questions and answers length mismatch", async () => {
  const { POST } = await import("@/app/api/clarify-reply/route");
  const req = new Request("http://localhost:3001/api/clarify-reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      l5_task_id: "l5-xx",
      questions: ["q1", "q2"],
      answers: ["a1"],
    }),
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
});

test("404 when l5_task_id has no CTOTaskMetadata", async () => {
  const { POST } = await import("@/app/api/clarify-reply/route");
  const req = new Request("http://localhost:3001/api/clarify-reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      l5_task_id: "ghost",
      questions: ["q"],
      answers: ["a"],
    }),
  });
  const res = await POST(req);
  expect(res.status).toBe(404);
});

test("appends clarificationAnswers to PlanTask", async () => {
  const planId = await seedPlanAndMeta("l5-task-cl-1");
  const { POST } = await import("@/app/api/clarify-reply/route");
  const { getFeaturePlanById } = await import("@/lib/storage/feature-plan-store");

  const req = new Request("http://localhost:3001/api/clarify-reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      l5_task_id: "l5-task-cl-1",
      questions: ["Use bcrypt or argon2?", "Send email?"],
      answers: ["argon2", "yes"],
    }),
  });
  const res = await POST(req);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.success).toBe(true);
  expect(json.appended).toBe(2);

  const plan = await getFeaturePlanById(planId);
  const task = plan!.tasks.find((t) => t.id === "task-001");
  expect(task?.clarificationAnswers).toHaveLength(2);
  expect(task!.clarificationAnswers![0]).toMatchObject({
    question: "Use bcrypt or argon2?",
    answer: "argon2",
  });
  expect(task!.clarificationAnswers![0].answeredAt).toMatch(/T/);
});

test("rejects request when L5_SHARED_SECRET is set and header is wrong", async () => {
  await seedPlanAndMeta("l5-task-cl-2");
  process.env.L5_SHARED_SECRET = "secret-abc";
  const { POST } = await import("@/app/api/clarify-reply/route");

  const req = new Request("http://localhost:3001/api/clarify-reply", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-l5-shared-secret": "wrong" },
    body: JSON.stringify({
      l5_task_id: "l5-task-cl-2",
      questions: ["q"],
      answers: ["a"],
    }),
  });
  const res = await POST(req);
  expect(res.status).toBe(401);
});

test("accepts request when L5_SHARED_SECRET header matches", async () => {
  await seedPlanAndMeta("l5-task-cl-3");
  process.env.L5_SHARED_SECRET = "secret-xyz";
  const { POST } = await import("@/app/api/clarify-reply/route");

  const req = new Request("http://localhost:3001/api/clarify-reply", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-l5-shared-secret": "secret-xyz" },
    body: JSON.stringify({
      l5_task_id: "l5-task-cl-3",
      questions: ["q"],
      answers: ["a"],
    }),
  });
  const res = await POST(req);
  expect(res.status).toBe(200);
});
