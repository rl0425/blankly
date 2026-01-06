import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const source_type = formData.get("source_type") as string;

    if (!title || !category) {
      return NextResponse.json(
        { error: "제목과 카테고리는 필수입니다" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const source_data = formData.get("source_data");
    const description = formData.get("description") as string;

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title,
        description,
        category,
        source_type,
        source_data: source_data ? JSON.parse(source_data as string) : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Project creation error:", error);
      return NextResponse.json(
        { error: "프로젝트 생성에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

