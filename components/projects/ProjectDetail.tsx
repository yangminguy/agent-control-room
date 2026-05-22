import { FileText, Calendar, GitBranch, Settings } from "lucide-react";
import type { Project, Task } from "@/lib/types";
import { SendToVibeKanbanButton } from "./SendToVibeKanbanButton";

export function ProjectDetail({ project, tasks }: { project: Project; tasks: Task[] }) {
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Card */}
      <div className="bg-surface-2 border border-border rounded-xl p-6">
        <h2 className="text-xl font-bold text-text-primary mb-5">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary mb-2">Path</p>
            <p className="font-mono text-sm bg-surface border border-border/50 p-2 rounded-lg text-text-secondary overflow-x-auto">{project.path}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary mb-2">Description</p>
            <p className="text-sm text-text-primary leading-relaxed">{project.description || "No description provided."}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary mb-2">Default Agent</p>
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Settings className="w-4 h-4 text-text-tertiary" />
              <span className="capitalize">{project.defaultAgent.replace("-", " ")}</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary mb-2">Created</p>
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Calendar className="w-4 h-4 text-text-tertiary" />
              {new Date(project.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Core Documents */}
        <div className="bg-surface-2 border border-border rounded-xl p-6 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-text-primary">Core Documents</h2>
            <span className="bg-pink-primary/10 border border-pink-primary/20 text-pink-primary text-xs px-2.5 py-1 rounded-full font-bold">
              {project.docs.length} Docs
            </span>
          </div>
          
          {project.docs.length === 0 ? (
            <p className="text-text-secondary text-sm flex-1 flex items-center justify-center italic">No documents found. System will read core docs on orchestration.</p>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-2 flex-1">
              {project.docs.map(doc => (
                <div key={doc.id} className="p-4 border border-border/60 rounded-lg bg-surface hover:border-pink-primary/30 transition-colors">
                  <div className="flex items-center gap-2.5 font-bold text-text-primary mb-1.5">
                    <FileText className="w-4 h-4 text-pink-primary" />
                    {doc.title}
                  </div>
                  <p className="text-[11px] text-text-tertiary font-mono truncate">{doc.path}</p>
                  {doc.summary && (
                    <p className="text-sm mt-2.5 text-text-secondary leading-relaxed line-clamp-2">{doc.summary}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="bg-surface-2 border border-border rounded-xl p-6 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-text-primary">Tasks</h2>
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-bold">
              {projectTasks.length} Tasks
            </span>
          </div>
          
          {projectTasks.length === 0 ? (
            <p className="text-text-secondary text-sm flex-1 flex items-center justify-center italic">No tasks generated for this project yet.</p>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-2 flex-1">
              {projectTasks.map(task => (
                <div key={task.id} className="p-4 border border-border/60 rounded-lg bg-surface hover:border-pink-primary/30 transition-colors flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 font-bold text-text-primary mb-1.5">
                      <GitBranch className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{task.title}</span>
                    </div>
                    <p className="text-xs text-text-secondary mb-3 leading-relaxed line-clamp-2">{task.technicalSummary}</p>
                    <SendToVibeKanbanButton project={project} task={task} />
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border whitespace-nowrap shrink-0
                    ${task.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                      task.status === "in_progress" ? "bg-pink-primary/10 text-pink-primary border-pink-primary/30" : 
                      "bg-surface-2 text-text-secondary border-border/60"}`}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
