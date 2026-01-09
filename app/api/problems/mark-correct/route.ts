import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problemId, roomId, userAnswer } = body;

    if (!problemId || !roomId || !userAnswer) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다" },
        { status: 400 }
      );
    }

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

    // 1. 기존 답안 조회 (가장 최근)
    const { data: existingAnswer } = await supabase
      .from("user_answers")
      .select("*")
      .eq("user_id", user.id)
      .eq("problem_id", problemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingAnswer) {
      // 2. 기존 답안을 정답으로 업데이트
      const { error: updateError } = await supabase
        .from("user_answers")
        .update({
          is_correct: true,
          ai_feedback: {
            ...existingAnswer.ai_feedback,
            manually_corrected: true,
            corrected_at: new Date().toISOString(),
          },
        })
        .eq("id", existingAnswer.id);

      if (updateError) {
        console.error("Update answer error:", updateError);
        return NextResponse.json(
          { error: "답안 업데이트에 실패했습니다" },
          { status: 500 }
        );
      }

      // 3. wrong_problems에서 제거 (있다면)
      await supabase
        .from("wrong_problems")
        .delete()
        .eq("user_id", user.id)
        .eq("problem_id", problemId);

      // 4. 방과 프로젝트 삭제 여부 확인
      const { data: room } = await supabase
        .from("rooms")
        .select("deleted_at, project_id, projects!inner(deleted_at)")
        .eq("id", roomId)
        .single();

      const isRoomDeleted = room?.deleted_at !== null;
      const isProjectDeleted =
        room?.projects &&
        (room.projects as unknown as { deleted_at: string | null })
          .deleted_at !== null;
      const shouldUpdateStats = !isRoomDeleted && !isProjectDeleted;

      // 5. 프로필 통계 업데이트 (삭제되지 않은 방/프로젝트인 경우만)
      if (shouldUpdateStats) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("total_correct")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          await supabase
            .from("user_profiles")
            .update({
              total_correct: profile.total_correct + 1,
            })
            .eq("user_id", user.id);
        }
      }
    } else {
      // 답안이 없으면 새로 생성 (정답으로)
      const { data: answer, error: insertError } = await supabase
        .from("user_answers")
        .insert({
          user_id: user.id,
          problem_id: problemId,
          room_id: roomId,
          user_answer: userAnswer,
          is_correct: true,
          ai_feedback: {
            manually_corrected: true,
            corrected_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert answer error:", insertError);
        return NextResponse.json(
          { error: "답안 저장에 실패했습니다" },
          { status: 500 }
        );
      }

      // 방과 프로젝트 삭제 여부 확인
      const { data: room } = await supabase
        .from("rooms")
        .select("deleted_at, project_id, projects!inner(deleted_at)")
        .eq("id", roomId)
        .single();

      const isRoomDeleted = room?.deleted_at !== null;
      const isProjectDeleted =
        room?.projects &&
        (room.projects as unknown as { deleted_at: string | null })
          .deleted_at !== null;
      const shouldUpdateStats = !isRoomDeleted && !isProjectDeleted;

      // 프로필 통계 업데이트 (삭제되지 않은 방/프로젝트인 경우만)
      if (shouldUpdateStats) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("total_solved, total_correct")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          await supabase
            .from("user_profiles")
            .update({
              total_solved: profile.total_solved + 1,
              total_correct: profile.total_correct + 1,
            })
            .eq("user_id", user.id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark correct error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}
