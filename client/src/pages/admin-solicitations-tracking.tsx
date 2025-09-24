import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { CheckCircle, Clock, XCircle, AlertCircle, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminSolicitationsTracking() {
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

  const { data: solicitationsData = [], isLoading: loadingSolicitations } = useQuery<any[]>({
    queryKey: ["/api/admin/solicitations-tracking"],
    enabled: !!user && user.role === "admin",
  });

  const { data: affiliateData = [], isLoading: loadingAffiliates } = useQuery<any[]>({
    queryKey: ["/api/admin/affiliate-tracking"],
    enabled: !!user && user.role === "admin",
  });

  if (!user || user.role !== "admin") {
    return null;
  }

  const getStatusBadge = (status: string, userReceivedResponse: boolean) => {
    if (userReceivedResponse) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Respondido</Badge>;
    }
    
    switch (status) {
      case "active":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Aguardando</Badge>;
      case "closed":
        return <Badge className="bg-gray-100 text-gray-800"><XCircle className="w-3 h-3 mr-1" />Fechado</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProposalBadge = (count: number) => {
    if (count === 0) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Sem Propostas</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{count} Proposta{count > 1 ? 's' : ''}</Badge>;
  };

  const totalSolicitations = solicitationsData.length;
  const respondedSolicitations = solicitationsData.filter(s => s.userReceivedResponse).length;
  const pendingSolicitations = totalSolicitations - respondedSolicitations;
  const affiliateLeads = affiliateData.length;

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
            <span className="text-foreground font-medium">Tracking de Solicitações</span>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Controle de Solicitações</h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe o andamento das solicitações dos usuários e efetivações via afiliados
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Solicitações</p>
                    <p className="text-2xl font-bold text-foreground">{totalSolicitations}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Respondidas</p>
                    <p className="text-2xl font-bold text-green-600">{respondedSolicitations}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold text-orange-600">{pendingSolicitations}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Via Afiliados</p>
                    <p className="text-2xl font-bold text-purple-600">{affiliateLeads}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Solicitations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Andamento das Solicitações</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSolicitations ? (
                <div className="text-center py-4">Carregando...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Valor da Conta</TableHead>
                      <TableHead>Comercializadora</TableHead>
                      <TableHead>Propostas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitationsData.map((solicitation) => (
                      <TableRow key={solicitation.intentId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{solicitation.userName}</p>
                            <p className="text-sm text-muted-foreground">{solicitation.userEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>{solicitation.company || "Pessoa Física"}</TableCell>
                        <TableCell>R$ {solicitation.billValue}</TableCell>
                        <TableCell>
                          {solicitation.comercializadora?.companyName || "N/A"}
                        </TableCell>
                        <TableCell>
                          {getProposalBadge(solicitation.proposalCount || 0)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(solicitation.intentStatus, solicitation.userReceivedResponse)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(solicitation.intentCreatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Affiliate Tracking Table */}
          <Card>
            <CardHeader>
              <CardTitle>Leads via Afiliados</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAffiliates ? (
                <div className="text-center py-4">Carregando...</div>
              ) : affiliateData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum lead via afiliado encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor da Conta</TableHead>
                      <TableHead>Comercializadora Alvo</TableHead>
                      <TableHead>Propostas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliateData.map((affiliate) => (
                      <TableRow key={affiliate.intentId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{affiliate.userName}</p>
                            <p className="text-sm text-muted-foreground">{affiliate.userEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>R$ {affiliate.billValue}</TableCell>
                        <TableCell>{affiliate.targetComercializadora || "N/A"}</TableCell>
                        <TableCell>
                          {getProposalBadge(affiliate.hasProposals || 0)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(affiliate.intentStatus, affiliate.userReceivedResponse)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(affiliate.intentCreatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}