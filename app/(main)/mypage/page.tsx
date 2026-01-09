import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";
import { getUserProfile, getUserStats } from "@/features/auth/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card";
import { ChevronRight, TrendingUp, XCircle } from "lucide-react";

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile();
  const stats = await getUserStats(); // 삭제되지 않은 항목만 카운트

  const accuracy = stats.total_solved > 0
    ? Math.round((stats.total_correct / stats.total_solved) * 100)
    : 0;

  return (
    <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold toss-heading-sm mb-8">마이페이지</h1>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {profile?.nickname?.charAt(0) || "?"}
                </span>
              </div>
              <div>
                <CardTitle>{profile?.nickname}</CardTitle>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{stats.total_solved}</div>
                <p className="text-xs text-muted-foreground">총 문제</p>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total_correct}</div>
                <p className="text-xs text-muted-foreground">정답</p>
              </div>
              <div>
                <div className="text-2xl font-bold">{accuracy}%</div>
                <p className="text-xs text-muted-foreground">정답률</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <div className="space-y-3">
          <Link href="/mypage/stats">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">학습 통계</p>
                    <p className="text-sm text-muted-foreground">
                      상세한 학습 기록을 확인하세요
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/mypage/wrong-problems">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">틀린 문제 모음</p>
                    <p className="text-sm text-muted-foreground">
                      다시 복습해보세요
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
    </main>
  );
}

