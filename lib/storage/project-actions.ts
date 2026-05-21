"use server";

import { getProjects, saveProject } from "./json-store";
import type { Project } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function addProjectAction(formData: FormData) {
  const name = formData.get("name") as string;
  const projectPath = formData.get("path") as string;
  const description = (formData.get("description") as string) || undefined;

  const newProject: Project = {
    id: `proj-${Date.now()}`,
    name,
    path: projectPath,
    description,
    defaultAgent: "claude-code",
    docs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveProject(newProject);

  revalidatePath("/projects");
  revalidatePath("/");

  return newProject;
}

export async function getProjectById(id: string) {
  const projects = await getProjects();
  return projects.find((p) => p.id === id) || null;
}
