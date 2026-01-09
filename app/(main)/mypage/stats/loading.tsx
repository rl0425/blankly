import { Header } from "@/features/auth/components/Header";
import { Navigation } from "@/features/auth/components/Navigation";
import { Card, CardContent, CardHeader } from "@/shared/ui/components/card";

export default function StatsLoading() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header with Back Button Skeleton */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-10 w-10 bg-muted rounded animate-pulse" />
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        </div>

        <div className="space-y-6">
          {/* Stats Card Skeleton */}
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-5 w-20 bg-muted rounded" />
                  <div className="h-5 w-16 bg-muted rounded" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Chart Placeholder Skeleton */}
          <Card className="animate-pulse">
            <CardContent className="py-8">
              <div className="h-32 bg-muted rounded" />
            </CardContent>
          </Card>
        </div>
      </main>

      <Navigation />
    </div>
  );
}
