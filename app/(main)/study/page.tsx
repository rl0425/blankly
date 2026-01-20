import { createClient } from "@/shared/lib/supabase/server";
import { getProjects } from "@/features/study/actions/projects";
import { StudyPageWrapper } from "@/features/study/components/StudyPageWrapper";

export default async function StudyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 비로그인 사용자도 접근 가능 (빈 프로젝트 리스트 표시)
  const projects = user ? await getProjects() : [];

  return <StudyPageWrapper projects={projects} />;
}
