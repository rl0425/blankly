import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("problems")
      .select("*")
      .eq("room_id", roomId)
      .order("order_number", { ascending: true });

    if (error) {
      console.error("Problems fetch error:", error);
      return NextResponse.json(
        { error: "문제를 가져올 수 없습니다" },
        { status: 500 }
      );
    }

    // options가 문자열인 경우 파싱
    const parsedData = data.map((problem) => ({
      ...problem,
      options: problem.options ? (
        typeof problem.options === "string" 
          ? JSON.parse(problem.options) 
          : problem.options
      ) : null,
    }));

    return NextResponse.json({ data: parsedData });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

