import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";
import { getProject } from "@/features/study/actions/projects";
import { getRoomsByProject } from "@/features/study/actions/rooms";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card";
import { Button } from "@/shared/ui/components/button";
import { ArrowLeft, TrendingUp, Target, Calendar } from "lucide-react";

export default async function ProjectStatsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const project = await getProject(projectId);
  const rooms = await getRoomsByProject(projectId);

  if (!project) {
    redirect("/study");
  }

  // 각 방별 통계 가져오기
  const roomStats = await Promise.all(
    rooms.map(async (room) => {
      const { data: session } = await supabase
        .from("room_sessions")
        .select("*")
        .eq("room_id", room.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...room,
        session,
        accuracyRate: session?.total_problems 
          ? Math.round((session.correct_count / session.total_problems) * 100) 
          : 0,
      };
    })
  );

  // 전체 통계
  const completedRooms = roomStats.filter(r => r.session?.is_completed);
  const totalProblems = completedRooms.reduce((sum, r) => sum + (r.session?.total_problems || 0), 0);
  const totalCorrect = completedRooms.reduce((sum, r) => sum + (r.session?.correct_count || 0), 0);
  const totalWrong = completedRooms.reduce((sum, r) => sum + (r.session?.wrong_count || 0), 0);
  const overallAccuracy = totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0;

  // 난이도별 통계
  const difficultyStats = {
    easy: roomStats.filter(r => r.difficulty === "easy" && r.session),
    medium: roomStats.filter(r => r.difficulty === "medium" && r.session),
    hard: roomStats.filter(r => r.difficulty === "hard" && r.session),
  };

  const difficultyAccuracy = {
    easy: difficultyStats.easy.length > 0
      ? Math.round(difficultyStats.easy.reduce((sum, r) => sum + r.accuracyRate, 0) / difficultyStats.easy.length)
      : 0,
    medium: difficultyStats.medium.length > 0
      ? Math.round(difficultyStats.medium.reduce((sum, r) => sum + r.accuracyRate, 0) / difficultyStats.medium.length)
      : 0,
    hard: difficultyStats.hard.length > 0
      ? Math.round(difficultyStats.hard.reduce((sum, r) => sum + r.accuracyRate, 0) / difficultyStats.hard.length)
      : 0,
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/study/${projectId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold toss-heading-sm">상세 통계</h1>
            <p className="text-sm text-muted-foreground mt-1">{project.title}</p>
          </div>
        </div>

        {/* 전체 요약 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>전체 요약</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-primary/5">
                <p className="text-3xl font-bold text-primary">{completedRooms.length}</p>
                <p className="text-sm text-muted-foreground mt-1">완료한 방</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/10">
                <p className="text-3xl font-bold text-green-600">{overallAccuracy}%</p>
                <p className="text-sm text-muted-foreground mt-1">전체 정답률</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-500/10">
                <p className="text-3xl font-bold text-blue-600">{totalCorrect}</p>
                <p className="text-sm text-muted-foreground mt-1">맞춘 문제</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-500/10">
                <p className="text-3xl font-bold text-red-600">{totalWrong}</p>
                <p className="text-sm text-muted-foreground mt-1">틀린 문제</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 난이도별 정답률 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              난이도별 정답률
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 쉬움 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">쉬움</span>
                <span className="text-sm text-muted-foreground">
                  {difficultyAccuracy.easy}% ({difficultyStats.easy.length}개 방)
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${difficultyAccuracy.easy}%` }}
                />
              </div>
            </div>

            {/* 보통 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">보통</span>
                <span className="text-sm text-muted-foreground">
                  {difficultyAccuracy.medium}% ({difficultyStats.medium.length}개 방)
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 transition-all"
                  style={{ width: `${difficultyAccuracy.medium}%` }}
                />
              </div>
            </div>

            {/* 어려움 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">어려움</span>
                <span className="text-sm text-muted-foreground">
                  {difficultyAccuracy.hard}% ({difficultyStats.hard.length}개 방)
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${difficultyAccuracy.hard}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 방별 상세 통계 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              방별 상세 성적
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roomStats.map((room) => (
                <div 
                  key={room.id}
                  className={`p-4 rounded-lg border ${
                    room.session?.is_completed 
                      ? 'bg-green-50/50 border-green-200 dark:bg-green-950/10 dark:border-green-900' 
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{room.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        난이도: {room.difficulty === "easy" ? "쉬움" : room.difficulty === "medium" ? "보통" : "어려움"}
                      </p>
                    </div>
                    {room.session?.is_completed ? (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{room.accuracyRate}%</p>
                        <p className="text-xs text-muted-foreground">
                          {room.session.correct_count}/{room.session.total_problems}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">미완료</p>
                    )}
                  </div>
                  {room.session?.is_completed && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${room.accuracyRate}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
              {completedRooms.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  아직 완료한 방이 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>
    </main>
  );
}
