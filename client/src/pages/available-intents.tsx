import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { Eye, Plus } from "lucide-react";

export default function AvailableIntents() {
  const { user } = useAuth();
  const [billValueFilter, setBillValueFilter] = useState("");
  const [consumptionTypeFilter, setConsumptionTypeFilter] = useState("");

  const { data: intents = [] } = useQuery<any[]>({
    queryKey: ["/api/purchase-intents"],
    enabled: !!user,
  });

  const filteredIntents = intents.filter((intent: any) => {
    if (intent.status !== "active") return false;
    if (billValueFilter && intent.billValue !== billValueFilter) return false;
    if (consumptionTypeFilter && intent.consumptionType !== consumptionTypeFilter) return false;
    return true;
  });

  const formatBillValue = (value: string) => {
    switch (value) {
      case "below-5000":
        return "Abaixo de R$ 5.000";
      case "5000-8000":
        return "R$ 5.000 - R$ 8.000";
      case "8000-15000":
        return "R$ 8.000 - R$ 15.000";
      case "above-15000":
        return "Acima de R$ 15.000";
      default:
        return value;
    }
  };

  const formatConsumptionType = (type: string) => {
    switch (type) {
      case "residential":
        return "Residencial";
      case "commercial":
        return "Comercial";
      case "industrial":
        return "Industrial";
      default:
        return type;
    }
  };

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
            <span className="text-foreground font-medium">Intenções Disponíveis</span>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Intenções Disponíveis</h1>
              <p className="text-muted-foreground mt-2">
                Encontre clientes em potencial e crie propostas competitivas
              </p>
            </div>
            <div className="flex gap-2">
              <Select value={billValueFilter} onValueChange={setBillValueFilter}>
                <SelectTrigger className="w-[200px]" data-testid="filter-bill-value">
                  <SelectValue placeholder="Todas as faixas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as faixas</SelectItem>
                  <SelectItem value="below-5000">Abaixo de R$ 5.000</SelectItem>
                  <SelectItem value="5000-8000">R$ 5.000 - R$ 8.000</SelectItem>
                  <SelectItem value="8000-15000">R$ 8.000 - R$ 15.000</SelectItem>
                  <SelectItem value="above-15000">Acima de R$ 15.000</SelectItem>
                </SelectContent>
              </Select>
              <Select value={consumptionTypeFilter} onValueChange={setConsumptionTypeFilter}>
                <SelectTrigger className="w-[180px]" data-testid="filter-consumption-type">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os tipos</SelectItem>
                  <SelectItem value="residential">Residencial</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4">
            {filteredIntents.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground" data-testid="text-no-filtered-intents">
                    Nenhuma intenção encontrada com os filtros aplicados.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredIntents.map((intent: any, index: number) => (
                <Card key={intent.id} data-testid={`card-intent-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          Intenção #{intent.id.slice(-6)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Criada em {new Date(intent.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Badge variant="secondary">Ativa</Badge>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-3 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Faixa de Valor</p>
                        <p className="font-medium text-foreground">
                          {formatBillValue(intent.billValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tipo de Consumo</p>
                        <p className="font-medium text-foreground">
                          {formatConsumptionType(intent.consumptionType)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Empresa</p>
                        <p className="font-medium text-foreground">
                          {intent.company || "Individual"}
                        </p>
                      </div>
                    </div>

                    {intent.additionalInfo && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-1">Informações Adicionais</p>
                        <p className="text-sm text-foreground">{intent.additionalInfo}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" data-testid={`button-view-details-${index}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      <Button className="flex-1" data-testid={`button-create-proposal-${index}`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Proposta
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
