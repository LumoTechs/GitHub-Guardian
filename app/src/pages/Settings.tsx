import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LogOut,
  User,
  Shield,
  Bell,
  Monitor,
  Github,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function Settings() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const autoSync = trpc.github.autoSyncAll.useMutation({
    onSuccess: () => {
      utils.dashboard.stats.invalidate();
      utils.github.listRepos.invalidate();
      utils.issues.list.invalidate();
      utils.alerts.list.invalidate();
    },
  });

  if (authLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <div>
        <h1 className="text-xl font-bold">Configuración</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Gestiona tu cuenta y preferencias
        </p>
      </div>

      {/* User Profile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border">
              <AvatarFallback className="text-sm bg-primary/10 text-primary">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{user?.name || "Usuario"}</p>
              <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
              <Badge variant="outline" className="text-[10px] h-4 mt-1">
                {user?.role || "user"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Monitoreo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{stats?.repos.total ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Repositorios</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{stats?.repos.recentlySynced ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Sincronizados hoy</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => autoSync.mutate()}
            disabled={autoSync.isPending}
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoSync.isPending ? "animate-spin" : ""}`} />
            {autoSync.isPending ? "Sincronizando..." : "Sincronizar todos ahora"}
          </Button>
        </CardContent>
      </Card>

      {/* GitHub Connection - NUEVO */}
      <GitHubSettingsCard />

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-medium">Alertas push</p>
              <p className="text-[10px] text-muted-foreground">Notificaciones en tiempo real</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">Pronto</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="text-xs font-medium">Email</p>
              <p className="text-[10px] text-muted-foreground">Resumen diario</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">Pronto</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── NUEVO COMPONENTE: GitHub Settings Card ─────────────────────────────────

function GitHubSettingsCard() {
  const { data: tokenStatus, isLoading: statusLoading } =
    trpc.github.getGitHubTokenStatus.useQuery();
  const testMutation = trpc.github.testGitHubConnection.useMutation();

  const isConfigured = tokenStatus?.configured ?? false;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Github className="w-4 h-4" />
          GitHub
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col gap-3">
        {/* Estado del token */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          {statusLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : isConfigured ? (
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium">
              {statusLoading
                ? "Comprobando..."
                : isConfigured
                ? "Token configurado"
                : "Token no configurado"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isConfigured
                ? "La sincronización con la API de GitHub está activa."
                : "Añade GITHUB_TOKEN en las variables de entorno para sincronizar repositorios reales."}
            </p>
          </div>
        </div>

        {/* Botón probar conexión */}
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => testMutation.mutate()}
          disabled={!isConfigured || testMutation.isPending}
        >
          {testMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Probando...
            </>
          ) : (
            <>
              <Github className="w-4 h-4 mr-2" />
              Probar conexión
            </>
          )}
        </Button>

        {/* Resultado de la prueba */}
        {testMutation.isSuccess && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950 px-3 py-2 text-xs text-green-800 dark:text-green-200">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">
              Conectado como <strong>@{testMutation.data.username}</strong>
              {testMutation.data.displayName !== testMutation.data.username &&
                ` (${testMutation.data.displayName})`}
            </span>
          </div>
        )}

        {testMutation.isError && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950 px-3 py-2 text-xs text-red-800 dark:text-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="truncate">{testMutation.error.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
