import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Plus, RefreshCw, Trash2, ExternalLink, Star, CircleDot } from "lucide-react";

export default function Repos() {
  const utils = trpc.useUtils();
  const { data: repos, isLoading } = trpc.github.listRepos.useQuery();
  const syncRepo = trpc.github.syncRepo.useMutation({
    onSuccess: () => {
      utils.github.listRepos.invalidate();
      utils.dashboard.stats.invalidate();
    },
  });
  const autoSync = trpc.github.autoSyncAll.useMutation({
    onSuccess: () => {
      utils.github.listRepos.invalidate();
      utils.dashboard.stats.invalidate();
      utils.issues.list.invalidate();
      utils.alerts.list.invalidate();
    },
  });
  const deleteRepo = trpc.github.deleteRepo.useMutation({
    onSuccess: () => utils.github.listRepos.invalidate(),
  });
  const addRepo = trpc.github.addRepo.useMutation({
    onSuccess: () => {
      utils.github.listRepos.invalidate();
      setAddOpen(false);
      setOwner("");
      setName("");
    },
  });

  const [addOpen, setAddOpen] = useState(false);
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const handleSync = async (id: number) => {
    setSyncingId(id);
    try {
      await syncRepo.mutateAsync({ id });
    } finally {
      setSyncingId(null);
    }
  };

  if (isLoading) {
    return <ReposSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Repositorios</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {repos?.length ?? 0} repos conectados
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => autoSync.mutate()}
            disabled={autoSync.isPending || !repos?.length}
          >
            <RefreshCw className={`w-4 h-4 ${autoSync.isPending ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar repositorio</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium">Owner</label>
                  <Input
                    placeholder="ej: facebook"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium">Nombre del repo</label>
                  <Input
                    placeholder="ej: react"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => addRepo.mutate({ owner, name })}
                  disabled={!owner.trim() || !name.trim() || addRepo.isPending}
                >
                  {addRepo.isPending ? "Agregando..." : "Agregar repositorio"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {repos?.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <GitBranch className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Sin repositorios</p>
            <p className="text-xs text-muted-foreground mt-1">
              Agrega tu primer repositorio para empezar el monitoreo
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {repos?.map((repo) => (
          <Card key={repo.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm truncate">{repo.fullName}</p>
                    <Badge variant={repo.isActive ? "default" : "secondary"} className="text-[10px] h-5">
                      {repo.isActive ? "Activo" : "Pausado"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {repo.description || "Sin descripción"}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Star className="w-3 h-3" />
                      {repo.stars ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CircleDot className="w-3 h-3" />
                      {repo.openIssuesCount ?? 0} issues
                    </span>
                    {repo.language && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {repo.language}
                      </Badge>
                    )}
                  </div>
                  {repo.lastSyncedAt && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Sincronizado: {new Date(repo.lastSyncedAt).toLocaleString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => handleSync(repo.id)}
                  disabled={syncingId === repo.id}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${syncingId === repo.id ? "animate-spin" : ""}`} />
                  Sincronizar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => window.open(repo.url || `https://github.com/${repo.fullName}`, "_blank")}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Ver
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => deleteRepo.mutate({ id: repo.id })}
                  disabled={deleteRepo.isPending}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReposSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-36 rounded-xl" />
      ))}
    </div>
  );
}
