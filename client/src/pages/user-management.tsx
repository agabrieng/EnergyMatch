import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { validateDocument, applyDocumentMask } from "@/lib/document-validation";
import { Plus, Users, Edit, Mail, Trash2, Search, Filter } from "lucide-react";

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [hasCompany, setHasCompany] = useState(false);
  const [editDocumentNumber, setEditDocumentNumber] = useState("");
  const [editDocumentError, setEditDocumentError] = useState("");
  const [editHasCompany, setEditHasCompany] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Redirect non-admin users
  if (!currentUser || currentUser.role !== "admin") {
    setLocation("/");
    return null;
  }

  const { data: allUsers = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: !!currentUser,
    refetchOnWindowFocus: false,
    staleTime: 0, // Sempre considerar dados como obsoletos
  });

  // Filtrar usuários baseado na busca e filtro de perfil
  const filteredUsers = allUsers.filter((user: any) => {
    const matchesSearch = searchTerm === "" || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Sucesso!",
        description: "Usuário criado com sucesso.",
      });
      // Invalidar o cache e forçar uma nova busca
      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      await refetch(); // Forçar busca direta usando a função refetch
      setIsCreateDialogOpen(false);
      // Limpar o formulário
      setDocumentNumber("");
      setDocumentError("");
      setHasCompany(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar o usuário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Usuário atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar o usuário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Usuário deletado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao deletar o usuário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validação do documento se preenchido
    if (documentNumber && !validateDocument(documentNumber, hasCompany)) {
      toast({
        title: "Erro",
        description: `${hasCompany ? 'CNPJ' : 'CPF'} inválido. Verifique o número digitado.`,
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData(e.currentTarget);
    const userData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      role: formData.get("role") as string,
      phone: formData.get("phone") as string,
      documentType: documentNumber ? (hasCompany ? "cnpj" : "cpf") : null,
      documentNumber: documentNumber ? documentNumber.replace(/\D/g, '') : null,
    };

    createUserMutation.mutate(userData);
  };

  const handleEditUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!editingUser) return;
    
    // Validação do documento se preenchido
    if (editDocumentNumber && !validateDocument(editDocumentNumber, editHasCompany)) {
      toast({
        title: "Erro",
        description: `${editHasCompany ? 'CNPJ' : 'CPF'} inválido. Verifique o número digitado.`,
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData(e.currentTarget);
    const userData: any = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      role: formData.get("role") as string,
      documentType: editDocumentNumber ? (editHasCompany ? "cnpj" : "cpf") : null,
      documentNumber: editDocumentNumber ? editDocumentNumber.replace(/\D/g, '') : null,
    };

    // Only include password if provided
    const password = formData.get("password") as string;
    if (password) {
      userData.password = password;
    }

    updateUserMutation.mutate({ id: editingUser.id, data: userData });
  };

  const openEditDialog = (userToEdit: any) => {
    setEditingUser(userToEdit);
    setEditHasCompany(userToEdit.documentType === "cnpj");
    setEditDocumentNumber(() => {
      if (userToEdit.documentNumber && userToEdit.documentType) {
        return applyDocumentMask(userToEdit.documentNumber, userToEdit.documentType === "cnpj");
      }
      return "";
    });
    setEditDocumentError("");
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "comercializadora":
        return "default";
      default:
        return "secondary";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "comercializadora":
        return "Comercializadora";
      default:
        return "Cliente";
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
            <span className="text-foreground font-medium">Gerenciar Usuários</span>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gerenciar Usuários</h1>
              <p className="text-muted-foreground mt-2">
                Visualize e gerencie todos os usuários da plataforma
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                // Limpar formulário quando fechar o diálogo
                setDocumentNumber("");
                setDocumentError("");
                setHasCompany(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-user">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Preencha as informações abaixo para criar um novo usuário na plataforma.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-name">Nome Completo</Label>
                    <Input
                      id="user-name"
                      name="name"
                      placeholder="Nome do usuário"
                      required
                      data-testid="input-user-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-email">E-mail</Label>
                    <Input
                      id="user-email"
                      name="email"
                      type="email"
                      placeholder="usuario@exemplo.com"
                      required
                      data-testid="input-user-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-password">Senha</Label>
                    <Input
                      id="user-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      data-testid="input-user-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-phone">Telefone (opcional)</Label>
                    <Input
                      id="user-phone"
                      name="phone"
                      placeholder="(11) 99999-9999"
                      data-testid="input-user-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-role">Tipo de Usuário</Label>
                    <Select 
                      name="role" 
                      required
                      onValueChange={(value) => {
                        setHasCompany(value === "comercializadora");
                        setDocumentNumber("");
                        setDocumentError("");
                      }}
                    >
                      <SelectTrigger data-testid="select-user-role">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Cliente</SelectItem>
                        <SelectItem value="comercializadora">Comercializadora</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-document">
                      {hasCompany ? "CNPJ" : "CPF"} (opcional)
                    </Label>
                    <Input
                      id="user-document"
                      name="documentNumber"
                      value={documentNumber}
                      placeholder={hasCompany ? "00.000.000/0000-00" : "000.000.000-00"}
                      onChange={(e) => {
                        const maskedValue = applyDocumentMask(e.target.value, hasCompany);
                        setDocumentNumber(maskedValue);
                        
                        // Validação em tempo real apenas se o campo estiver completo
                        const cleanValue = e.target.value.replace(/\D/g, '');
                        const expectedLength = hasCompany ? 14 : 11;
                        
                        if (cleanValue.length === expectedLength) {
                          const isValid = validateDocument(maskedValue, hasCompany);
                          setDocumentError(isValid ? "" : `${hasCompany ? 'CNPJ' : 'CPF'} inválido`);
                        } else {
                          setDocumentError("");
                        }
                      }}
                      data-testid="input-user-document"
                      className={documentError ? "border-red-500" : ""}
                    />
                    {documentError && (
                      <p className="text-sm text-red-500 mt-1">{documentError}</p>
                    )}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsCreateDialogOpen(false)}
                      data-testid="button-cancel-create"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={createUserMutation.isPending}
                      data-testid="button-submit-create"
                    >
                      {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Editar Usuário</DialogTitle>
                  <DialogDescription>
                    Atualize as informações do usuário abaixo.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-name">Nome Completo</Label>
                    <Input
                      id="edit-user-name"
                      name="name"
                      placeholder="Nome do usuário"
                      defaultValue={editingUser?.name || ""}
                      required
                      data-testid="input-edit-user-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-email">E-mail</Label>
                    <Input
                      id="edit-user-email"
                      name="email"
                      type="email"
                      placeholder="usuario@exemplo.com"
                      defaultValue={editingUser?.email || ""}
                      required
                      data-testid="input-edit-user-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-password">Nova Senha (opcional)</Label>
                    <Input
                      id="edit-user-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      data-testid="input-edit-user-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-phone">Telefone (opcional)</Label>
                    <Input
                      id="edit-user-phone"
                      name="phone"
                      placeholder="(11) 99999-9999"
                      defaultValue={editingUser?.phone || ""}
                      data-testid="input-edit-user-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-role">Tipo de Usuário</Label>
                    <Select 
                      name="role" 
                      required
                      defaultValue={editingUser?.role || ""}
                      onValueChange={(value) => {
                        setEditHasCompany(value === "comercializadora");
                        setEditDocumentNumber("");
                        setEditDocumentError("");
                      }}
                    >
                      <SelectTrigger data-testid="select-edit-user-role">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Cliente</SelectItem>
                        <SelectItem value="comercializadora">Comercializadora</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-document">
                      {editHasCompany ? "CNPJ" : "CPF"} (opcional)
                    </Label>
                    <Input
                      id="edit-user-document"
                      name="documentNumber"
                      value={editDocumentNumber}
                      placeholder={editHasCompany ? "00.000.000/0000-00" : "000.000.000-00"}
                      onChange={(e) => {
                        const maskedValue = applyDocumentMask(e.target.value, editHasCompany);
                        setEditDocumentNumber(maskedValue);
                        
                        // Validação em tempo real apenas se o campo estiver completo
                        const cleanValue = e.target.value.replace(/\D/g, '');
                        const expectedLength = editHasCompany ? 14 : 11;
                        
                        if (cleanValue.length === expectedLength) {
                          const isValid = validateDocument(maskedValue, editHasCompany);
                          setEditDocumentError(isValid ? "" : `${editHasCompany ? 'CNPJ' : 'CPF'} inválido`);
                        } else {
                          setEditDocumentError("");
                        }
                      }}
                      data-testid="input-edit-user-document"
                      className={editDocumentError ? "border-red-500" : ""}
                    />
                    {editDocumentError && (
                      <p className="text-sm text-red-500 mt-1">{editDocumentError}</p>
                    )}
                  </div>
                  <div className="flex gap-3 pt-4">
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
                      disabled={updateUserMutation.isPending}
                      data-testid="button-submit-edit"
                    >
                      {updateUserMutation.isPending ? "Atualizando..." : "Atualizar Usuário"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou e-mail..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-users"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger data-testid="select-role-filter">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <SelectValue placeholder="Filtrar por perfil" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os perfis</SelectItem>
                      <SelectItem value="user">Clientes</SelectItem>
                      <SelectItem value="comercializadora">Comercializadoras</SelectItem>
                      <SelectItem value="admin">Administradores</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(searchTerm || roleFilter !== "all") && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Mostrando {filteredUsers.length} de {allUsers.length} usuários
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setRoleFilter("all");
                      }}
                      className="h-auto p-1 text-xs"
                      data-testid="button-clear-filters"
                    >
                      Limpar filtros
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuários Cadastrados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground" data-testid="text-no-users">
                    {allUsers.length === 0 ? "Nenhum usuário encontrado" : "Nenhum usuário corresponde aos filtros"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {allUsers.length === 0 ? "Comece criando o primeiro usuário do sistema" : "Tente ajustar os filtros para encontrar usuários"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Data de Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: any, index: number) => (
                      <TableRow key={user.id} data-testid={`row-user-${index}`}>
                        <TableCell>
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary-foreground">
                              {user.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{user.name}</div>
                          {user.phone && (
                            <div className="text-sm text-muted-foreground">{user.phone}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit", 
                            year: "numeric"
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openEditDialog(user)}
                              data-testid={`button-edit-user-${index}`}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  disabled={user.id === currentUser?.id}
                                  data-testid={`button-delete-user-${index}`}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja deletar o usuário <strong>{user.name}</strong>? 
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteUser(user.id)}
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
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}