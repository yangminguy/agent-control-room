"use server";

import { getProjects } from "./json-store";
import { promises as fs } from "fs";
import path from "path";
import type { Project } from "@/lib/types";
import { revalidatePath } from "next/cache";

const DATA_DIR = path.join(process.cwd(), "data");

export async function addProjectAction(formData: FormData) {
  const name = formData.get("name") as string;
  const projectPath = formData.get("path") as string;
  const description = (formData.get("description") as string) || undefined;
  
  const projects = await getProjects();
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
  
  await fs.writeFile(
    path.join(DATA_DIR, "projects.json"),
    `${JSON.stringify([newProject, ...projects], null, 2)}\n`,
    "utf8",
  );
  
  revalidatePath("/projects");
  revalidatePath("/");
  
  return newProject;
}

export async function getProjectById(id: string) {
  const projects = await getProjects();
  return projects.find(p => p.id === id) || null;
}
