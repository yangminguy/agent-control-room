import Link from "next/link";
import { Folder, ArrowRight } from "lucide-react";
import type { Project } from "@/lib/types";

export function ProjectList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-gray-50">
        <p className="text-gray-500">No projects found. Add one above.</p>
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
          <div className="p-6 border rounded-lg hover:border-500 hover:shadow-md transition bg-white h-full flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Folder className="w-5 h-5 text-pink-primary" />
                {project.name}
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-pink-primary transition-colors" />
            </div>
            {project.description && (
              <p className="text-sm text-gray-600 mb-4 flex-grow line-clamp-2">
                {project.description}
              </p>
            )}
            <div className="mt-auto pt-4 border-t text-xs text-gray-500 flex justify-between">
              <span>Docs: {project.docs.length}</span>
              <span>{project.defaultAgent}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
