import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";
import { getProject } from "@/features/study/actions/projects";
import { getRoomsByProjectWithSessions } from "@/features/study/actions/rooms";
import { RoomListSection } from "@/features/study/components/RoomListSection";
import { Card, CardContent } from "@/shared/ui/components/card";
import { Button } from "@/shared/ui/components/button";
import {
  ArrowLeft,
  CheckCircle,
  Target,
  TrendingUp,
  Calendar,
  ArrowRight,
} from "lucide-react";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const project = await getProject(projectId);

  if (!project) {
    redirect("/study");
  }

  // 방 목록과 세션 정보를 한 번에 가져오기 (최적화)
  const roomsWithCompletion = await getRoomsByProjectWithSessions(
    projectId,
    user.id
  );

  // 프로젝트 전체 통계 계산 (is_completed=true인 세션만 사용)
  const roomIds = roomsWithCompletion
    .map((r) => {
      // roomsWithCompletion의 반환 타입에 id가 포함되어 있음
      if (r && typeof r === "object" && "id" in r && typeof r.id === "string") {
        return r.id;
      }
      return null;
    })
    .filter((id): id is string => id !== null);
  const { data: completedSessions } = await supabase
    .from("room_sessions")
    .select("room_id, total_problems, correct_count, wrong_count")
    .eq("user_id", user.id)
    .in("room_id", roomIds)
    .eq("is_completed", true);

  // 완료한 방 수 (고유한 room_id 개수)
  const completedRoomIds = new Set(
    completedSessions?.map((s) => s.room_id) || []
  );
  const completedRoomsCount = completedRoomIds.size;

  // 통계 계산
  const totalProblems =
    completedSessions?.reduce((sum, s) => sum + (s.total_problems || 0), 0) ||
    0;
  const totalCorrect =
    completedSessions?.reduce((sum, s) => sum + (s.correct_count || 0), 0) || 0;
  const totalWrong =
    completedSessions?.reduce((sum, s) => sum + (s.wrong_count || 0), 0) || 0;
  const accuracyRate =
    totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0;

  // 최근 학습 일자
  const { data: recentSession } = await supabase
    .from("room_sessions")
    .select("completed_at")
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  const lastStudyDate = recentSession?.completed_at
    ? new Date(recentSession.completed_at).toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
      })
    : "학습 기록 없음";

  return (
    <>
      {/* Fixed Header - 뒤로가기 + 프로젝트 제목 */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/study">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold toss-heading-sm">
                {project.title}
              </h1>
              {project.description && (
                <p className="text-muted-foreground text-sm mt-1">
                  {project.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed 헤더 높이만큼 padding-top 추가 */}
      <div className="pt-[120px]">
        <main className="container mx-auto px-4 py-8">
          {/* Rooms List */}
          <RoomListSection
            rooms={roomsWithCompletion.map((room) => {
              const roomTyped = room as unknown as {
                // 추후 타입 픽스 필요함
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
              };
              return {
                id: roomTyped.id,
                title: roomTyped.title,
                total_problems: roomTyped.total_problems,
                difficulty: roomTyped.difficulty,
                status: roomTyped.status,
                is_user_completed: roomTyped.is_user_completed,
                session: roomTyped.session,
              };
            })}
            projectId={projectId}
            projectTitle={project.title}
          />

          {/* 통계 영역 */}
          <div className="space-y-4">
            {/* 마지막 학습 (텍스트만) */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  마지막 학습:{" "}
                  <span className="font-medium text-foreground">
                    {lastStudyDate}
                  </span>
                </span>
              </div>
              <Link href={`/study/${projectId}/stats`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs h-8"
                >
                  상세 통계 보기
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            {/* 통계 카드 (작게) */}
            <div className="grid gap-3 md:grid-cols-3">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        완료한 방
                      </p>
                      <p className="text-xl font-bold">
                        {completedRoomsCount}
                        <span className="text-sm text-muted-foreground ml-1">
                          / {project.total_rooms}
                        </span>
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        평균 정답률
                      </p>
                      <p className="text-xl font-bold">
                        {accuracyRate}
                        <span className="text-sm text-muted-foreground ml-1">
                          %
                        </span>
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Target className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        푼 문제
                      </p>
                      <p className="text-xl font-bold">
                        {totalProblems}
                        <span className="text-xs text-muted-foreground ml-2">
                          (맞: {totalCorrect}, 틀: {totalWrong})
                        </span>
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
