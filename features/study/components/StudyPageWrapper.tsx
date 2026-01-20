"use client";

import { useState } from "react";
import { ProjectList } from "./ProjectList";
import { StudyPageHeader } from "./StudyPageHeader";
import type { Project } from "@/shared/types";

interface StudyPageWrapperProps {
  projects: Project[];
}

export function StudyPageWrapper({ projects }: StudyPageWrapperProps) {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <>
      <StudyPageHeader
        projectCount={projects.length}
        isEditMode={isEditMode}
        onEditModeChange={setIsEditMode}
      />
      <div className="pt-[60px]">
        <main className="container mx-auto px-4 py-8">
          <ProjectList
            projects={projects}
            isEditMode={isEditMode}
            onEditModeChange={setIsEditMode}
          />
        </main>
      </div>
    </>
  );
}
