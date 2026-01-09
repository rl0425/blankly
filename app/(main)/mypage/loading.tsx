import { Header } from "@/features/auth/components/Header";
import { Navigation } from "@/features/auth/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card";

export default function MyPageLoading() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Title Skeleton */}
        <div className="h-8 w-32 bg-muted rounded animate-pulse mb-8" />

        {/* Profile Card Skeleton */}
        <Card className="mb-6 animate-pulse">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-24 bg-muted rounded" />
                <div className="h-4 w-48 bg-muted rounded" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-8 w-12 bg-muted rounded mx-auto mb-1" />
                  <div className="h-3 w-16 bg-muted rounded mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Menu Items Skeleton */}
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-24 bg-muted rounded" />
                    <div className="h-4 w-40 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-5 w-5 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Navigation />
    </div>
  );
}
