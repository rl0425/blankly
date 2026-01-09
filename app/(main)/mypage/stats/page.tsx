import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { getUserProfile, getUserStats } from "@/features/auth/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card";
import { Button } from "@/shared/ui/components/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile();
  const stats = await getUserStats(); // 삭제되지 않은 항목만 카운트

  return (
    <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/mypage">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold toss-heading-sm">학습 통계</h1>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>전체 통계</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>총 문제 수</span>
                <span className="font-bold">{stats.total_solved}개</span>
              </div>
              <div className="flex justify-between">
                <span>정답 수</span>
                <span className="font-bold text-primary">{stats.total_correct}개</span>
              </div>
              <div className="flex justify-between">
                <span>오답 수</span>
                <span className="font-bold text-destructive">
                  {stats.total_solved - stats.total_correct}개
                </span>
              </div>
              <div className="flex justify-between">
                <span>연속 학습일</span>
                <span className="font-bold">{profile?.streak_days || 0}일</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>상세한 차트와 분석은 곧 제공될 예정입니다 📊</p>
            </CardContent>
          </Card>
        </div>
    </main>
  );
}

