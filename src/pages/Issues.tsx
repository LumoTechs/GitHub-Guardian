import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bug, ExternalLink, AlertTriangle, Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const severityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 border-red-200",
  high: "bg-orange-500/10 text-orange-700 border-orange-200",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  low: "bg-blue-500/10 text-blue-700 border-blue-200",
};

const statusColors: Record<string, string> = {
  new: "bg-purple-500/10 text-purple-700",
  reviewing: "bg-blue-500/10 text-blue-700",
  resolved: "bg-green-500/10 text-green-700",
  ignored: "bg-gray-500/10 text-gray-700",
};

export default function Issues() {
  const utils = trpc.useUtils();
  const { data: issues, isLoading } = trpc.issues.list.useQuery();
  const { data: stats } = trpc.issues.stats.useQuery();
  const updateStatus = trpc.issues.updateStatus.useMutation({
    onSuccess: () => {
      utils.issues.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
  });

  const [filter, setFilter] = useState<"all" | "bug" | "critical">("all");

  const filtered = issues?.filter((issue) => {
    if (filter === "bug") return issue.isBug;
    if (filter === "critical") return issue.severity === "critical" || issue.severity === "high";
    return true;
  });

  if (isLoading) {
    return <IssuesSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <div>
        <h1 className="text-xl font-bold">Issues & Bugs</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {stats?.open ?? 0} abiertas · {stats?.bugs ?? 0} bugs · {stats?.critical ?? 0} críticas
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className="text-xs shrink-0"
        >
          Todas
        </Button>
        <Button
          size="sm"
          variant={filter === "bug" ? "default" : "outline"}
          onClick={() => setFilter("bug")}
          className="text-xs shrink-0"
        >
          <Bug className="w-3 h-3 mr-1" />
          Bugs
        </Button>
        <Button
          size="sm"
          variant={filter === "critical" ? "default" : "outline"}
          onClick={() => setFilter("critical")}
          className="text-xs shrink-0"
        >
          <AlertTriangle className="w-3 h-3 mr-1" />
          Críticas
        </Button>
      </div>

      {filtered?.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Bug className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Sin issues</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sincroniza un repositorio para detectar issues
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {filtered?.map((issue) => (
          <Card key={issue.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  issue.state === "open" ? "bg-green-500" : "bg-gray-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-sm">#{issue.number}</p>
                    {issue.isBug && (
                      <Badge variant="outline" className="text-[10px] h-4 border-red-200 text-red-600">
                        BUG
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[10px] h-4 ${severityColors[issue.severity || "low"]}`}>
                      {issue.severity?.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold line-clamp-2">{issue.title}</p>
                  {issue.aiSummary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {issue.aiSummary}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary" className={`text-[10px] h-4 ${statusColors[issue.status]}`}>
                      {issue.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(issue.githubCreatedAt || issue.createdAt).toLocaleDateString("es-ES")}
                    </span>
                    {issue.author && (
                      <span className="text-[10px] text-muted-foreground">
                        by {issue.author}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <select
                      value={issue.status}
                      onChange={(e) =>
                        updateStatus.mutate({
                          id: issue.id,
                          status: e.target.value as "new" | "reviewing" | "resolved" | "ignored",
                        })
                      }
                      className="text-xs border rounded-md px-2 py-1 bg-background"
                    >
                      <option value="new">Nueva</option>
                      <option value="reviewing">Revisando</option>
                      <option value="resolved">Resuelta</option>
                      <option value="ignored">Ignorar</option>
                    </select>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => window.open(issue.url || "", "_blank")}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      GitHub
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function IssuesSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  );
}
