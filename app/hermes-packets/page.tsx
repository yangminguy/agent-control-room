import { ShieldAlert, Info } from "lucide-react";
import packetData from "../../data/hermes-task-packets.json";
import { MonitorPacket } from "../../lib/monitor/types";
import { PacketDraftCard } from "../../components/hermes/PacketDraftCard";

export const metadata = {
  title: "Hermes Packet Drafts | Agent Control Room",
  description: "Prepare background-worker task packets without executing Hermes",
};

export default function MonitorPacketsPage() {
  const packets = packetData.examples as MonitorPacket[];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">Hermes Packet Drafts</h1>
          <p className="mt-3 text-lg text-text-secondary max-w-2xl">
            Prepare background-worker task packets without executing Hermes.
          </p>
        </div>

        {/* Safety Notice */}
        <div className="mb-10 bg-amber-500/5 border border-amber-500/20 p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start gap-4">
          <div className="bg-amber-500/10 p-2.5 rounded-full flex-shrink-0 mt-0.5">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-amber-500 font-bold text-lg">Safety Notice</h3>
            <p className="text-amber-500/80 mt-1.5 leading-relaxed text-base">
              This page only generates packet drafts. <strong className="font-semibold text-amber-500">Hermes is not executed.</strong> You can safely review and copy these outputs to use in your manual workflows or pass them to an active agent workspace.
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-8 flex items-center gap-3 px-5 py-4 bg-surface-2 shadow-sm text-text-secondary rounded-xl border border-border">
          <Info className="w-5 h-5 text-pink-primary flex-shrink-0" />
          <p className="text-sm font-medium">Select the <span className="font-semibold text-text-primary">Markdown preview</span> to copy ready-to-use task instructions, or view the <span className="font-semibold text-text-primary">JSON data</span> for structured system integrations.</p>
        </div>

        {/* Grid of Packet Drafts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mt-4">
          {packets.map((packet) => (
            <PacketDraftCard key={packet.id} packet={packet} />
          ))}
        </div>
      </div>
    </div>
  );
}
