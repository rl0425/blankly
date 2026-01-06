"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/shared/ui/components/card";
import { Button } from "@/shared/ui/components/button";
import { CheckCircle, Circle, PlayCircle, Trash2, Play } from "lucide-react";
import { deleteRoom } from "@/features/study/actions/rooms";
import { useToast } from "@/shared/hooks/use-toast";

interface RoomCardProps {
  room: {
    id: string;
    title: string;
    total_problems: number;
    difficulty: string;
    status: string;
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

    if (!confirm(`"${room.title}"을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
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
    } catch (error: any) {
      toast({
        title: "삭제 실패",
        description: error.message || "방 삭제 중 오류가 발생했습니다",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  // 완료 상태 우선, 없으면 room.status 사용
  const displayStatus = isCompleted ? "completed" : room.status;

  const StatusIcon =
    displayStatus === "completed" ? CheckCircle :
    displayStatus === "in_progress" ? PlayCircle :
    Circle;

  const statusColor =
    displayStatus === "completed" ? "text-green-500" :
    displayStatus === "in_progress" ? "text-yellow-500" :
    "text-muted-foreground";

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSelect?.();
  };

  return (
    <div className="relative">
      <Link href={`/study/${projectId}/${room.id}`}>
        <Card 
          className={`
            hover:shadow-md transition-all cursor-pointer group
            ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
            ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}
          `}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 flex-1">
              {/* 체크박스 (선택 모드일 때만) - 클릭 시 선택만 */}
              {selectionMode && (
                <div 
                  className="flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                  onClick={handleCheckboxClick}
                >
                  {isSelected ? (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                  )}
                </div>
              )}

              <StatusIcon className={`h-5 w-5 ${statusColor} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{room.title}</p>
                <p className="text-sm text-muted-foreground">
                  {room.total_problems}개 문제 · {room.difficulty}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 상태 아이콘 */}
              <div className={`flex items-center gap-2 ${statusColor}`}>
                {displayStatus === "completed" ? (
                  <CheckCircle className="h-5 w-5" />
                ) : displayStatus === "in_progress" ? (
                  <PlayCircle className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </div>

              {/* 삭제 버튼 (선택 모드가 아닐 때만) */}
              {!selectionMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

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

