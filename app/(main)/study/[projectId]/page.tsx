import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";
import { getProject } from "@/features/study/actions/projects";
import { getRoomsByProject } from "@/features/study/actions/rooms";
import { Header } from "@/features/auth/components/Header";
import { Navigation } from "@/features/auth/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card";
import { Button } from "@/shared/ui/components/button";
import { Progress } from "@/shared/ui/components/progress";
import { ArrowLeft, CheckCircle, Circle, PlayCircle } from "lucide-react";

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
  const rooms = await getRoomsByProject(projectId);

  if (!project) {
    redirect("/study");
  }

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

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>전체 진행률</span>
                <span className="font-medium">
                  {project.completed_rooms}/{project.total_rooms} Day
                </span>
              </div>
              <Progress 
                value={project.total_rooms > 0 
                  ? (project.completed_rooms / project.total_rooms) * 100 
                  : 0
                } 
              />
            </div>
          </CardContent>
        </Card>

        {/* Rooms List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold mb-4">학습 Day</h2>
          
          {rooms.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>아직 생성된 Day가 없습니다.</p>
                <p className="text-sm mt-2">곧 AI가 자동으로 Day를 생성해드릴 예정입니다!</p>
              </CardContent>
            </Card>
          ) : (
            rooms.map((room) => {
              const StatusIcon = 
                room.status === "completed" ? CheckCircle :
                room.status === "in_progress" ? PlayCircle :
                Circle;
              
              const statusColor =
                room.status === "completed" ? "text-primary" :
                room.status === "in_progress" ? "text-secondary" :
                "text-muted-foreground";

              return (
                <Link key={room.id} href={`/study/${projectId}/${room.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                        <div>
                          <p className="font-medium">{room.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {room.total_problems}개 문제 · {room.difficulty}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {room.status === "completed" ? "완료" :
                         room.status === "in_progress" ? "진행 중" :
                         "시작하기"}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </main>

      <Navigation />
    </div>
  );
}

