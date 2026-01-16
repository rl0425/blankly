import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";

// 방 상태 초기화 (처음부터 다시 풀기)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // 1. 해당 방의 완료된 세션 삭제
    const { error: sessionError } = await supabase
      .from("room_sessions")
      .delete()
      .eq("user_id", user.id)
      .eq("room_id", roomId)
      .eq("is_completed", true);

    if (sessionError) {
      console.error("Delete session error:", sessionError);
      return NextResponse.json(
        { error: "세션 삭제에 실패했습니다" },
        { status: 500 }
      );
    }

    // 2. 방 상태를 미완료로 변경
    const { error: roomError } = await supabase
      .from("rooms")
      .update({ status: "in_progress" })
      .eq("id", roomId);

    if (roomError) {
      console.error("Update room status error:", roomError);
      return NextResponse.json(
        { error: "방 상태 업데이트에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

