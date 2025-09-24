import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { Search, Send, PieChart, Plus, Link, Copy, Share2 } from "lucide-react";

export default function ComercializadoraDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [affiliateLink, setAffiliateLink] = useState("");
  const [loadingAffiliateLink, setLoadingAffiliateLink] = useState(false);

  // Redirect non-comercializadora users
  useEffect(() => {
    if (user && user.role !== "comercializadora") {
      switch (user.role) {
        case "admin":
          setLocation("/admin-dashboard");
          break;
        default:
          setLocation("/dashboard");
      }
    }
  }, [user, setLocation]);

  const { data: intents = [] } = useQuery<any[]>({
    queryKey: ["/api/purchase-intents"],
    enabled: !!user,
  });

  // Buscar dados da comercializadora logada
  const { data: comercializadora } = useQuery({
    queryKey: ["/api/comercializadoras/my-company"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/comercializadoras/my-company");
      return response.json();
    },
    enabled: !!user && user.role === "comercializadora",
  });

  // Buscar estatísticas de afiliado
  const { data: affiliateStats } = useQuery({
    queryKey: ["/api/affiliate/stats", comercializadora?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/affiliate/stats/${comercializadora.id}`);
      return response.json();
    },
    enabled: !!comercializadora?.id,
  });

  const availableIntents = intents.filter((intent: any) => intent.status === "active");

  // Função para gerar link de afiliado
  const generateAffiliateLink = async () => {
    if (!comercializadora?.id) return;

    setLoadingAffiliateLink(true);
    try {
      const response = await apiRequest("GET", `/api/affiliate/code/${comercializadora.id}`);
      const data = await response.json();
      setAffiliateLink(data.affiliateLink);
      toast({
        title: "Link de Afiliado Gerado",
        description: "Seu link de afiliado foi criado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao gerar link de afiliado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingAffiliateLink(false);
    }
  };

  // Função para copiar link para área de transferência
  const copyAffiliateLink = async () => {
    if (!affiliateLink) return;

    try {
      await navigator.clipboard.writeText(affiliateLink);
      toast({
        title: "Link Copiado",
        description: "O link de afiliado foi copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao copiar link. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (!user || user.role !== "comercializadora") {
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
            <h1 className="text-3xl font-bold text-foreground">Dashboard da Comercializadora</h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe oportunidades de negócio e gerencie suas propostas
            </p>
          </div>

          <div className="dashboard-grid">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Intenções Disponíveis</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-available-intents">
                      {availableIntents.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Propostas Enviadas</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-proposals-sent">
                      0
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Referências por Afiliados</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-affiliate-referrals">
                      {affiliateStats?.totalReferrals || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                    <Share2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Taxa de Conversão</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-conversion-rate">
                      0%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <PieChart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seção de Links de Afiliado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Gerenciar Link de Afiliado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gere um link de afiliado para receber crédito quando clientes criarem intenções através do seu link.
              </p>
              
              {!affiliateLink ? (
                <Button 
                  onClick={generateAffiliateLink}
                  disabled={loadingAffiliateLink || !comercializadora?.id}
                  className="w-full"
                  data-testid="button-generate-affiliate-link"
                >
                  {loadingAffiliateLink ? "Gerando..." : "Gerar Link de Afiliado"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Seu Link de Afiliado:</p>
                    <p className="text-xs break-all text-muted-foreground font-mono">
                      {affiliateLink}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={copyAffiliateLink}
                      className="flex-1"
                      data-testid="button-copy-affiliate-link"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Link
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={generateAffiliateLink}
                      disabled={loadingAffiliateLink}
                      data-testid="button-regenerate-affiliate-link"
                    >
                      {loadingAffiliateLink ? "Atualizando..." : "Atualizar"}
                    </Button>
                  </div>
                  
                  {affiliateStats && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Estatísticas:</p>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-lg font-bold text-blue-600">{affiliateStats.totalReferrals}</p>
                          <p className="text-xs text-blue-600">Total de Referências</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded">
                          <p className="text-lg font-bold text-green-600">R$ {affiliateStats.totalCommission}</p>
                          <p className="text-xs text-green-600">Comissão Total</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Novas Oportunidades</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableIntents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-no-opportunities">
                    Nenhuma oportunidade disponível no momento.
                  </p>
                ) : (
                  availableIntents.slice(0, 3).map((intent: any, index: number) => (
                    <div key={intent.id} className="p-4 bg-muted/50 rounded-lg" data-testid={`card-opportunity-${index}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-foreground">{intent.company || "Cliente Individual"}</p>
                          <p className="text-sm text-muted-foreground">
                            Faixa: {intent.billValue.replace("below-5000", "Abaixo de R$ 5.000")
                              .replace("5000-8000", "R$ 5.000 - R$ 8.000")
                              .replace("8000-15000", "R$ 8.000 - R$ 15.000")
                              .replace("above-15000", "Acima de R$ 15.000")}
                          </p>
                        </div>
                        <Badge variant="secondary">Nova</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {intent.consumptionType === "residential" ? "Residencial" :
                         intent.consumptionType === "commercial" ? "Comercial" : "Industrial"}
                      </p>
                      <Button size="sm" className="w-full" data-testid={`button-create-proposal-${index}`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Proposta
                      </Button>
                    </div>
                  ))
                )}
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/available-intents")}
                  data-testid="button-view-all-intents"
                >
                  Ver Todas as Intenções
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status das Propostas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-muted-foreground py-8" data-testid="text-no-proposals">
                  Nenhuma proposta enviada ainda.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
