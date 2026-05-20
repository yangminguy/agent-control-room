import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProjectById } from "@/lib/storage/project-actions";
import { getTasks } from "@/lib/storage/json-store";
import { ProjectDetail } from "@/components/projects/ProjectDetail";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProjectById(params.id);
  
  if (!project) {
    notFound();
  }

  const allTasks = await getTasks();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Link 
        href="/projects" 
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        <p className="text-gray-500 mt-1">Project Details & History</p>
      </div>

      <ProjectDetail project={project} tasks={allTasks} />
    </div>
  );
}
