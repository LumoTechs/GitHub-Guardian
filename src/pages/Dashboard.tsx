import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch, Bug, GitPullRequest, Bell, AlertTriangle, Shield, Clock } from "lucide-react";
import { useNavigate } from "react-router";

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const navigate = useNavigate();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const statCards = [
    {
      label: "Repos activos",
      value: stats?.repos.active ?? 0,
      total: stats?.repos.total ?? 0,
      icon: GitBranch,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      onClick: () => navigate("/repos"),
    },
    {
      label: "Issues abiertas",
      value: stats?.issues.open ?? 0,
      total: stats?.issues.total ?? 0,
      icon: Bug,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      onClick: () => navigate("/issues"),
    },
    {
      label: "Bug fixes PRs",
      value: stats?.pullRequests.bugFixes ?? 0,
      total: stats?.pullRequests.total ?? 0,
      icon: GitPullRequest,
      color: "text-green-500",
      bg: "bg-green-500/10",
      onClick: () => navigate("/alerts"),
    },
    {
      label: "Alertas sin leer",
      value: stats?.alerts.unread ?? 0,
      total: stats?.alerts.total ?? 0,
      icon: Bell,
      color: "text-red-500",
      bg: "bg-red-500/10",
      onClick: () => navigate("/alerts"),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Monitoreo activo 24/7
        </p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className="cursor-pointer active:scale-[0.98] transition-transform"
            onClick={card.onClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <span className="text-[10px] text-muted-foreground">{card.total} total</span>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Critical Alerts */}
      {(stats?.issues.critical ?? 0) > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {stats?.issues.critical} issues críticos
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80">
                Requieren atención inmediata
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {stats?.recentLogs && stats.recentLogs.length > 0 ? (
            <div className="flex flex-col gap-3">
              {stats.recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    log.status === "success" ? "bg-green-500" :
                    log.status === "error" ? "bg-red-500" : "bg-yellow-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{log.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              Sin actividad reciente. Sincroniza un repositorio para empezar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Acciones rápidas</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex flex-col gap-2">
          <button
            onClick={() => navigate("/repos")}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 active:bg-muted transition-colors text-left"
          >
            <Shield className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Agregar repositorio</p>
              <p className="text-[10px] text-muted-foreground">Conecta un repo para monitorear</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/alerts")}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 active:bg-muted transition-colors text-left"
          >
            <Bell className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Ver alertas</p>
              <p className="text-[10px] text-muted-foreground">
                {stats?.alerts.unread ?? 0} sin leer
              </p>
            </div>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
