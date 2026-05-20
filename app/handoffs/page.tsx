import { getHandoffs } from "@/lib/storage/json-store";
import { HandoffPreview } from "@/components/handoffs/HandoffPreview";

export default async function HandoffsPage() {
  const handoffs = await getHandoffs();

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Handoffs</h1>
        <p className="text-gray-500 mt-1">Manage and copy handoff documents between agents.</p>
      </div>

      {handoffs.length === 0 ? (
        <div className="text-center p-12 border rounded-lg bg-gray-50">
          <p className="text-gray-500">No handoffs generated yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {handoffs.map(handoff => (
            <div key={handoff.id} className="space-y-2">
              <div className="flex justify-between items-end mb-2">
                <h3 className="font-semibold text-lg">
                  Task ID: {handoff.taskId}
                </h3>
                <span className="text-sm text-gray-500">
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
