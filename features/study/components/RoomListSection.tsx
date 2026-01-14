"use client";

import { useState } from "react";
import { CreateRoomModal } from "./CreateRoomModal";
import { RoomList } from "./RoomList";
import { Button } from "@/shared/ui/components/button";
import { Pencil } from "lucide-react";

interface RoomListSectionProps {
  rooms: Array<{
    id: string;
    title: string;
    total_problems: number;
    difficulty: string;
    status: string;
    is_user_completed: boolean;
    session?: {
      is_completed: boolean;
      correct_count: number;
      wrong_count: number;
      total_problems: number;
      completed_at?: string;
    } | null;
  }>;
  projectId: string;
  projectTitle: string;
}

export function RoomListSection({
  rooms,
  projectId,
  projectTitle,
}: RoomListSectionProps) {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">학습 방</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
            className={isEditMode ? "text-primary" : ""}
          >
            <Pencil className="h-4 w-4 mr-2" />
            {isEditMode ? "편집 완료" : "편집하기"}
          </Button>
          <CreateRoomModal projectId={projectId} projectTitle={projectTitle} />
        </div>
      </div>

      <RoomList rooms={rooms} projectId={projectId} isEditMode={isEditMode} />
    </div>
  );
}
