import { useAuth } from "@/hooks/useAuth";
import { LOGIN_PATH } from "@/const";
import {
  LayoutDashboard,
  GitBranch,
  Bug,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate, Outlet } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: GitBranch, label: "Repos", path: "/repos" },
  { icon: Bug, label: "Issues", path: "/issues" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function MobileLayout() {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-4">
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Bug className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-center">
            GitHub Guardian
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            Monitorea tus repositorios 24/7. Detecta bugs, incidencias y PRs en tiempo real.
          </p>
          <Button
            onClick={() => { window.location.href = LOGIN_PATH; }}
            size="lg"
            className="w-full shadow-lg"
          >
            Iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b shrink-0 bg-background/95 backdrop-blur z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bug className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">GitHub Guardian</span>
        </div>
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetTrigger asChild>
            <button className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Perfil</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-6 mt-6">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border">
                  <AvatarFallback className="text-sm bg-primary/10 text-primary">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{user.name || "Usuario"}</p>
                  <p className="text-xs text-muted-foreground">{user.email || ""}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setSettingsOpen(false); navigate("/settings"); }}
                  className="justify-start"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => { logout(); setSettingsOpen(false); }}
                  className="justify-start"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
        <Outlet />
      </main>

      {/* Bottom Navigation - iPhone style */}
      <nav className="shrink-0 h-16 bg-background/95 backdrop-blur border-t z-40 safe-area-pb">
        <div className="grid grid-cols-5 h-full">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <item.icon
                  className={`h-5 w-5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
