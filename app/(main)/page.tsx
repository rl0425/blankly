import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";
import { getUserProfile, getUserStats } from "@/features/auth/actions/auth";
import { getProjects } from "@/features/study/actions/projects";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/components/card";
import { BookOpen, CheckCircle, TrendingUp } from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 비로그인 사용자도 접근 가능
  const profile = user ? await getUserProfile() : null;
  const projects = user ? await getProjects() : [];
  const stats = user ? await getUserStats() : { total_solved: 0, total_correct: 0 };

  const accuracy =
    stats.total_solved > 0
      ? Math.round((stats.total_correct / stats.total_solved) * 100)
      : 0;

  return (
    <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold toss-heading mb-2">
            {user ? `안녕하세요, ${profile?.nickname}님! 👋` : "안녕하세요! 👋"}
          </h1>
          <p className="text-muted-foreground toss-body">
            {user
              ? "오늘도 열심히 학습해볼까요?"
              : "AI와 함께하는 스마트 빈칸 채우기 학습"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">총 문제 수</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_solved}
              </div>
              <p className="text-xs text-muted-foreground">지금까지 푼 문제</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">정답 수</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_correct}
              </div>
              <p className="text-xs text-muted-foreground">맞힌 문제 수</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">정답률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accuracy}%</div>
              <p className="text-xs text-muted-foreground">전체 정답률</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <div>
          <h2 className="text-xl font-bold mb-4">최근 프로젝트</h2>
          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                아직 프로젝트가 없어요. 학습 탭에서 새 프로젝트를 만들어보세요!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.slice(0, 4).map((project) => (
                <Link key={project.id} href={`/study/${project.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <CardTitle>{project.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {project.category}
                        </span>
                        <span className="text-primary font-medium">
                          {project.completed_rooms}/{project.total_rooms} Day
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
    </main>
  );
}
