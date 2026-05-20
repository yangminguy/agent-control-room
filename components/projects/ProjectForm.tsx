"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { addProjectAction } from "@/lib/storage/project-actions";

export function ProjectForm() {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
      >
        <Plus className="w-4 h-4" />
        New Project
      </button>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm mb-8">
      <h3 className="text-lg font-semibold mb-4">Register New Project</h3>
      <form 
        action={async (formData) => {
          await addProjectAction(formData);
          setIsOpen(false);
          // In a real app we'd use router.refresh() here, but server action revalidation is better.
          // Since we are using Next.js App Router, we should trigger a revalidatePath in the action.
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">Project Name</label>
          <input 
            type="text" 
            id="name" 
            name="name" 
            required
            className="w-full border rounded-md px-3 py-2"
            placeholder="e.g. Agent Control Room"
          />
        </div>
        <div>
          <label htmlFor="path" className="block text-sm font-medium mb-1">Absolute Path</label>
          <input 
            type="text" 
            id="path" 
            name="path" 
            required
            className="w-full border rounded-md px-3 py-2"
            placeholder="/Users/username/projects/agent-control-room"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">Description (Optional)</label>
          <textarea 
            id="description" 
            name="description" 
            className="w-full border rounded-md px-3 py-2 h-20"
            placeholder="Briefly describe what this project is about..."
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button 
            type="button" 
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 border rounded-md hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Save Project
          </button>
        </div>
      </form>
    </div>
  );
}
