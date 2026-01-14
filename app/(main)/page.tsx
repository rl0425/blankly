import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";
import { getUserProfile, getUserStats } from "@/features/auth/actions/auth";
import { getProjects } from "@/features/study/actions/projects";
import { getRecentRooms } from "@/features/study/actions/rooms";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/components/card";
import { ChevronRight } from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 비로그인 사용자도 접근 가능
  const profile = user ? await getUserProfile() : null;
  const projects = user ? await getProjects() : [];
  const stats = user
    ? await getUserStats()
    : { total_solved: 0, total_correct: 0 };
  const recentRooms = user ? await getRecentRooms(user.id, 5) : [];

  const accuracy =
    stats.total_solved > 0
      ? Math.round((stats.total_correct / stats.total_solved) * 100)
      : 0;

  const difficultyLabels: Record<string, string> = {
    easy: "쉬움",
    medium: "보통",
    hard: "어려움",
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold toss-heading mb-2">
          {user ? `안녕하세요, ${profile?.nickname}님!` : "안녕하세요!"}
        </h1>
        <p className="text-muted-foreground toss-body">
          {user
            ? "오늘도 열심히 학습해볼까요?"
            : "AI와 함께하는 스마트 빈칸 채우기 학습"}
        </p>
      </div>

      {/* Recent Rooms */}
      {user && recentRooms.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">최근 사용한 룸</h2>
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3 pb-4 min-w-max">
              {recentRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/study/${room.project_id}/${room.id}`}
                  className="shrink-0 w-[160px]"
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer rounded-lg h-full">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm line-clamp-2">
                          {room.title}
                        </h3>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <div>문제 {room.total_problems}개</div>
                          <div>
                            난이도:{" "}
                            {difficultyLabels[room.difficulty] ||
                              room.difficulty}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Projects */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">최근 프로젝트</h2>
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              아직 프로젝트가 없어요. 학습 탭에서 새 프로젝트를 만들어보세요!
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3 pb-4 min-w-max">
              {projects.slice(0, 10).map((project) => (
                <Link
                  key={project.id}
                  href={`/study/${project.id}`}
                  className="shrink-0 w-[160px]"
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer rounded-lg h-full">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm line-clamp-2">
                          {project.title}
                        </h3>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <div>{project.category}</div>
                          <div>
                            {project.completed_rooms}/{project.total_rooms} Day
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Preview */}
      {user && (
        <div>
          <Link href="/mypage/stats">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>내 학습 기록</CardTitle>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">총 문제 수</span>
                  <span className="font-bold text-lg">
                    {stats.total_solved}개
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">정답 수</span>
                  <span className="font-bold text-lg text-primary">
                    {stats.total_correct}개
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">정답률</span>
                  <span className="font-bold text-lg">{accuracy}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">오답 수</span>
                  <span className="font-bold text-lg text-destructive">
                    {stats.total_solved - stats.total_correct}개
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </main>
  );
}
