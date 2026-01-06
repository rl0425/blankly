import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { Header } from "@/features/auth/components/Header";
import { Navigation } from "@/features/auth/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card";
import { Button } from "@/shared/ui/components/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function WrongProblemsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: wrongProblems } = await supabase
    .from("wrong_problems")
    .select(`
      *,
      problem:problems(*)
    `)
    .eq("user_id", user.id)
    .eq("is_mastered", false)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/mypage">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold toss-heading-sm">틀린 문제 모음</h1>
        </div>

        {!wrongProblems || wrongProblems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>아직 틀린 문제가 없어요! 👍</p>
              <p className="text-sm mt-2">계속 이대로 완벽한 학습을 유지하세요!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {wrongProblems.map((item) => {
              const problem = item.problem as {
                question: string;
                correct_answer: string;
                explanation?: string;
              };
              
              return (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{problem.question}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">정답</p>
                      <p className="font-medium text-primary">{problem.correct_answer}</p>
                    </div>
                    {problem.explanation && (
                      <div>
                        <p className="text-sm text-muted-foreground">해설</p>
                        <p className="text-sm">{problem.explanation}</p>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      복습 횟수: {item.review_count}회
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}

