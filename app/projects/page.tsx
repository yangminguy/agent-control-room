import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectList } from "@/components/projects/ProjectList";
import { getProjects } from "@/lib/storage/json-store";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-gray-500 mt-1">Manage your development workspaces and their documentation.</p>
      </div>

      <ProjectForm />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Projects</h2>
        <ProjectList projects={projects} />
      </div>
    </div>
  );
}
