"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/shared/ui/components/card";
import { Button } from "@/shared/ui/components/button";
import {
  CheckCircle,
  Circle,
  PlayCircle,
  Trash2,
  Play,
  CheckSquare,
  Square,
} from "lucide-react";
import { deleteRoom } from "@/features/study/actions/rooms";
import { useToast } from "@/shared/hooks/use-toast";

interface RoomCardProps {
  room: {
    id: string;
    title: string;
    total_problems: number;
    difficulty: string;
    status: string;
    session?: {
      is_completed: boolean;
      correct_count: number;
      wrong_count: number;
      total_problems: number;
      completed_at?: string;
    } | null;
  };
  projectId: string;
  isCompleted: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  selectionMode?: boolean;
}

export function RoomCard({
  room,
  projectId,
  isCompleted,
  isSelected = false,
  onToggleSelect,
  selectionMode = false,
}: RoomCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Link 클릭 방지
    e.stopPropagation();

    if (
      !confirm(
        `"${room.title}"을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteRoom(room.id);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "방이 삭제되었습니다",
        description: "문제와 관련 데이터가 모두 삭제되었습니다",
      });

      // 페이지 새로고침 (캐시 무효화 후)
      router.refresh();

      // 약간의 딜레이 후 상태 리셋 (UI 즉시 반영)
      setTimeout(() => {
        setIsDeleting(false);
      }, 100);
    } catch (error) {
      toast({
        title: "삭제 실패",
        description:
          error instanceof Error
            ? error.message
            : "방 삭제 중 오류가 발생했습니다",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  // 완료 상태 우선, 없으면 room.status 사용
  const displayStatus = isCompleted ? "completed" : room.status;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSelect?.();
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectionMode) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect?.();
    }
  };

  const cardContent = (
    <Card
      className={`
        hover:shadow-md transition-all cursor-pointer group
        ${isDeleting ? "opacity-50 pointer-events-none" : ""}
        ${isSelected ? "ring-2 ring-primary bg-primary/5" : ""}
        ${
          displayStatus === "completed"
            ? "border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/10"
            : ""
        }
      `}
      onClick={selectionMode ? handleCardClick : undefined}
    >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 flex-1">
              {/* 체크박스 (선택 모드일 때만) - 사각형으로 변경 */}
              {selectionMode && (
                <div
                  className="flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                  onClick={handleCheckboxClick}
                >
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5 text-primary fill-primary" />
                  ) : (
                    <Square className="h-5 w-5 text-muted-foreground hover:text-primary" />
                  )}
                </div>
              )}

              {/* 완료 상태 배지 */}
              {displayStatus === "completed" && (
                <div className="flex-shrink-0 bg-green-500 rounded-full p-1">
                  <CheckCircle className="h-4 w-4 text-white" strokeWidth={3} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-medium truncate ${
                      displayStatus === "completed"
                        ? "text-green-700 dark:text-green-400"
                        : ""
                    }`}
                  >
                    {room.title}
                  </p>
                  {displayStatus === "in_progress" && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      진행중
                    </span>
                  )}
                </div>
                {/* 완료된 방: 통계 정보 표시 */}
                {displayStatus === "completed" && room.session ? (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {room.total_problems}개 문제 ·{" "}
                      {room.difficulty === "easy"
                        ? "쉬움"
                        : room.difficulty === "medium"
                        ? "보통"
                        : "어려움"}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        ✓ {room.session.correct_count}개 정답
                      </span>
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        ✗ {room.session.wrong_count}개 오답
                      </span>
                      {room.session.completed_at && (
                        <span className="text-muted-foreground">
                          · {new Date(room.session.completed_at).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {room.total_problems}개 문제 ·{" "}
                    {room.difficulty === "easy"
                      ? "쉬움"
                      : room.difficulty === "medium"
                      ? "보통"
                      : "어려움"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 시작하기 텍스트 (PC만, 선택 모드가 아닐 때) */}
              {!selectionMode && displayStatus !== "completed" && (
                <span className="hidden md:inline-block text-sm font-medium text-primary group-hover:underline">
                  시작하기
                </span>
              )}

              {/* 삭제 버튼 (선택 모드가 아닐 때만) */}
              {!selectionMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
  );

  return (
    <div className="relative">
      {selectionMode ? (
        cardContent
      ) : (
        <Link href={`/study/${projectId}/${room.id}`}>{cardContent}</Link>
      )}

      {/* 삭제 중 로딩 오버레이 */}
      {isDeleting && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 border-4 border-destructive/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-destructive border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-sm font-medium text-destructive">삭제 중...</p>
          </div>
        </div>
      )}
    </div>
  );
}
