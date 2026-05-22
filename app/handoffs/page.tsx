import { getHandoffs } from "@/lib/storage/json-store";
import { HandoffPreview } from "@/components/handoffs/HandoffPreview";

export default async function HandoffsPage() {
  const handoffs = await getHandoffs();

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-fade-in">
      <div className="border-b border-border/50 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Handoffs</h1>
        <p className="text-text-secondary mt-2">Manage and copy handoff documents between agents.</p>
      </div>

      {handoffs.length === 0 ? (
        <div className="text-center p-12 border border-border rounded-xl bg-surface-2">
          <p className="text-text-secondary">No handoffs generated yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {handoffs.map(handoff => (
            <div key={handoff.id} className="space-y-4 bg-surface-2 p-6 rounded-xl border border-border">
              <div className="flex justify-between items-end mb-2 pb-4 border-b border-border/50">
                <h3 className="font-bold text-lg text-text-primary">
                  Task ID: {handoff.taskId}
                </h3>
                <span className="text-sm font-medium text-text-tertiary">
                  {new Date(handoff.createdAt).toLocaleString()}
                </span>
              </div>
              <HandoffPreview handoff={handoff} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
