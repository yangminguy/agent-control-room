"use client";

import React, { useState } from "react";
import { ShieldAlert, Info, Copy, Check, Eye, Code, ChevronRight } from "lucide-react";
import packetData from "../../data/hermes-task-packets.json";
import { MonitorPacket } from "../../lib/monitor/types";
import { renderMonitorPacketMarkdown, HERMES_PACKET_KINDS } from "../../lib/monitor/packet-formatters";

function getPacketDecision(packet: MonitorPacket): { label: string; detail: string } {
  if (packet.kind === "failure" || packet.kind === "failed-task-review") {
    return {
      label: "복구 판단 필요",
      detail: "실패 원인과 다음 수정 방향을 PM이 먼저 확인해야 합니다.",
    };
  }
  if (packet.kind === "drift-detection" || packet.kind === "re-orchestration") {
    return {
      label: "계획 조정 필요",
      detail: "원래 계획과 실제 진행 사이의 차이를 확인하고 재오케스트레이션 여부를 판단하세요.",
    };
  }
  if (packet.kind === "approval-request") {
    return {
      label: "승인 필요",
      detail: "고위험 실행 전 PM 승인 여부를 결정해야 합니다.",
    };
  }
  return {
    label: "정보 확인",
    detail: "현재 작업 맥락을 검토하고 다음 단계로 넘길 수 있는지 확인하세요.",
  };
}

function getSectionBody(packet: MonitorPacket, titleIncludes: string): string | undefined {
  return packet.content.sections.find((section) =>
    section.title.toLowerCase().includes(titleIncludes.toLowerCase())
  )?.body;
}

