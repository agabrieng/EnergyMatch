import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { Building, Search, Plus, Mail, Phone, MapPin, FileText, Edit, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";

export default function ComercializadorasList() {
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingComercializadora, setEditingComercializadora] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect non-admin users
  if (!currentUser || currentUser.role !== "admin") {
    setLocation("/");
    return null;
  }

  const { data: comercializadoras = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/comercializadoras"],
    enabled: !!currentUser,
  });

  // Filtrar comercializadoras baseado na busca
  const filteredComercializadoras = comercializadoras.filter((comercializadora: any) => {
    return searchTerm === "" || 
      comercializadora.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comercializadora.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comercializadora.cnpj?.includes(searchTerm);
  });

  // Mutation para editar comercializadora
  const updateComercializadoraMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/comercializadoras/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Comercializadora atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/comercializadoras"] });
      setIsEditDialogOpen(false);
      setEditingComercializadora(null);
    },
    onError: (error: any) => {
      console.error("Update error:", error);
      let errorMessage = "Ocorreu um erro ao atualizar a comercializadora. Tente novamente.";
      
      if (error.message) {
        try {
          const errorData = JSON.parse(error.message);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar comercializadora
  const deleteComercializadoraMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/comercializadoras/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Comercializadora deletada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/comercializadoras"] });
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      let errorMessage = "Ocorreu um erro ao deletar a comercializadora. Tente novamente.";
      
      if (error.message) {
        try {
          const errorData = JSON.parse(error.message);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleEditComercializadora = (comercializadora: any) => {
    setEditingComercializadora(comercializadora);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingComercializadora) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      companyName: formData.get("companyName") as string,
      cnpj: formData.get("cnpj") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
      aneelRegistration: formData.get("aneelRegistration") as string,
      serviceAreas: formData.get("serviceAreas") as string,
      description: formData.get("description") as string,
      affiliateLink: formData.get("affiliateLink") as string,
    };

    updateComercializadoraMutation.mutate({ id: editingComercializadora.id, data });
  };

  const handleDeleteComercializadora = (id: string) => {
    deleteComercializadoraMutation.mutate(id);
  };

  // Mutation para aprovar/reprovar comercializadora
  const toggleApprovalMutation = useMutation({
    mutationFn: async ({ id, isApproved }: { id: string; isApproved: boolean }) => {
      const response = await apiRequest("PUT", `/api/comercializadoras/${id}`, { isApproved });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Status de aprovação atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/comercializadoras"] });
    },
    onError: (error: any) => {
      console.error("Toggle approval error:", error);
      let errorMessage = "Ocorreu um erro ao atualizar o status de aprovação. Tente novamente.";
      
      if (error.message) {
        try {
          const errorData = JSON.parse(error.message);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const toggleApproval = (id: string, isApproved: boolean) => {
    toggleApprovalMutation.mutate({ id, isApproved });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800">Ativa</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      case "inactive":
        return <Badge variant="outline" className="border-red-200 text-red-800">Inativa</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
            <h1 className="font-semibold">Comercializadoras Cadastradas</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Comercializadoras</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie todas as comercializadoras cadastradas na plataforma
              </p>
            </div>
            <Button 
              onClick={() => setLocation("/comercializadora-registration")}
              className="flex items-center gap-2"
              data-testid="button-add-comercializadora"
            >
              <Plus className="h-4 w-4" />
              Nova Comercializadora
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Lista de Comercializadoras
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar por nome, email ou CNPJ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-[300px]"
                      data-testid="input-search-comercializadoras"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando comercializadoras...</p>
                </div>
              ) : filteredComercializadoras.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "Nenhuma comercializadora encontrada" : "Nenhuma comercializadora cadastrada ainda"}
                  </p>
                  {!searchTerm && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setLocation("/comercializadora-registration")}
                      data-testid="button-add-first-comercializadora"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Primeira Comercializadora
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Áreas de Atuação</TableHead>
                      <TableHead>Link de Afiliado</TableHead>
                      <TableHead>Aprovação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registro ANEEL</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComercializadoras.map((comercializadora) => (
                      <TableRow key={comercializadora.id} data-testid={`row-comercializadora-${comercializadora.id}`}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Building className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground" data-testid={`text-company-name-${comercializadora.id}`}>
                                {comercializadora.companyName}
                              </div>
                              {comercializadora.description && (
                                <div className="text-sm text-muted-foreground mt-1 max-w-xs">
                                  {comercializadora.description.substring(0, 80)}
                                  {comercializadora.description.length > 80 && "..."}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm" data-testid={`text-email-${comercializadora.id}`}>
                                {comercializadora.email}
                              </span>
                            </div>
                            {comercializadora.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm" data-testid={`text-phone-${comercializadora.id}`}>
                                  {comercializadora.phone}
                                </span>
                              </div>
                            )}
                            {comercializadora.address && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground max-w-xs truncate" title={comercializadora.address}>
                                  {comercializadora.address}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm" data-testid={`text-cnpj-${comercializadora.id}`}>
                            {comercializadora.cnpj}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {comercializadora.serviceAreas && Array.isArray(comercializadora.serviceAreas) && comercializadora.serviceAreas.length > 0 ? (
                              comercializadora.serviceAreas.map((area: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {area}
                                </Badge>
                              ))
                            ) : comercializadora.serviceAreas && typeof comercializadora.serviceAreas === 'string' ? (
                              <Badge variant="outline" className="text-xs">
                                {comercializadora.serviceAreas}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">Não informado</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {comercializadora.affiliateLink ? (
                            <a 
                              href={comercializadora.affiliateLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm"
                              data-testid={`link-affiliate-${comercializadora.id}`}
                            >
                              Ver Link
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">Não informado</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {comercializadora.isApproved ? (
                              <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Aprovada
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                <Clock className="h-3 w-3 mr-1" />
                                Pendente
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleApproval(comercializadora.id, !comercializadora.isApproved)}
                              data-testid={`button-toggle-approval-${comercializadora.id}`}
                            >
                              {comercializadora.isApproved ? (
                                <XCircle className="h-4 w-4 text-red-600" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(comercializadora.status || "active")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-mono" data-testid={`text-aneel-${comercializadora.id}`}>
                              {comercializadora.aneelRegistration || "Não informado"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditComercializadora(comercializadora)}
                              data-testid={`button-edit-${comercializadora.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  data-testid={`button-delete-${comercializadora.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja deletar a comercializadora "{comercializadora.companyName}"? 
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteComercializadora(comercializadora.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Deletar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {!isLoading && filteredComercializadoras.length > 0 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {filteredComercializadoras.length} de {comercializadoras.length} comercializadoras
              </p>
            </div>
          )}
        </div>

        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Comercializadora</DialogTitle>
              <DialogDescription>
                Altere as informações da comercializadora abaixo.
              </DialogDescription>
            </DialogHeader>
            
            {editingComercializadora && (
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-company-name">Nome da Empresa</Label>
                    <Input
                      id="edit-company-name"
                      name="companyName"
                      defaultValue={editingComercializadora.companyName}
                      required
                      data-testid="input-edit-company-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-company-cnpj">CNPJ</Label>
                    <Input
                      id="edit-company-cnpj"
                      name="cnpj"
                      defaultValue={editingComercializadora.cnpj}
                      required
                      data-testid="input-edit-company-cnpj"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-company-email">E-mail Corporativo</Label>
                    <Input
                      id="edit-company-email"
                      name="email"
                      type="email"
                      defaultValue={editingComercializadora.email}
                      required
                      data-testid="input-edit-company-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-company-phone">Telefone</Label>
                    <Input
                      id="edit-company-phone"
                      name="phone"
                      type="tel"
                      defaultValue={editingComercializadora.phone}
                      required
                      data-testid="input-edit-company-phone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-company-address">Endereço Completo</Label>
                  <Textarea
                    id="edit-company-address"
                    name="address"
                    rows={3}
                    defaultValue={editingComercializadora.address}
                    className="resize-none"
                    required
                    data-testid="textarea-edit-company-address"
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-registration-number">Registro ANEEL</Label>
                    <Input
                      id="edit-registration-number"
                      name="aneelRegistration"
                      defaultValue={editingComercializadora.aneelRegistration}
                      required
                      data-testid="input-edit-aneel-registration"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-service-areas">Áreas de Atuação</Label>
                    <Select name="serviceAreas" defaultValue={editingComercializadora.serviceAreas} required>
                      <SelectTrigger data-testid="select-edit-service-areas">
                        <SelectValue placeholder="Selecione as áreas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sp">São Paulo</SelectItem>
                        <SelectItem value="rj">Rio de Janeiro</SelectItem>
                        <SelectItem value="mg">Minas Gerais</SelectItem>
                        <SelectItem value="rs">Rio Grande do Sul</SelectItem>
                        <SelectItem value="nacional">Nacional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-affiliate-link">Link de Afiliado (Opcional)</Label>
                  <Input
                    id="edit-affiliate-link"
                    name="affiliateLink"
                    type="url"
                    defaultValue={editingComercializadora.affiliateLink || ""}
                    data-testid="input-edit-affiliate-link"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-company-description">Descrição da Empresa</Label>
                  <Textarea
                    id="edit-company-description"
                    name="description"
                    rows={4}
                    defaultValue={editingComercializadora.description || ""}
                    className="resize-none"
                    data-testid="textarea-edit-company-description"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditDialogOpen(false)}
                    data-testid="button-cancel-edit"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={updateComercializadoraMutation.isPending}
                    data-testid="button-submit-edit"
                  >
                    {updateComercializadoraMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}