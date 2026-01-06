"use server";

import { createClient } from "@/shared/lib/supabase/server";

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

