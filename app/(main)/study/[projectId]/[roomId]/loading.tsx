import { Header } from "@/features/auth/components/Header";
import { Navigation } from "@/features/auth/components/Navigation";
import { Card, CardContent, CardHeader } from "@/shared/ui/components/card";
import { Progress } from "@/shared/ui/components/progress";

export default function ProblemLoading() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Button Skeleton */}
        <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />

        {/* Progress Skeleton */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-sm mb-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
          <Progress value={0} className="animate-pulse" />
        </div>

        {/* Problem Card Skeleton */}
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-full bg-muted rounded mb-2" />
            <div className="h-6 w-3/4 bg-muted rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="h-11 w-full bg-muted rounded" />
            </div>
          </CardContent>
        </Card>

        {/* Navigation Buttons Skeleton */}
        <div className="mt-6 flex gap-3">
          <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
          <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
        </div>
      </main>

      <Navigation />
    </div>
  );
}
