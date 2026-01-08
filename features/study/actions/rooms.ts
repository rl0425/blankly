"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getRoomsByProject(projectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("day_number", { ascending: true });

  if (error) {
    console.error("Get rooms error:", error);
    return [];
  }

  return data || [];
}

// 프로젝트의 마지막 방 설정 가져오기
export async function getLastRoomSettings(projectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rooms")
    .select(
      "title, total_problems, difficulty, generation_mode, source_data, fill_blank_ratio, grading_strictness"
    )
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Get last room settings error:", error);
    return null;
  }

  return data;
}

// 프로젝트의 방 목록과 세션 정보를 JOIN으로 한 번에 가져오기 (N+1 문제 해결)
export async function getRoomsByProjectWithSessions(
  projectId: string,
  userId: string
) {
  const supabase = await createClient();

  // rooms와 room_sessions를 LEFT JOIN으로 한 번에 가져오기
  const { data: rooms, error } = await supabase
    .from("rooms")
    .select(
      `
      *,
      room_sessions!left (
        is_completed,
        correct_count,
        wrong_count,
        total_problems,
        completed_at
      )
    `
    )
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .eq("room_sessions.user_id", userId)
    .order("day_number", { ascending: true });

  if (error) {
    console.error("Get rooms with sessions error:", error);
    return [];
  }

  // room_sessions는 배열로 반환되므로 가장 최근 것만 선택
  type RoomWithSessions = {
    room_sessions?: Array<{
      is_completed: boolean;
      correct_count: number;
      wrong_count: number;
      total_problems: number;
      completed_at?: string;
    }>;
    [key: string]: unknown;
  };

  return (rooms || []).map((room: RoomWithSessions) => {
    const sessions = room.room_sessions || [];
    const latestSession = sessions.length > 0 ? sessions[0] : null;

    return {
      ...room,
      room_sessions: undefined, // 원본 배열 제거
      is_user_completed: latestSession?.is_completed || false,
      session: latestSession,
    };
  });
}

export async function getRoom(roomId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("Get room error:", error);
    return null;
  }

  return data;
}

export async function updateRoomStatus(
  roomId: string,
  status: "not_started" | "in_progress" | "completed"
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("rooms")
    .update({ status })
    .eq("id", roomId);

  if (error) {
    console.error("Update room status error:", error);
    return { error: "룸 상태 업데이트에 실패했습니다" };
  }

  return { success: true };
}

export async function deleteRoom(roomId: string) {
  const supabase = await createClient();

  console.log("🗑️ 방 삭제 시도:", roomId);

  // 0. 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("❌ 인증되지 않은 사용자");
    return { error: "로그인이 필요합니다" };
  }
  console.log("✅ 사용자 인증됨:", user.id);

  // 1. 프로젝트 ID 먼저 가져오기 (revalidate 경로용)
  const { data: room, error: fetchError } = await supabase
    .from("rooms")
    .select("project_id, id")
    .eq("id", roomId)
    .single();

  if (fetchError) {
    console.error("❌ 방 조회 실패:", fetchError);
    return { error: "방을 찾을 수 없습니다" };
  }
  console.log("✅ 방 조회 성공:", room);

  // 2. 방 Soft Delete (deleted_at 타임스탬프 설정)
  const now = new Date().toISOString();

  const { data: updatedData, error: deleteError } = await supabase
    .from("rooms")
    .update({ deleted_at: now })
    .eq("id", roomId)
    .select(); // 업데이트된 행 확인

  console.log("삭제 결과:", { updatedData, deleteError });

  if (deleteError) {
    console.error("❌ Soft delete room error:", deleteError);
    return { error: `방 삭제에 실패했습니다: ${deleteError.message}` };
  }

  if (!updatedData || updatedData.length === 0) {
    console.error("❌ 삭제된 행이 없음 (RLS 정책 문제?)");
    return { error: "방 삭제 권한이 없거나 방을 찾을 수 없습니다" };
  }

  console.log("✅ 방 삭제 성공!");

  // 3. 캐시 무효화 (중요!)
  if (room?.project_id) {
    revalidatePath(`/study/${room.project_id}`);
  }
  revalidatePath("/study");

  return { success: true };
}
