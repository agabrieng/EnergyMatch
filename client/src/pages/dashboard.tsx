import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { PlusCircle, Handshake, PiggyBank, Eye, Building, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
// Removido imports do localStorage - usando apenas banco de dados

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Buscar acessos de parceiros direto do banco
  const { data: partnerAccesses = [], isLoading: isLoadingAccesses } = useQuery<any[]>({
    queryKey: ["/api/user-partner-accesses"],
    enabled: !!user,
    refetchInterval: 5000, // Atualizar a cada 5 segundos
    refetchOnWindowFocus: true,
  });

  // Mutação para atualizar status no banco
  const updateStatusMutation = useMutation({
    mutationFn: async ({ comercializadoraId, receivedResponse }: { comercializadoraId: string; receivedResponse: boolean }) => {
      const response = await fetch('/api/user-partner-access-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          comercializadoraId, 
          accessId: comercializadoraId, // Enviar também como accessId para identificação única
          receivedResponse 
        }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: async () => {
      // Invalidar cache para recarregar dados atualizados
      queryClient.invalidateQueries({ queryKey: ["/api/user-partner-accesses"] });
      
      // Dados já atualizados via invalidateQueries
      
      toast({
        title: "Status atualizado",
        description: "O status da resposta foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da resposta.",
        variant: "destructive",
      });
    },
  });

  // Redirect non-users
  useEffect(() => {
    if (user && user.role !== "user") {
      switch (user.role) {
        case "admin":
          setLocation("/admin-dashboard");
          break;
        case "comercializadora":
          setLocation("/comercializadora-dashboard");
          break;
      }
    }
  }, [user, setLocation]);

  const { data: intents = [] } = useQuery<any[]>({
    queryKey: ["/api/purchase-intents"],
    enabled: !!user,
    refetchInterval: 30000, // Recarregar dados a cada 30 segundos
    refetchOnWindowFocus: true, // Recarregar quando janela volta ao foco
  });

  const activeIntents = intents.filter((intent: any) => intent.status === "active");
  const proposalsReceived = intents.reduce((count: number, intent: any) => {
    return count + (intent.proposals?.length || 0);
  }, 0);

  // Função para atualizar status de resposta direto no banco
  const handlePartnerResponseStatusChange = async (accessId: string, checked: boolean) => {
    if (checked && user?.id) {
      updateStatusMutation.mutate({
        comercializadoraId: accessId,
        receivedResponse: true,
      });
    }
  };

  // Função para obter badge de status baseado no estado da seleção
  const getPartnerStatusBadge = (selection: any) => {
    if (selection.receivedResponse) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
        ✓ Disponível para Nova Intenção
      </Badge>;
    } else {
      return <Badge variant="outline">Aguardando Resposta</Badge>;
    }
  };


  if (!user || user.role !== "user") {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" data-testid="sidebar-trigger" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>Plataforma</span>
            <span>•</span>
            <span className="text-foreground font-medium">Dashboard</span>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard do Cliente</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie suas intenções de compra e acompanhe propostas recebidas
            </p>
          </div>

          <div className="dashboard-grid">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Intenções Ativas</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-active-intents">
                      {activeIntents.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <PlusCircle className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Propostas Recebidas</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-proposals-received">
                      {proposalsReceived}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <Handshake className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Economia Estimada</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-estimated-savings">
                      R$ 0
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                    <PiggyBank className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Centro de Controle - Parceiros Consultados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingAccesses ? (
                  <p className="text-center text-muted-foreground py-8">Carregando...</p>
                ) : partnerAccesses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-no-partners">
                    Nenhuma comercializadora consultada ainda.
                  </p>
                ) : (
                  partnerAccesses.map((selection: any, index: number) => (
                    <div key={selection.id || selection.accessId} className="p-4 bg-muted/50 rounded-lg space-y-3" data-testid={`card-partner-${index}`}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">Parceiro #{(selection.accessId || selection.id || '').slice(-6)}</p>
                            {getPartnerStatusBadge(selection)}
                          </div>
                          
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building className="h-3 w-3" />
                            <span>{selection.comercializadora?.companyName || 'Comercializadora'}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span className="font-medium">Primeiro acesso:</span>
                              </div>
                              <div className="ml-4">
                                <div>{format(new Date(selection.firstAccess), "dd/MM/yyyy", { locale: ptBR })}</div>
                                <div>{format(new Date(selection.firstAccess), "HH:mm", { locale: ptBR })}</div>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span className="font-medium">Último acesso:</span>
                              </div>
                              <div className="ml-4">
                                <div>{format(new Date(selection.lastAccess), "dd/MM/yyyy", { locale: ptBR })}</div>
                                <div>{format(new Date(selection.lastAccess), "HH:mm", { locale: ptBR })}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2 pt-2 border-t border-muted">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`partner-response-${selection.accessId || selection.id}`}
                            checked={selection.receivedResponse}
                            disabled={selection.receivedResponse} // Desabilitar se já foi marcado
                            onCheckedChange={(checked) => {
                              // Só permitir marcar, não desmarcar
                              if (checked === true && !selection.receivedResponse) {
                                handlePartnerResponseStatusChange(selection.accessId || selection.id, true);
                              }
                            }}
                            data-testid={`checkbox-partner-response-${index}`}
                          />
                          <label 
                            htmlFor={`partner-response-${selection.accessId || selection.id}`} 
                            className={`text-sm ${selection.receivedResponse ? 'text-muted-foreground/60 cursor-not-allowed' : 'text-muted-foreground cursor-pointer'}`}
                          >
                            Já recebi resposta desta comercializadora
                          </label>
                        </div>
                        {selection.receivedResponse && (
                          <div className="ml-6 text-xs text-green-600 dark:text-green-400">
                            ✓ Agora você pode criar uma nova intenção para esta comercializadora
                            <span className="block text-muted-foreground mt-1">
                              Esta ação não pode ser revertida
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <Button 
                  className="w-full" 
                  onClick={() => setLocation("/iframe-purchase-intent")}
                  data-testid="button-create-intent"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Nova Intenção via Parceiro
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Propostas Recentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {proposalsReceived === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-no-proposals">
                    Nenhuma proposta recebida ainda.
                  </p>
                ) : (
                  // This will be populated when we have real proposals
                  <p className="text-center text-muted-foreground py-8">
                    Carregando propostas...
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
