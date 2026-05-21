import type { Metadata } from "next";
import { getRoadmap } from "@/lib/storage/roadmap-store";
import { getActiveRoadmapStage } from "@/lib/roadmap";
import { ContextPackBuilder } from "@/components/hermes/ContextPackBuilder";
import { HandoffPackBuilder } from "@/components/hermes/HandoffPackBuilder";
import { PackTabs } from "@/components/hermes/PackTabs";

export const metadata: Metadata = {
  title: "Context Pack & Handoff — Agent Control Room",
};

export const dynamic = "force-dynamic";

export default async function ContextPackPage() {
  const roadmap = await getRoadmap("agent-control-room");
  const currentStage = roadmap ? getActiveRoadmapStage(roadmap) : undefined;

  const projectName = "Agent Control Room";
  const currentPhase = currentStage?.title ?? "Unknown Phase";

  const completedWork = currentStage
    ? (currentStage.tasks ?? [])
        .filter((t) => t.status === "done")
        .map((t) => t.title)
    : [];

  const blockers =
    currentStage?.blockers?.map((b) =>
      typeof b === "string" ? b : b.title ?? String(b),
    ) ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
            Context Pack & Handoff
          </h1>
          <p className="mt-2 text-base text-text-secondary max-w-2xl">
            토큰 한계 또는 에이전트 전환 시 현재 상태를 다음 에이전트에
            인수인계하세요. 생성된 마크다운을 복사해서 사용합니다.
          </p>
        </header>

        <PackTabs
          contextPackSlot={
            <ContextPackBuilder
              projectName={projectName}
              currentPhase={currentPhase}
              defaultContext={{ completedWork, blockers }}
            />
          }
          handoffPackSlot={
            <HandoffPackBuilder projectName={projectName} />
          }
        />
      </div>
    </div>
  );
}
