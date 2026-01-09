import { Card, CardContent, CardHeader } from "@/shared/ui/components/card";

export default function WrongProblemsLoading() {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header with Back Button Skeleton */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-10 w-10 bg-muted rounded animate-pulse" />
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
      </div>

      {/* Wrong Problems List Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-full bg-muted rounded" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <div className="h-3 w-12 bg-muted rounded" />
                <div className="h-4 w-32 bg-muted rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-3 w-12 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
              </div>
              <div className="h-3 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
