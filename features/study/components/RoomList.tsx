"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RoomCard } from "./RoomCard";
import { Button } from "@/shared/ui/components/button";
import { Card, CardContent } from "@/shared/ui/components/card";
import { Trash2, CheckSquare, Square } from "lucide-react";
import { deleteRoom } from "@/features/study/actions/rooms";
import { useToast } from "@/shared/hooks/use-toast";

interface RoomListProps {
  rooms: Array<{
    id: string;
    title: string;
    total_problems: number;
    difficulty: string;
    status: string;
    is_user_completed: boolean;
  }>;
  projectId: string;
}

export function RoomList({ rooms, projectId }: RoomListProps) {
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedRooms.size === rooms.length) {
      setSelectedRooms(new Set());
    } else {
      setSelectedRooms(new Set(rooms.map(r => r.id)));
    }
  };

  // 개별 선택/해제
  const toggleSelect = (roomId: string) => {
    const newSelected = new Set(selectedRooms);
    if (newSelected.has(roomId)) {
      newSelected.delete(roomId);
    } else {
      newSelected.add(roomId);
    }
    setSelectedRooms(newSelected);
  };

  // 선택된 방 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedRooms.size === 0) {
      toast({
        title: "방을 선택해주세요",
        description: "삭제할 방을 먼저 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`선택한 ${selectedRooms.size}개의 방을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      // 병렬로 삭제
      const deletePromises = Array.from(selectedRooms).map(roomId => 
        deleteRoom(roomId)
      );
      
      const results = await Promise.all(deletePromises);
      
      // 실패한 항목 확인
      const failures = results.filter(r => r.error);
      
      if (failures.length > 0) {
        toast({
          title: `${failures.length}개 방 삭제 실패`,
          description: "일부 방 삭제에 실패했습니다",
          variant: "destructive",
        });
      } else {
        toast({
          title: `${selectedRooms.size}개 방이 삭제되었습니다`,
          description: "선택한 방과 관련 데이터가 모두 삭제되었습니다",
        });
      }

      setSelectedRooms(new Set());
      router.refresh();
    } catch (error: any) {
      toast({
        title: "삭제 실패",
        description: error.message || "방 삭제 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (rooms.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-lg font-medium text-foreground mb-2">
            아직 학습 방이 없어요
          </p>
          <p className="text-sm text-muted-foreground">
            "새 방 만들기" 버튼을 눌러 첫 번째 학습 방을 만들어보세요!
          </p>
        </CardContent>
      </Card>
    );
  }

  const allSelected = selectedRooms.size === rooms.length;
  const someSelected = selectedRooms.size > 0;

  return (
    <div className="space-y-4">
      {/* 선택 모드 컨트롤 */}
      <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectAll}
            className="h-8"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 mr-2" />
            ) : (
              <Square className="h-4 w-4 mr-2" />
            )}
            {allSelected ? "전체 해제" : "전체 선택"}
          </Button>
          
          {someSelected && (
            <span className="text-sm text-muted-foreground">
              {selectedRooms.size}개 선택됨
            </span>
          )}
        </div>

        {someSelected && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="h-8"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? "삭제 중..." : `선택 삭제 (${selectedRooms.size})`}
          </Button>
        )}
      </div>

      {/* 방 목록 */}
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          projectId={projectId}
          isCompleted={room.is_user_completed}
          isSelected={selectedRooms.has(room.id)}
          onToggleSelect={() => toggleSelect(room.id)}
          selectionMode={true}
        />
      ))}

      {/* 일괄 삭제 중 로딩 오버레이 */}
      {isDeleting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-destructive/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-destructive border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-lg font-medium">
              {selectedRooms.size}개 방 삭제 중...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

