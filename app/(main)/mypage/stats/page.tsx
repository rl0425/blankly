import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";
import { getProjectStats } from "@/features/study/actions/projects";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/components/card";
import { BackButton } from "@/shared/ui/components/back-button";
import { ChevronRight } from "lucide-react";

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectStats = await getProjectStats(user.id);

  return (
    <>
      <div className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-2xl font-bold toss-heading-sm">학습 통계</h1>
          </div>
        </div>
      </div>

      <div className="pt-[120px]">
        <main className="container mx-auto px-4 py-8">
          {projectStats.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>통계 데이터가 없습니다. 프로젝트를 시작해보세요!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {projectStats.map((project) => (
                <Link key={project.id} href={`/study/${project.id}/stats`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{project.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {project.category}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          총 문제 수
                        </span>
                        <span className="font-bold">
                          {project.total_solved}개
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">정답 수</span>
                        <span className="font-bold text-primary">
                          {project.total_correct}개
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">오답 수</span>
                        <span className="font-bold text-destructive">
                          {project.total_wrong}개
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">정답률</span>
                        <span className="font-bold text-lg">
                          {project.accuracy}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
