"use client";

interface PacketDraftCardProps {
  key?: string;
  packet?: any;
}

export function PacketDraftCard({ packet }: PacketDraftCardProps) {
  return (
    <div className="p-4 border border-dashed border-border rounded">
      <p className="text-sm text-text-secondary">PacketDraftCard component</p>
      {packet?.title && <p className="text-xs mt-2">{packet.title}</p>}
    </div>
  );
}
