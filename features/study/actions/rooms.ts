"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getRoomsByProject(projectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("project_id", projectId)
    .order("day_number", { ascending: true });

  if (error) {
    console.error("Get rooms error:", error);
    return [];
  }

  return data || [];
}

export async function getRoom(roomId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
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
  const { data: { user } } = await supabase.auth.getUser();
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

  // 2. 방 삭제 (CASCADE로 problems, user_answers 등도 자동 삭제됨)
  const { data: deletedData, error: deleteError, count } = await supabase
    .from("rooms")
    .delete()
    .eq("id", roomId)
    .select(); // 삭제된 행 확인

  console.log("삭제 결과:", { deletedData, deleteError, count });

  if (deleteError) {
    console.error("❌ Delete room error:", deleteError);
    return { error: `방 삭제에 실패했습니다: ${deleteError.message}` };
  }

  if (!deletedData || deletedData.length === 0) {
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

