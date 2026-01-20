"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/components/card";
import { Button } from "@/shared/ui/components/button";
import { Edit, Trash2, GripVertical } from "lucide-react";
import type { Project } from "@/shared/types";

interface SortableProjectCardProps {
  project: Project;
  index: number;
  isEditMode: boolean;
  isDeleting: boolean;
  isReordering: boolean;
  isDragging?: boolean;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

export function SortableProjectCard({
  project,
  index,
  isEditMode,
  isDeleting,
  isReordering,
  isDragging: externalIsDragging,
  onEdit,
  onDelete,
}: SortableProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: internalIsDragging,
  } = useSortable({ id: project.id });

  const isDragging = externalIsDragging ?? internalIsDragging;

  // DragOverlay에서 사용되는 경우 transform을 적용하지 않음
  const isInOverlay = externalIsDragging && !transform;
  
  const style: React.CSSProperties = {
    transform: isInOverlay ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition || undefined,
    opacity: isDragging && !isInOverlay ? 0.3 : 1, // 드래그 중인 원본은 더 투명하게
    touchAction: "none",
  };

  if (!isEditMode) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={isDragging ? "z-50" : ""}
      >
        <Link href={`/study/${project.id}`} className="block">
          <Card className="hover:shadow-lg transition-all h-full">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="line-clamp-2">{project.title}</CardTitle>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {project.category}
                </span>
              </div>
              {project.description && (
                <CardDescription className="line-clamp-1">
                  {project.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  진행률:{" "}
                  {project.total_rooms > 0
                    ? Math.round(
                        (project.completed_rooms / project.total_rooms) * 100
                      )
                    : 0}
                  %
                </span>
                <span className="text-primary font-medium">
                  {project.completed_rooms}/{project.total_rooms} Day
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "z-50" : ""}
    >
      <Card
        className={`h-full relative ${
          isDragging && !isInOverlay
            ? "ring-2 ring-primary shadow-lg"
            : isDragging && isInOverlay
            ? "ring-2 ring-primary shadow-2xl rotate-2"
            : "hover:shadow-lg transition-shadow"
        } ${isDeleting || isReordering ? "opacity-50 pointer-events-none" : ""}`}
        style={
          isDragging && !isInOverlay
            ? {
                width: "100%",
                minHeight: "100%",
              }
            : undefined
        }
      >
        {/* 드래그 핸들 (편집 모드일 때만) */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-3 left-3 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        <CardHeader className={isEditMode ? "pl-12" : ""}>
          <div className="flex items-start justify-between">
            <CardTitle className="line-clamp-2">{project.title}</CardTitle>
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
              {project.category}
            </span>
          </div>
          {project.description && (
            <CardDescription className="line-clamp-1">
              {project.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm mb-4">
            <span className="text-muted-foreground">
              진행률:{" "}
              {project.total_rooms > 0
                ? Math.round(
                    (project.completed_rooms / project.total_rooms) * 100
                  )
                : 0}
              %
            </span>
            <span className="text-primary font-medium">
              {project.completed_rooms}/{project.total_rooms} Day
            </span>
          </div>

          {/* 편집 모드 버튼들 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit(project)}
              disabled={isReordering}
            >
              <Edit className="h-3 w-3 mr-1" />
              수정
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => onDelete(project.id)}
              disabled={isDeleting || isReordering}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              {isDeleting ? "삭제 중..." : "삭제"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
