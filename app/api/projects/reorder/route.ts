import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectOrders } = body;

    if (!Array.isArray(projectOrders)) {
      return NextResponse.json(
        { error: "프로젝트 순서 정보가 올바르지 않습니다" },
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

    // 프로젝트 순서 업데이트
    const updatePromises = projectOrders.map(
      ({ id, sort_order }: { id: string; sort_order: number }) =>
        supabase
          .from("projects")
          .update({ sort_order })
          .eq("id", id)
          .eq("user_id", user.id) // 본인의 프로젝트만 수정 가능
    );

    const results = await Promise.all(updatePromises);

    // 에러 확인
    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
      console.error("Reorder projects error:", errors);
      return NextResponse.json(
        { error: "프로젝트 순서 업데이트에 실패했습니다" },
        { status: 500 }
      );
    }

    revalidatePath("/study", "layout");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder projects API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}
