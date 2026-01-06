import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";
import { getProjects } from "@/features/study/actions/projects";
import { Header } from "@/features/auth/components/Header";
import { Navigation } from "@/features/auth/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/components/card";
import { Button } from "@/shared/ui/components/button";
import { Plus } from "lucide-react";

export default async function StudyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projects = await getProjects();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold toss-heading-sm">학습 프로젝트</h1>
            <p className="text-muted-foreground toss-body-sm mt-1">
              {projects.length}개의 프로젝트
            </p>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            새 프로젝트
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mb-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">첫 프로젝트를 만들어보세요</h3>
              <p className="text-muted-foreground mb-4">
                PDF나 텍스트를 업로드하면 AI가 자동으로 문제를 만들어드려요
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                프로젝트 생성
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/study/${project.id}`}>
                <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="line-clamp-2">{project.title}</CardTitle>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {project.category}
                      </span>
                    </div>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        진행률: {project.total_rooms > 0 
                          ? Math.round((project.completed_rooms / project.total_rooms) * 100)
                          : 0}%
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
      </main>

      <Navigation />
    </div>
  );
}