export default function MonitorPacketsPage() {
  const packets = packetData.examples as MonitorPacket[];
  const [selectedPacketId, setSelectedPacketId] = useState<string>(packets[0]?.id || "");
  const [viewMode, setViewMode] = useState<"markdown" | "json">("markdown");
  const [copied, setCopied] = useState(false);

  const selectedPacket = packets.find((p) => p.id === selectedPacketId) || packets[0];

  const markdown = selectedPacket ? renderMonitorPacketMarkdown(selectedPacket) : "";
  const json = selectedPacket ? JSON.stringify(selectedPacket, null, 2) : "";
  const content = viewMode === "markdown" ? markdown : json;
  const decision = selectedPacket ? getPacketDecision(selectedPacket) : null;
  const completed = selectedPacket ? getSectionBody(selectedPacket, "completed") : undefined;
  const nextSteps = selectedPacket ? getSectionBody(selectedPacket, "next") : undefined;
  const failure = selectedPacket ? getSectionBody(selectedPacket, "failure") || getSectionBody(selectedPacket, "root") : undefined;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Hermes Packet Drafts</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Hermes를 직접 실행하지 않고도 백그라운드 작업 패킷 초안을 미리 빌드하고 리뷰합니다.
          </p>
        </div>

        {/* Safety Notice & Info Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-600">
              <strong className="font-bold">안전 알림 (Safety Notice):</strong> 본 페이지는 패킷 초안만 생성하며, Hermes를 실제로 수행하지 않습니다. (This page only generates packet drafts. Hermes is not executed.) 마크다운 내용을 복사하여 자유롭게 다른 에이전트 작업 공간이나 수동 검증용으로 활용하세요.
            </div>
          </div>
          <div className="bg-white border border-zinc-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
            <Info className="w-5 h-5 text-pink-primary shrink-0 mt-0.5" />
            <div className="text-xs text-text-secondary">
              <strong className="font-bold">이용 방법:</strong> 왼쪽 목록에서 패킷을 선택한 뒤, 마크다운 혹은 JSON 버전을 토글하여 복사 버튼을 통해 클립보드로 직접 내보낼 수 있습니다.
            </div>
          </div>
        </div>

        {/* TWO-PANE INBOX LAYOUT */}
        {packets.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-sm h-[640px]">
            
            {/* Left Pane: Packet Inbox List */}
            <div className="border-r border-zinc-200 flex flex-col h-full bg-zinc-50 overflow-y-auto divide-y divide-zinc-200">
              <div className="p-4 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  수신함 패킷 초안 ({packets.length})
                </span>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-200">
                {packets.map((packet) => {
                  const isSelected = packet.id === selectedPacketId;
                  const kindLabel = HERMES_PACKET_KINDS[packet.kind]?.label || packet.kind;
                  return (
                    <button
                      key={packet.id}
                      onClick={() => {
                        setSelectedPacketId(packet.id);
                        setCopied(false);
                      }}
                      className={`w-full text-left p-4 transition-all flex items-start justify-between gap-3 group outline-none ${
                        isSelected
                          ? "bg-white border-l-4 border-l-pink-primary"
                          : "bg-zinc-50 hover:bg-white border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-pink-primary/10 border border-pink-primary/20 text-pink-primary text-[10px] font-bold mb-1.5">
                          {kindLabel}
                        </span>
                        <h3 className="text-xs font-bold text-text-primary truncate group-hover:text-pink-primary transition-colors">
                          {packet.title}
                        </h3>
                        <p className="text-[11px] text-text-secondary mt-1 line-clamp-2">
                          {packet.description}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-text-tertiary shrink-0 mt-2 transition-transform group-hover:translate-x-1 ${isSelected ? "text-pink-primary" : ""}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Selected Packet Detail */}
            {selectedPacket ? (
              <div className="flex flex-col h-full bg-white">
                {/* Right Pane Header */}
                <div className="border-b border-zinc-200 p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-pink-primary bg-pink-primary/5 border border-pink-primary/10 px-2.5 py-0.5 rounded">
                      {HERMES_PACKET_KINDS[selectedPacket.kind]?.label || selectedPacket.kind}
                    </span>
                    <h2 className="text-sm font-bold text-text-primary truncate mt-2">
                      {selectedPacket.title}
                    </h2>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                      {selectedPacket.description}
                    </p>
                  </div>

                  {/* View Segment Control */}
                  <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50 shrink-0 self-start sm:self-center">
                    <button
                      onClick={() => setViewMode("markdown")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 outline-none ${
                        viewMode === "markdown"
                          ? "bg-zinc-900 text-white"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Markdown
                    </button>
                    <button
                      onClick={() => setViewMode("json")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 outline-none ${
                        viewMode === "json"
                          ? "bg-zinc-900 text-white"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      JSON
                    </button>
                  </div>
                </div>

                {/* Content View */}
                <div className="flex-1 overflow-y-auto p-6 bg-white space-y-4">
                  {decision && (
                    <div className="rounded-lg border border-pink-primary/20 bg-pink-primary/5 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-pink-primary">PM 판단</p>
                      <h3 className="mt-1 text-base font-bold text-zinc-950">{decision.label}</h3>
                      <p className="mt-1 text-sm text-zinc-600">{decision.detail}</p>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">요약</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-700">{selectedPacket.description}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">다음 확인</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                        {nextSteps || failure || completed || "패킷 원문을 확인하고 다음 실행/승인 여부를 판단하세요."}
                      </p>
                    </div>
                  </div>

                  <details className="rounded-lg border border-zinc-200 bg-white">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-900">
                      원문 보기 ({viewMode === "markdown" ? "Markdown" : "JSON"})
                    </summary>
                    <pre className="max-h-[260px] overflow-auto border-t border-zinc-200 bg-zinc-50 p-4 font-mono text-xs leading-relaxed text-zinc-700 whitespace-pre-wrap break-words">
                      {content}
                    </pre>
                  </details>
                </div>

                {/* Right Pane Footer Actions */}
                <div className="border-t border-zinc-200 p-4 bg-zinc-50 flex justify-end">
                  <button
                    onClick={() => handleCopy(content)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all border border-zinc-950 shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        복사 완료!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        {viewMode === "markdown" ? "마크다운 복사" : "JSON 복사"}
                      </>
                    )}
                  </button>
                </div>

              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-surface">
                <p className="text-sm text-text-secondary">패킷을 선택하여 상세 내용을 확인하세요.</p>
              </div>
            )}

          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center bg-surface-2/45">
            <p className="text-sm text-text-secondary">초안 패킷이 존재하지 않습니다.</p>
          </div>
        )}

      </div>
    </div>
  );
}
