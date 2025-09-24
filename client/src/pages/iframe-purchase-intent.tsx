import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Removido import localStorage - usando apenas banco de dados

export default function IframePurchaseIntent() {
  const { user } = useAuth();
  const [selectedComercializadoraId, setSelectedComercializadoraId] = useState("");

  // Buscar comercializadoras aprovadas que tenham iframe configurado
  const { data: comercializadoras = [], isLoading: loadingComercializadoras } = useQuery({
    queryKey: ["/api/comercializadoras/approved"],
    queryFn: async () => {
      const response = await fetch("/api/comercializadoras/approved");
      if (!response.ok) {
        throw new Error('Failed to fetch comercializadoras');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
  });

  // Filtrar comercializadoras que têm link de afiliado configurado
  const comercializadorasWithIframe = comercializadoras.filter(
    (comercializadora: any) => comercializadora.affiliateLink && comercializadora.affiliateLink.trim() !== ""
  );

  const selectedComercializadora = comercializadorasWithIframe.find(
    (c: any) => c.id === selectedComercializadoraId
  );

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
            <span className="text-foreground font-medium">Intenção via Parceiro</span>
          </div>
        </header>

        <div className="flex-1 space-y-6 p-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
              Criar Intenção via Parceiro
            </h1>
            <p className="text-muted-foreground">
              Crie sua intenção de compra diretamente através do formulário de nossos parceiros.
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Algumas comercializadoras oferecem formulários especializados para criar intenções de compra. 
              Selecione uma comercializadora abaixo para acessar seu formulário específico.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Selecionar Comercializadora
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingComercializadoras ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : comercializadorasWithIframe.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma comercializadora com formulário especializado disponível no momento.</p>
                  <p className="text-sm mt-2">
                    Você pode criar uma intenção através do <a href="/purchase-intent" className="text-primary hover:underline">formulário padrão</a>.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="comercializadora-select" className="text-sm font-medium mb-2 block">
                      Escolha uma comercializadora:
                    </label>
                    <Select 
                      value={selectedComercializadoraId} 
                      onValueChange={async (value) => {
                        setSelectedComercializadoraId(value);
                        const selected = comercializadorasWithIframe.find((c: any) => c.id === value);
                        if (selected) {
                          // Registrar acesso diretamente no banco
                          try {
                            const response = await fetch('/api/partner-accesses/register', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              credentials: 'include',
                              body: JSON.stringify({
                                comercializadoraId: selected.id,
                                companyName: selected.companyName,
                              }),
                            });
                            
                            if (!response.ok) {
                              console.error('Erro ao registrar acesso');
                            }
                          } catch (error) {
                            console.error('Erro ao registrar acesso:', error);
                          }
                        }
                      }}
                      data-testid="select-comercializadora"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma comercializadora..." />
                      </SelectTrigger>
                      <SelectContent>
                        {comercializadorasWithIframe.map((comercializadora: any) => (
                          <SelectItem key={comercializadora.id} value={comercializadora.id} data-testid={`option-comercializadora-${comercializadora.id}`}>
                            {comercializadora.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedComercializadora && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold" data-testid="selected-company-name">
                            {selectedComercializadora.companyName}
                          </h3>
                          <Badge variant="secondary">Formulário Especializado</Badge>
                        </div>
                      </div>
                      
                      {selectedComercializadora.description && (
                        <p className="text-sm text-muted-foreground mb-4" data-testid="company-description">
                          {selectedComercializadora.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedComercializadora && selectedComercializadora.affiliateLink && (
            <Card>
              <CardHeader>
                <CardTitle>Formulário da {selectedComercializadora.companyName}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative">
                  <iframe
                    src={selectedComercializadora.affiliateLink}
                    width="100%"
                    height="800px"
                    frameBorder="0"
                    allowFullScreen
                    title={`Formulário ${selectedComercializadora.companyName}`}
                    className="w-full border-0 rounded-b-lg"
                    data-testid="commercializadora-iframe"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}