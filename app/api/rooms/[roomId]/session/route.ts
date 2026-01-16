import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";

// 방의 세션 정보 조회 (완료 여부 확인)
export async function GET(
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

    // 가장 최근 세션 조회
    const { data: session, error: sessionError } = await supabase
      .from("room_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("room_id", roomId)
      .eq("is_completed", true)
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (sessionError && sessionError.code !== "PGRST116") {
      // PGRST116은 "no rows returned" 에러
      console.error("Get session error:", sessionError);
      return NextResponse.json(
        { error: "세션 정보를 가져올 수 없습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: session || null });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

