import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Bell, Check, Shield, Bug, GitPullRequest, AlertTriangle, Zap, Server } from "lucide-react";

const alertIcons: Record<string, React.ReactNode> = {
  new_bug: <Bug className="w-4 h-4" />,
  critical_issue: <AlertTriangle className="w-4 h-4" />,
  pr_bug_fix: <GitPullRequest className="w-4 h-4" />,
  security_alert: <Shield className="w-4 h-4" />,
  performance_issue: <Zap className="w-4 h-4" />,
  ci_failure: <Server className="w-4 h-4" />,
  general: <Bell className="w-4 h-4" />,
};

const alertColors: Record<string, string> = {
  new_bug: "bg-red-500/10 text-red-600",
  critical_issue: "bg-red-500/10 text-red-600",
  pr_bug_fix: "bg-green-500/10 text-green-600",
  security_alert: "bg-orange-500/10 text-orange-600",
  performance_issue: "bg-yellow-500/10 text-yellow-600",
  ci_failure: "bg-purple-500/10 text-purple-600",
  general: "bg-blue-500/10 text-blue-600",
};

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function Alerts() {
  const utils = trpc.useUtils();
  const { data: alerts, isLoading } = trpc.alerts.list.useQuery();
  const { data: unreadAlerts } = trpc.alerts.unread.useQuery();
  const markAsRead = trpc.alerts.markAsRead.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      utils.alerts.unread.invalidate();
      utils.dashboard.stats.invalidate();
    },
  });
  const markAsResolved = trpc.alerts.markAsResolved.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      utils.alerts.unread.invalidate();
      utils.dashboard.stats.invalidate();
    },
  });

  const unreadCount = unreadAlerts?.length ?? 0;

  if (isLoading) {
    return <AlertsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Alertas</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {unreadCount} sin leer · {alerts?.length ?? 0} total
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              unreadAlerts?.forEach((alert) => markAsRead.mutate({ id: alert.id }));
            }}
            disabled={markAsRead.isPending}
          >
            <Check className="w-4 h-4 mr-1" />
            Marcar todo
          </Button>
        )}
      </div>

      {alerts?.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Sin alertas</p>
            <p className="text-xs text-muted-foreground mt-1">
              Las alertas aparecerán cuando se detecten incidencias
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {alerts?.map((alert) => (
          <Card
            key={alert.id}
            className={`overflow-hidden transition-opacity ${alert.isRead ? "opacity-70" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${alertColors[alert.type]}`}>
                  {alertIcons[alert.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-sm">{alert.title}</p>
                    {!alert.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  {alert.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] h-4 ${severityColors[alert.severity]}`}>
                      {alert.severity?.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-4">
                      {alert.type.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleDateString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {!alert.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => markAsRead.mutate({ id: alert.id })}
                        disabled={markAsRead.isPending}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Leído
                      </Button>
                    )}
                    {!alert.isResolved && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-green-600"
                        onClick={() => markAsResolved.mutate({ id: alert.id })}
                        disabled={markAsResolved.isPending}
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        Resolver
                      </Button>
                    )}
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

function AlertsSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-36 rounded-xl" />
      ))}
    </div>
  );
}
