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
    <div className="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <Folder className="w-5 h-5 text-pink-primary" />
          {project.name}
        </div>
      </div>
      
      {project.description && (
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="mt-auto space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-surface-2 text-pink-primary rounded p-2 text-center">
            <div className="font-semibold">{activeTasks.length}</div>
            <div className="text-xs">Active Tasks</div>
          </div>
          <div className="bg-green-50 text-green-800 rounded p-2 text-center">
            <div className="font-semibold">{completedTasks.length}</div>
            <div className="text-xs">Completed</div>
          </div>
        </div>

        <Link 
          href={`/projects/${project.id}`}
          className="flex items-center justify-center gap-2 w-full text-sm font-medium text-pink-primary hover:text-pink-primary py-2 border rounded hover:bg-surface-2 transition"
        >
          View Project
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
