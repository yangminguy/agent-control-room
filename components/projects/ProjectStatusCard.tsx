import Link from "next/link";
import { Folder, GitBranch, ArrowRight } from "lucide-react";
import type { Project, Task } from "@/lib/types";

export function ProjectStatusCard({ 
  project, 
  tasks 
}: { 
  project: Project; 
  tasks: Task[];
}) {
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const activeTasks = projectTasks.filter(t => t.status === "in_progress" || t.status === "planned");
  const completedTasks = projectTasks.filter(t => t.status === "completed");

  return (
    <div className="bg-surface-2 border border-border/60 rounded-xl p-6 hover:border-pink-primary/30 transition-all flex flex-col h-full group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 font-bold text-lg text-text-primary">
          <Folder className="w-5 h-5 text-pink-primary" />
          <span className="truncate">{project.name}</span>
        </div>
      </div>
      
      {project.description && (
        <p className="text-sm text-text-secondary mb-5 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      <div className="mt-auto space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-pink-primary/5 border border-pink-primary/20 text-pink-primary rounded-lg p-2.5 text-center">
            <div className="font-extrabold text-lg leading-none mb-1">{activeTasks.length}</div>
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Active Tasks</div>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 rounded-lg p-2.5 text-center">
            <div className="font-extrabold text-lg leading-none mb-1">{completedTasks.length}</div>
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Completed</div>
          </div>
        </div>

        <Link 
          href={`/projects/${project.id}`}
          className="flex items-center justify-center gap-2 w-full text-sm font-bold text-text-secondary hover:text-pink-primary py-2.5 border border-border/60 rounded-lg hover:bg-surface hover:border-pink-primary/50 transition-all group-hover:bg-surface"
        >
          View Project
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
