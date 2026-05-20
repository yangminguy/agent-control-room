import { FileText, Calendar, GitBranch, Settings } from "lucide-react";
import type { Project, Task } from "@/lib/types";
import { SendToVibeKanbanButton } from "./SendToVibeKanbanButton";

export function ProjectDetail({ project, tasks }: { project: Project; tasks: Task[] }) {
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  
  return (
    <div className="space-y-8">
      {/* Overview Card */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Path</p>
            <p className="font-mono text-sm bg-gray-50 p-2 rounded">{project.path}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Description</p>
            <p>{project.description || "No description provided."}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Default Agent</p>
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <span className="capitalize">{project.defaultAgent.replace("-", " ")}</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Created</p>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              {new Date(project.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Core Documents */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Core Documents</h2>
            <span className="bg-surface-2 text-pink-primary text-xs px-2 py-1 rounded-full font-medium">
              {project.docs.length} Docs
            </span>
          </div>
          
          {project.docs.length === 0 ? (
            <p className="text-gray-500 text-sm">No documents found. System will read core docs on orchestration.</p>
          ) : (
            <div className="space-y-3">
              {project.docs.map(doc => (
                <div key={doc.id} className="p-3 border rounded-md hover:bg-gray-50 transition">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <FileText className="w-4 h-4 text-pink-primary" />
                    {doc.title}
                  </div>
                  <p className="text-xs text-gray-500 font-mono truncate">{doc.path}</p>
                  {doc.summary && (
                    <p className="text-sm mt-2 text-gray-600 line-clamp-2">{doc.summary}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Tasks</h2>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
              {projectTasks.length} Tasks
            </span>
          </div>
          
          {projectTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No tasks generated for this project yet.</p>
          ) : (
            <div className="space-y-3">
              {projectTasks.map(task => (
                <div key={task.id} className="p-3 border rounded-md hover:bg-gray-50 transition flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 font-medium mb-1">
                      <GitBranch className="w-4 h-4 text-green-500" />
                      {task.title}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{task.technicalSummary}</p>
                    <SendToVibeKanbanButton project={project} task={task} />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded border capitalize
                    ${task.status === "completed" ? "bg-green-50 text-green-700 border-green-200" : 
                      task.status === "in_progress" ? "bg-surface-2 text-pink-primary border-200" : 
                      "bg-gray-50 text-gray-700 border-gray-200"}`}
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
