import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";
import { getProject } from "@/features/study/actions/projects";
import { getRoomsByProject } from "@/features/study/actions/rooms";
import { CreateRoomModal } from "@/features/study/components/CreateRoomModal";
import { RoomList } from "@/features/study/components/RoomList";
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

  // 각 방의 완료 상태 확인 (room_sessions 조회)
  const roomsWithCompletion = await Promise.all(
    rooms.map(async (room) => {
      const { data: session } = await supabase
        .from("room_sessions")
        .select("is_completed")
        .eq("room_id", room.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...room,
        is_user_completed: session?.is_completed || false,
      };
    })
  );

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

