"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Sparkles,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
  Brain,
  Zap,
  Lock,
  Workflow,
  AlertOctagon,
  FileCode,
  AlertTriangle,
  GitBranch,
  PackageOpen,
  Terminal,
  XOctagon,
} from "lucide-react";
import { compileSeniorDevPrompt } from "@/lib/prompts/senior-dev-prompt-compiler";
import type { SeniorDevCompiledPrompt } from "@/lib/prompts/senior-dev-compiler.types";
import type { AgentType } from "@/lib/types";

function CopyValidationButton({ commands }: { commands: string[] }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(commands.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-2 border border-border hover:border-pink-primary/40 text-xs font-semibold text-text-secondary transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

const DEFAULT_CONTEXT = `AI Development Control Tower for non-developer PMs.
Uses JSON local storage for storing feature plans and roadmaps.
Does not perform autonomous execution without explicit user approval.`;

export function PromptCompilerUI() {
  // Inputs
  const [userRequest, setUserRequest] = useState("");
  const [projectName, setProjectName] = useState("Agent Control Room");
  const [projectContext, setProjectContext] = useState(DEFAULT_CONTEXT);
  const [taskTitle, setTaskTitle] = useState("");
  const [preferredAgent, setPreferredAgent] = useState<AgentType | "auto">("auto");
  const [acceptanceCriteriaText, setAcceptanceCriteriaText] = useState("");
  
  // UI states
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledPrompt, setCompiledPrompt] = useState<SeniorDevCompiledPrompt | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCompile = async () => {
    if (!userRequest.trim()) return;

    setIsCompiling(true);
    // Simulate a small compile delay to make the transition feel high-end
    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      const criteria = acceptanceCriteriaText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const compiled = await compileSeniorDevPrompt({
        projectName,
        projectContext,
        userRequest,
        taskTitle: taskTitle || undefined,
        acceptanceCriteria: criteria.length > 0 ? criteria : undefined,
        preferredAgent: preferredAgent === "auto" ? undefined : preferredAgent,
      });

      setCompiledPrompt(compiled);
    } catch (err) {
      console.error("Compilation error:", err);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleCopy = async () => {
    if (!compiledPrompt) return;
    try {
      await navigator.clipboard.writeText(compiledPrompt.generatedPromptMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  // Helper colors for statuses
  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "low":
      default:
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    }
  };

  const getParallelBadgeColor = (safety: string) => {
    switch (safety) {
      case "safe":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "caution":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "unsafe":
      default:
        return "bg-red-500/10 text-red-400 border border-red-500/20";
    }
  };

  const getAgentLabel = (agent: string) => {
    switch (agent) {
      case "claude-code":
        return "Claude Code";
      case "codex":
        return "Codex";
      case "antigravity":
        return "Antigravity";
      case "hermes":
        return "Hermes (Worker)";
      case "vibe-kanban":
        return "Vibe Kanban";
      case "manual":
        return "Manual (User)";
      default:
        return agent;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] items-start">
      
      {/* Left Column: Form Controls & Notices */}
      <div className="space-y-6">
        
        {/* Safety Banner */}
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-amber-300">
            <span className="font-semibold block text-amber-200 mb-0.5">Safety Notice</span>
            This page only generates prompt drafts. It does not run agents, execute code, deploy, or modify files. Use the copied output in your preferred agent workspace.
          </div>
        </div>

        {/* Input Card */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-lg">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Brain className="w-4 h-4 text-pink-primary" />
              Rough PM Instruction
            </label>
            <textarea
              className="min-h-[140px] resize-y px-3.5 py-3 text-sm leading-relaxed"
              placeholder="e.g. '/plan 화면에 현재 단계별 진행률을 더 잘 보이게 해줘. UI만 수정하고 데이터 모델은 건드리지 마.'"
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
            />
          </div>

          {/* Toggle Advanced Context */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors py-1"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Advanced Context Details
          </button>

          {showAdvanced && (
            <div className="pt-2 border-t border-border/60 space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Project Name</label>
                  <input
                    type="text"
                    className="px-3 py-2 text-xs"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Preferred Agent</label>
                  <select
                    className="px-3 py-2 text-xs"
                    value={preferredAgent}
                    onChange={(e) => setPreferredAgent(e.target.value as AgentType | "auto")}
                  >
                    <option value="auto">Auto Router</option>
                    <option value="claude-code">Claude Code</option>
                    <option value="codex">Codex</option>
                    <option value="antigravity">Antigravity</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Task Title (Optional)</label>
                <input
                  type="text"
                  className="px-3 py-2 text-xs"
                  placeholder="e.g. Polish Roadmap Progress Bar"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Project Context</label>
                <textarea
                  className="min-h-[80px] resize-y px-3 py-2 text-xs leading-relaxed"
                  value={projectContext}
                  onChange={(e) => setProjectContext(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Acceptance Criteria (One per line)</label>
                <textarea
                  className="min-h-[80px] resize-y px-3 py-2 text-xs leading-relaxed"
                  placeholder="Criterion 1&#10;Criterion 2"
                  value={acceptanceCriteriaText}
                  onChange={(e) => setAcceptanceCriteriaText(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-pink-primary hover:bg-pink-soft text-background py-3 text-sm font-bold tracking-wide transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            disabled={isCompiling || !userRequest.trim()}
            onClick={handleCompile}
          >
            {isCompiling ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4.5 w-4.5 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Compiling...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Prompt Draft
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: Output & Empty State */}
      <div className="min-h-[500px] flex flex-col">
        {!compiledPrompt ? (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-surface/50 p-8 text-center">
            <div className="p-3 bg-pink-primary/10 rounded-full mb-3 text-pink-primary">
              <Brain className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-text-primary text-base">Prompt Compiler Ready</h3>
            <p className="text-xs text-text-secondary max-w-sm mt-1 leading-relaxed">
              Enter a request to generate a safe agent prompt. The compiler will assess risks, determine parallel compatibility, and recommend the best developer agent.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-6 animate-in fade-in duration-300">
            
            {/* Metadata Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-surface border border-border p-3.5 rounded-xl flex flex-col gap-1.5 shadow-sm">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Recommended Agent</span>
                <span className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-pink-primary shrink-0" />
                  {getAgentLabel(compiledPrompt.targetAgent)}
                </span>
                {compiledPrompt.suggestedFallbackAgent && (
                  <span className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                    <GitBranch className="w-3 h-3 shrink-0" />
                    <span className="font-medium text-amber-400">Fallback available:</span>
                    &nbsp;{getAgentLabel(compiledPrompt.suggestedFallbackAgent)} (if primary unavailable)
                  </span>
                )}
              </div>

              <div className="bg-surface border border-border p-3.5 rounded-xl flex flex-col gap-1.5 shadow-sm">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Risk Assessment</span>
                <span className={`text-xs font-semibold px-2 py-0.5 w-fit rounded-full uppercase ${getRiskBadgeColor(compiledPrompt.riskLevel)}`}>
                  {compiledPrompt.riskLevel}
                </span>
              </div>

              <div className="bg-surface border border-border p-3.5 rounded-xl flex flex-col gap-1.5 shadow-sm">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Parallel Safety</span>
                <span className={`text-xs font-semibold px-2 py-0.5 w-fit rounded-full uppercase ${getParallelBadgeColor(compiledPrompt.parallelSafety)}`}>
                  {compiledPrompt.parallelSafety}
                </span>
              </div>

              <div className="bg-surface border border-border p-3.5 rounded-xl flex flex-col gap-1.5 shadow-sm">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Conflict Risk</span>
                <span className={`text-xs font-semibold px-2 py-0.5 w-fit rounded-full uppercase ${getRiskBadgeColor(compiledPrompt.conflictRisk)}`}>
                  {compiledPrompt.conflictRisk}
                </span>
              </div>

              <div className="bg-surface border border-border p-3.5 rounded-xl flex flex-col gap-1.5 shadow-sm col-span-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Execution Rules</span>
                <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  {compiledPrompt.userApprovalRequired ? (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      Approval Required
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Workflow className="w-3.5 h-3.5 shrink-0" />
                      Standard Execution
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* User Approval Required notice */}
            {compiledPrompt.userApprovalRequired && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold text-amber-300 text-sm block mb-1">User Approval Required</span>
                  {compiledPrompt.riskDescription ? (
                    <span className="text-amber-200">{compiledPrompt.riskDescription}</span>
                  ) : (
                    <span className="text-amber-200/70">This task has been flagged as requiring explicit user approval before execution.</span>
                  )}
                </div>
              </div>
            )}

            {/* Explanation card */}
            <div className="bg-surface border border-border p-4 rounded-xl flex gap-3 text-xs leading-relaxed text-text-secondary shadow-sm">
              <Info className="w-4 h-4 text-pink-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-text-primary">Agent Choice Rationale: </strong>
                {compiledPrompt.agentReason}
                {compiledPrompt.riskDescription && !compiledPrompt.userApprovalRequired && (
                  <div className="mt-1 text-red-400 font-medium">
                    <span className="font-semibold text-text-primary">Risk Warning: </span>
                    {compiledPrompt.riskDescription}
                  </div>
                )}
              </div>
            </div>

            {/* Handoff Pack suggestion */}
            {compiledPrompt.suggestedHandoffRequired && (
              <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <PackageOpen className="w-4 h-4 text-pink-primary shrink-0" />
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Suggested Handoff Pack</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  The compiler recommends generating a handoff pack before switching agents.
                  {compiledPrompt.suggestedFallbackAgent && (
                    <> Suggested receiving agent: <span className="font-semibold text-text-primary">{getAgentLabel(compiledPrompt.suggestedFallbackAgent)}</span>.</>
                  )}
                </p>
                <a
                  href="/hermes-packets"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-2 border border-border hover:border-pink-primary/40 text-xs font-semibold text-text-primary transition-colors"
                >
                  <PackageOpen className="w-3.5 h-3.5 text-pink-primary" />
                  Generate Handoff Pack Draft
                </a>
              </div>
            )}

            {/* Context Pack suggestion */}
            {compiledPrompt.suggestedContextPackRequired && (
              <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-pink-primary shrink-0" />
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Suggested Context Pack</span>
                </div>
                {compiledPrompt.contextPackNotes && (
                  <p className="text-xs text-text-secondary leading-relaxed">{compiledPrompt.contextPackNotes}</p>
                )}
                <a
                  href="/hermes-packets"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-2 border border-border hover:border-pink-primary/40 text-xs font-semibold text-text-primary transition-colors"
                >
                  <GitBranch className="w-3.5 h-3.5 text-pink-primary" />
                  Generate Context Pack Draft
                </a>
              </div>
            )}

            {/* Do-Not-Touch Files */}
            {compiledPrompt.doNotTouchFiles.length > 0 && (
              <div className="bg-surface border border-red-500/20 p-4 rounded-xl shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <XOctagon className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Files Not to Modify</span>
                </div>
                <ul className="space-y-1">
                  {compiledPrompt.doNotTouchFiles.map((file, i) => (
                    <li key={i} className="text-xs font-mono text-text-secondary bg-[#0e0e11] px-2.5 py-1 rounded flex items-center gap-2">
                      <XOctagon className="w-3 h-3 text-red-400 shrink-0" />
                      {file}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation Commands */}
            {compiledPrompt.validationCommands.length > 0 && (
              <div className="bg-surface border border-border p-4 rounded-xl shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-pink-primary shrink-0" />
                    <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Validation Commands</span>
                  </div>
                  <CopyValidationButton commands={compiledPrompt.validationCommands} />
                </div>
                <p className="text-[11px] text-text-secondary">Run these commands to validate the task is complete:</p>
                <pre className="text-[12px] font-mono text-emerald-300 bg-[#0e0e11] p-3 rounded overflow-auto whitespace-pre-wrap break-all leading-relaxed">
                  {compiledPrompt.validationCommands.join("\n")}
                </pre>
              </div>
            )}

            {/* Compiled Prompt Markdown Section */}
            <div className="flex-1 flex flex-col rounded-xl border border-border bg-surface overflow-hidden shadow-lg">
              <div className="px-4 py-3.5 border-b border-border/80 flex items-center justify-between bg-surface-2">
                <span className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-pink-primary" />
                  Compiled Prompt Preview
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-pink-primary hover:bg-pink-soft text-background text-xs font-bold transition-all shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Prompt
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 min-h-[300px] overflow-hidden flex flex-col">
                <pre className="flex-1 overflow-auto p-4 text-[13px] leading-relaxed font-mono text-text-secondary bg-[#0e0e11] whitespace-pre-wrap break-words">
                  {compiledPrompt.generatedPromptMarkdown}
                </pre>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
