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
        className="flex items-center gap-2 bg-pink-primary text-white px-5 py-2.5 rounded-lg hover:bg-pink-soft font-bold transition-colors shadow-lg shadow-pink-primary/20"
      >
        <Plus className="w-4 h-4" />
        New Project
      </button>
    );
  }

  return (
    <div className="border border-border/60 rounded-xl p-6 bg-surface-2 mb-8 animate-fade-in">
      <h3 className="text-xl font-bold text-text-primary mb-5">Register New Project</h3>
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
          <label htmlFor="name" className="block text-sm font-semibold text-text-primary mb-1.5">Project Name</label>
          <input 
            type="text" 
            id="name" 
            name="name" 
            required
            className="w-full border border-border/60 rounded-lg px-4 py-2.5 bg-surface text-text-primary placeholder-text-tertiary focus:border-pink-primary focus:ring-1 focus:ring-pink-primary/30 outline-none transition-colors"
            placeholder="e.g. Agent Control Room"
          />
        </div>
        <div>
          <label htmlFor="path" className="block text-sm font-semibold text-text-primary mb-1.5">Absolute Path</label>
          <input 
            type="text" 
            id="path" 
            name="path" 
            required
            className="w-full border border-border/60 rounded-lg px-4 py-2.5 bg-surface text-text-primary placeholder-text-tertiary focus:border-pink-primary focus:ring-1 focus:ring-pink-primary/30 outline-none transition-colors font-mono text-sm"
            placeholder="/Users/username/projects/agent-control-room"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-text-primary mb-1.5">Description (Optional)</label>
          <textarea 
            id="description" 
            name="description" 
            className="w-full border border-border/60 rounded-lg px-4 py-2.5 bg-surface text-text-primary placeholder-text-tertiary focus:border-pink-primary focus:ring-1 focus:ring-pink-primary/30 outline-none transition-colors h-24 resize-none"
            placeholder="Briefly describe what this project is about..."
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button 
            type="button" 
            onClick={() => setIsOpen(false)}
            className="px-5 py-2.5 border border-border/60 rounded-lg font-bold text-text-secondary hover:text-text-primary hover:bg-surface hover:border-border transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="px-5 py-2.5 bg-pink-primary text-white font-bold rounded-lg hover:bg-pink-soft transition-colors shadow-lg shadow-pink-primary/20"
          >
            Save Project
          </button>
        </div>
      </form>
    </div>
  );
}
