import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  FileText
} from "lucide-react";

export default function AdminSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importData, setImportData] = useState("");
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  // Query database info
  const { data: dbInfo } = useQuery({
    queryKey: ["/api/admin/database-info"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Export data mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/export-data", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Erro ao exportar dados');
      return response.json();
    },
    onSuccess: (data) => {
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `energymatch-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export realizado com sucesso",
        description: "Arquivo de backup baixado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no export",
        description: error.message || "Erro ao exportar dados",
        variant: "destructive",
      });
    },
  });

  // Import data mutation
  const importMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/import-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao importar dados');
      return response.json();
    },
    onSuccess: (result) => {
      setLastSyncResult(result);
      toast({
        title: "Import realizado com sucesso",
        description: `Importados: ${result.imported.users} usuários, ${result.imported.purchaseIntents} intenções`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/solicitations-tracking"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no import",
        description: error.message || "Erro ao importar dados",
        variant: "destructive",
      });
    },
  });

  // Sync from production mutation
  const syncMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/sync-from-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao sincronizar dados');
      return response.json();
    },
    onSuccess: (result) => {
      setLastSyncResult(result);
      toast({
        title: "Sincronização concluída",
        description: `Sincronizados: ${result.imported.users} usuários, ${result.imported.purchaseIntents} intenções`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/solicitations-tracking"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao sincronizar com produção",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!importData.trim()) {
      toast({
        title: "Dados inválidos",
        description: "Por favor, cole os dados JSON para importar",
        variant: "destructive",
      });
      return;
    }

    try {
      const parsedData = JSON.parse(importData);
      importMutation.mutate(parsedData);
    } catch (error) {
      toast({
        title: "JSON inválido",
        description: "Por favor, verifique o formato dos dados JSON",
        variant: "destructive",
      });
    }
  };

  const handleSyncFromProduction = () => {
    if (!importData.trim()) {
      toast({
        title: "Dados de produção inválidos",
        description: "Por favor, cole os dados JSON da produção",
        variant: "destructive",
      });
      return;
    }

    try {
      const parsedData = JSON.parse(importData);
      syncMutation.mutate(parsedData);
    } catch (error) {
      toast({
        title: "JSON inválido",
        description: "Por favor, verifique o formato dos dados JSON da produção",
        variant: "destructive",
      });
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-lg font-semibold">Sincronização de Dados</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Database Environment Info */}
          {dbInfo && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ambiente do Banco de Dados</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={dbInfo.isProduction ? "destructive" : "secondary"}>
                      {dbInfo.environment.toUpperCase()}
                    </Badge>
                    {dbInfo.schema && (
                      <Badge variant="outline">
                        Schema: {dbInfo.schema}
                      </Badge>
                    )}
                    {dbInfo.connectionConfigured ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {dbInfo.connectionConfigured ? "Conectado" : "Não configurado"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dbInfo.isProduction ? 
                      "🏭 Dados salvos no banco de PRODUÇÃO" : 
                      "🔧 Dados salvos no banco de DESENVOLVIMENTO"
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Export Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Export de Dados</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Exporta todos os dados do ambiente atual em formato JSON
                  </p>
                  <Button 
                    onClick={() => exportMutation.mutate()}
                    disabled={exportMutation.isPending}
                    className="w-full"
                    data-testid="button-export-data"
                  >
                    {exportMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Exportar Dados
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Import de Dados</CardTitle>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Importa dados de backup para o ambiente atual
                  </p>
                  <Button 
                    onClick={handleImport}
                    disabled={importMutation.isPending || !importData.trim()}
                    className="w-full"
                    data-testid="button-import-data"
                  >
                    {importMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Importar Dados
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sync Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sync Produção</CardTitle>
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Sincroniza dados da produção para desenvolvimento
                  </p>
                  <Button 
                    onClick={handleSyncFromProduction}
                    disabled={syncMutation.isPending || !importData.trim()}
                    className="w-full"
                    data-testid="button-sync-production"
                  >
                    {syncMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-4 w-4" />
                    )}
                    Sincronizar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Input Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dados para Import/Sincronização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="import-data">Cole os dados JSON aqui:</Label>
                <Textarea
                  id="import-data"
                  placeholder="Cole aqui os dados JSON exportados da produção ou de backup..."
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  data-testid="textarea-import-data"
                />
              </div>
              {importData && (
                <div className="text-xs text-muted-foreground">
                  {importData.length} caracteres • {importData.split('\n').length} linhas
                </div>
              )}
            </CardContent>
          </Card>

          {/* Last Sync Result */}
          {lastSyncResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {lastSyncResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  Resultado da Última Operação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={lastSyncResult.success ? "default" : "destructive"}>
                      {lastSyncResult.success ? "Sucesso" : "Erro"}
                    </Badge>
                    {lastSyncResult.message && (
                      <span className="text-sm text-muted-foreground">
                        {lastSyncResult.message}
                      </span>
                    )}
                  </div>

                  {lastSyncResult.imported && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold" data-testid="text-imported-users">
                          {lastSyncResult.imported.users}
                        </div>
                        <div className="text-xs text-muted-foreground">Usuários</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold" data-testid="text-imported-comercializadoras">
                          {lastSyncResult.imported.comercializadoras}
                        </div>
                        <div className="text-xs text-muted-foreground">Comercializadoras</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold" data-testid="text-imported-intents">
                          {lastSyncResult.imported.purchaseIntents}
                        </div>
                        <div className="text-xs text-muted-foreground">Intenções</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold" data-testid="text-imported-proposals">
                          {lastSyncResult.imported.proposals}
                        </div>
                        <div className="text-xs text-muted-foreground">Propostas</div>
                      </div>
                    </div>
                  )}

                  {lastSyncResult.errors && lastSyncResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-red-600">Erros encontrados:</h4>
                      <ul className="text-xs space-y-1 text-red-600">
                        {lastSyncResult.errors.map((error: string, index: number) => (
                          <li key={index} className="list-disc list-inside">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}