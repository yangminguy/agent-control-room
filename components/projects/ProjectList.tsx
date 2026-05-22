import Link from "next/link";
import { Folder, ArrowRight } from "lucide-react";
import type { Project } from "@/lib/types";

export function ProjectList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="text-center p-8 border border-border/60 rounded-xl bg-surface">
        <p className="text-text-tertiary">No projects found. Add one above.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link 
          key={project.id} 
          href={`/projects/${project.id}`}
          className="block group"
        >
          <div className="p-6 border border-border/60 rounded-xl hover:border-pink-primary/50 hover:bg-surface-2/80 transition-all bg-surface-2 h-full flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5 text-lg font-bold text-text-primary">
                <Folder className="w-5 h-5 text-pink-primary" />
                <span className="truncate">{project.name}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-pink-primary group-hover:translate-x-1 transition-all" />
            </div>
            {project.description && (
              <p className="text-sm text-text-secondary mb-4 flex-grow line-clamp-2 leading-relaxed">
                {project.description}
              </p>
            )}
            <div className="mt-auto pt-4 border-t border-border/50 text-[11px] uppercase tracking-wider font-bold text-text-tertiary flex justify-between">
              <span>Docs: {project.docs.length}</span>
              <span>{project.defaultAgent}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
