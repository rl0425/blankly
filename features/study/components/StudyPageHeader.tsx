"use client";

import { CreateProjectModal } from "./CreateProjectModal";

interface StudyPageHeaderProps {
  projectCount: number;
  isEditMode: boolean;
  onEditModeChange: (isEditMode: boolean) => void;
}

export function StudyPageHeader({
  projectCount,
  isEditMode,
  onEditModeChange,
}: StudyPageHeaderProps) {
  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold toss-heading-sm">
              학습 프로젝트
            </h1>
            <p className="text-muted-foreground toss-body-sm mt-1">
              {projectCount}개의 프로젝트
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onEditModeChange(!isEditMode)}
              className={`text-sm font-medium transition-colors ${
                isEditMode
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isEditMode ? "편집 완료" : "편집하기"}
            </button>
            <CreateProjectModal />
          </div>
        </div>
      </div>
    </div>
  );
}
