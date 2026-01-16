"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/components/card";
import { Button } from "@/shared/ui/components/button";
import { Plus, Edit, Trash2, Pencil } from "lucide-react";
import { CreateProjectModal } from "./CreateProjectModal";
import type { Project } from "@/shared/types";

interface ProjectListProps {
  projects: Project[];
}

export function ProjectList({ projects }: ProjectListProps) {
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null
  );

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
      {/* 편집 모드 토글 버튼 */}
      <div className="flex items-center justify-end mb-4">
        <Button
          variant={isEditMode ? "default" : "outline"}
          size="sm"
          onClick={() => setIsEditMode(!isEditMode)}
        >
          <Pencil className="h-4 w-4 mr-2" />
          {isEditMode ? "편집 완료" : "편집하기"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="hover:shadow-lg transition-all h-full relative"
          >
            {!isEditMode ? (
              <Link href={`/study/${project.id}`} className="block">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-2">
                      {project.title}
                    </CardTitle>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {project.category}
                    </span>
                  </div>
                  {project.description && (
                    <CardDescription className="line-clamp-2">
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
                            (project.completed_rooms / project.total_rooms) *
                              100
                          )
                        : 0}
                      %
                    </span>
                    <span className="text-primary font-medium">
                      {project.completed_rooms}/{project.total_rooms} Day
                    </span>
                  </div>
                </CardContent>
              </Link>
            ) : (
              <>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-2">
                      {project.title}
                    </CardTitle>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {project.category}
                    </span>
                  </div>
                  {project.description && (
                    <CardDescription className="line-clamp-2">
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
                            (project.completed_rooms / project.total_rooms) *
                              100
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
                      onClick={() => setEditingProject(project)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      수정
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDelete(project.id)}
                      disabled={deletingProjectId === project.id}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {deletingProjectId === project.id ? "삭제 중..." : "삭제"}
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        ))}
      </div>

      {/* 수정 모달 */}
      {editingProject && (
        <CreateProjectModal
          editMode
          initialData={editingProject}
          onClose={() => setEditingProject(null)}
        />
      )}
    </>
  );
}
