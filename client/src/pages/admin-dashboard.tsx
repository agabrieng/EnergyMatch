import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { Users, Building, BarChart3, Settings, Plus, Eye, ClipboardList, Activity, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== "admin") {
      switch (user.role) {
        case "comercializadora":
          setLocation("/comercializadora-dashboard");
          break;
        default:
          setLocation("/dashboard");
      }
    }
  }, [user, setLocation]);

  const { data: stats } = useQuery<{ totalUsers: number; activeComercializadoras: number; monthlyTransactions: number }>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user && user.role === "admin",
  });

  const { data: weeklyActivity = [], isLoading: loadingActivity } = useQuery<any[]>({
    queryKey: ["/api/admin/weekly-activity"],
    enabled: !!user && user.role === "admin",
  });

  if (!user || user.role !== "admin") {
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
            <span className="text-foreground font-medium">Dashboard Admin</span>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie usuários, comercializadoras e monitore a plataforma
            </p>
          </div>

          <div className="dashboard-grid">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-users">
                      {stats?.totalUsers || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">+12% este mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Comercializadoras Ativas</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-active-comercializadoras">
                      {stats?.activeComercializadoras || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <Building className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">+3 novas este mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Transações Mensais</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-monthly-transactions">
                      {stats?.monthlyTransactions || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">+28% este mês</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Movimentações da Semana
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingActivity ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-loading-activity">
                    Carregando movimentações...
                  </p>
                ) : weeklyActivity.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-no-activity">
                    Nenhuma movimentação esta semana
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {weeklyActivity.slice(0, 10).map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg" data-testid={`activity-item-${index}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{activity.userName || 'Usuário'}</span>
                            {activity.type === 'partner_access' && (
                              <Badge variant="outline" className="text-xs">Acesso</Badge>
                            )}
                            {activity.type === 'purchase_intent' && (
                              <Badge variant="secondary" className="text-xs">Solicitação</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.comercializadoraName || 'Comercializadora'} • {activity.details}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {activity.date ? format(new Date(activity.date), 'dd/MM HH:mm', { locale: ptBR }) : 'Data não disponível'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start"
                  onClick={() => setLocation("/admin-solicitations-tracking")}
                  data-testid="button-tracking-solicitations"
                >
                  <ClipboardList className="h-4 w-4 mr-3" />
                  Tracking de Solicitações
                </Button>
                <Button 
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setLocation("/comercializadora-registration")}
                  data-testid="button-register-comercializadora"
                >
                  <Plus className="h-4 w-4 mr-3" />
                  Cadastrar Nova Comercializadora
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-manage-users">
                  <Users className="h-4 w-4 mr-3" />
                  Gerenciar Usuários
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-view-analytics">
                  <BarChart3 className="h-4 w-4 mr-3" />
                  Relatórios e Analytics
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-system-settings">
                  <Settings className="h-4 w-4 mr-3" />
                  Configurações do Sistema
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
