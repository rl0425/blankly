import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";
import { getProject } from "@/features/study/actions/projects";
import { getRoomsByProjectWithSessions } from "@/features/study/actions/rooms";
import { CreateRoomModal } from "@/features/study/components/CreateRoomModal";
import { RoomList } from "@/features/study/components/RoomList";
import { Header } from "@/features/auth/components/Header";
import { Navigation } from "@/features/auth/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card";
import { Button } from "@/shared/ui/components/button";
import { Progress } from "@/shared/ui/components/progress";
import { ArrowLeft, CheckCircle, Target, TrendingUp, Calendar, ArrowRight } from "lucide-react";

export default async function ProjectDetailPage({
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
  
  if (!project) {
    redirect("/study");
  }

  // 방 목록과 세션 정보를 한 번에 가져오기 (최적화)
  const roomsWithCompletion = await getRoomsByProjectWithSessions(projectId, user.id);

  // 프로젝트 전체 통계 계산
  const completedRooms = roomsWithCompletion.filter(r => r.is_user_completed);
  const totalProblems = completedRooms.reduce((sum, r) => sum + (r.session?.total_problems || 0), 0);
  const totalCorrect = completedRooms.reduce((sum, r) => sum + (r.session?.correct_count || 0), 0);
  const totalWrong = completedRooms.reduce((sum, r) => sum + (r.session?.wrong_count || 0), 0);
  const accuracyRate = totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0;
  
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
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/study">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold toss-heading-sm">{project.title}</h1>
            {project.description && (
              <p className="text-muted-foreground text-sm mt-1">{project.description}</p>
            )}
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">완료한 방</p>
                  <p className="text-2xl font-bold">
                    {completedRooms.length}
                    <span className="text-lg text-muted-foreground ml-1">/ {project.total_rooms}</span>
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">평균 정답률</p>
                  <p className="text-2xl font-bold">
                    {accuracyRate}
                    <span className="text-lg text-muted-foreground ml-1">%</span>
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">푼 문제</p>
                  <p className="text-2xl font-bold">
                    {totalProblems}
                    <span className="text-sm text-muted-foreground ml-2">
                      (맞: {totalCorrect}, 틀: {totalWrong})
                    </span>
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 추가 정보 카드 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">마지막 학습</p>
                  <p className="font-medium">{lastStudyDate}</p>
                </div>
              </div>
              <Link href={`/study/${projectId}/stats`}>
                <Button variant="outline" size="sm" className="gap-2">
                  상세 통계 보기
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Rooms List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">학습 방</h2>
            <CreateRoomModal projectId={projectId} projectTitle={project.title} />
          </div>
          
          <RoomList rooms={roomsWithCompletion} projectId={projectId} />
        </div>
      </main>

      <Navigation />
    </div>
  );
}

