import { OrchestrationProvider } from "@/lib/dispatch/orchestration-context";
import { OrchestrationPageLayout } from "@/components/orchestration/OrchestrationPageLayout";

export default function OrchestrationPage() {
  return (
    <OrchestrationProvider>
      <OrchestrationPageLayout />
    </OrchestrationProvider>
  );
}
