import { createClient } from "@/shared/lib/supabase/server";
import { getProjects } from "@/features/study/actions/projects";
import { CreateProjectModal } from "@/features/study/components/CreateProjectModal";
import { ProjectList } from "@/features/study/components/ProjectList";

export default async function StudyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 비로그인 사용자도 접근 가능 (빈 프로젝트 리스트 표시)
  const projects = user ? await getProjects() : [];

  return (
    <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold toss-heading-sm">학습 프로젝트</h1>
            <p className="text-muted-foreground toss-body-sm mt-1">
              {projects.length}개의 프로젝트
            </p>
          </div>
          <CreateProjectModal />
        </div>

        <ProjectList projects={projects} />
    </main>
  );
}

