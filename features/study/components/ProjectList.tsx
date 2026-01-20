"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/components/card";
import { Button } from "@/shared/ui/components/button";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { CreateProjectModal } from "./CreateProjectModal";
import { SortableProjectCard } from "./SortableProjectCard";
import { useToast } from "@/shared/hooks/use-toast";
import type { Project } from "@/shared/types";

interface ProjectListProps {
  projects: Project[];
  isEditMode?: boolean;
  onEditModeChange?: (isEditMode: boolean) => void;
}

export function ProjectList({
  projects,
  isEditMode: externalEditMode,
  onEditModeChange,
}: ProjectListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [internalEditMode, setInternalEditMode] = useState(false);
  
  // 외부에서 제어 가능하도록 (props로 전달되면 사용, 없으면 내부 state 사용)
  const isEditMode = externalEditMode !== undefined ? externalEditMode : internalEditMode;
  const setIsEditMode = onEditModeChange || setInternalEditMode;
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null
  );
  const [isReordering, setIsReordering] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // 편집 모드에서 사용할 프로젝트 목록 (원본 순서 유지)
  const [orderedProjects, setOrderedProjects] = useState<Project[]>(projects);

  // 프로젝트 목록이 변경되면 orderedProjects도 업데이트
  useEffect(() => {
    setOrderedProjects(projects);
  }, [projects]);

  const handleDelete = async (projectId: string) => {
    if (
      !confirm(
        "이 프로젝트를 삭제하시겠습니까?\n프로젝트 내 모든 방과 문제가 함께 삭제됩니다."
      )
    ) {
      return;
    }

    setDeletingProjectId(projectId);

    try {
      const { deleteProject } = await import(
        "@/features/study/actions/projects"
      );
      await deleteProject(projectId);

      // revalidatePath가 이미 호출되었으므로, 다음 방문 시 자동으로 새 데이터를 가져옴
      // router.refresh()를 호출하지 않아서 캐시된 데이터를 먼저 보여주고 백그라운드에서 업데이트
      // 삭제된 프로젝트는 UI에서 즉시 제거
      router.push("/study");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다"
      );
    } finally {
      setDeletingProjectId(null);
    }
  };

  // 드래그 시작 핸들러
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedProjects.findIndex((p) => p.id === active.id);
    const newIndex = orderedProjects.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newProjects = arrayMove(orderedProjects, oldIndex, newIndex);
    setOrderedProjects(newProjects);

    // DB에 순서 업데이트
    updateProjectOrder(newProjects);
  };

  // 드래그 센서 설정 (터치 지원)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동해야 드래그 시작 (실수로 클릭하는 것 방지)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 프로젝트 순서 업데이트 API 호출
  const updateProjectOrder = async (projectsToOrder: Project[]) => {
    setIsReordering(true);
    try {
      // 각 프로젝트에 새로운 sort_order 할당 (맨 위가 가장 높은 값)
      const projectOrders = projectsToOrder.map((project, index) => ({
        id: project.id,
        sort_order: (projectsToOrder.length - index) * 10, // 10, 20, 30... 형태로 할당
      }));

      const response = await fetch("/api/projects/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectOrders }),
      });

      if (!response.ok) {
        throw new Error("순서 변경에 실패했습니다");
      }

      router.refresh();
    } catch (error) {
      console.error("Reorder projects error:", error);
      toast({
        title: "순서 변경 실패",
        description:
          error instanceof Error ? error.message : "다시 시도해주세요",
        variant: "destructive",
      });
      // 실패 시 원래 순서로 복구
      setOrderedProjects(projects);
    } finally {
      setIsReordering(false);
    }
  };

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mb-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">
            첫 프로젝트를 만들어보세요
          </h3>
          <p className="text-muted-foreground mb-4">
            PDF나 텍스트를 업로드하면 AI가 자동으로 문제를 만들어드려요
          </p>
          <CreateProjectModal />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedProjects.map((p) => p.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orderedProjects.map((project, index) => (
              <SortableProjectCard
                key={project.id}
                project={project}
                index={index}
                isEditMode={isEditMode}
                isDeleting={deletingProjectId === project.id}
                isReordering={isReordering}
                isDragging={activeId === project.id}
                onEdit={setEditingProject}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            (() => {
              const draggedProject = orderedProjects.find(
                (p) => p.id === activeId
              );
              return draggedProject ? (
                <div className="opacity-90">
                  <SortableProjectCard
                    project={draggedProject}
                    index={0}
                    isEditMode={isEditMode}
                    isDeleting={false}
                    isReordering={false}
                    isDragging={true}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </div>
              ) : null;
            })()
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 수정 모달 */}
      {editingProject && (
        <CreateProjectModal
          editMode
          initialData={editingProject}
          onClose={() => setEditingProject(null)}
        />
      )}

      {/* 재정렬 중 로딩 오버레이 */}
      {isReordering && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-lg font-medium">순서 변경 중...</p>
          </div>
        </div>
      )}
    </>
  );
}
