import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

export default function ComercializadoraRegistration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const createComercializadoraMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/comercializadoras", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Comercializadora cadastrada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/comercializadoras"] });
      setLocation("/admin-dashboard");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao cadastrar a comercializadora. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
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
      userId: user?.id,
    };

    createComercializadoraMutation.mutate(data);
  };

  if (!user || user.role !== "admin") {
    setLocation("/");
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
            <span className="text-foreground font-medium">Cadastrar Comercializadora</span>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cadastrar Nova Comercializadora</h1>
            <p className="text-muted-foreground mt-2">
              Adicione uma nova comercializadora à plataforma
            </p>
          </div>

          <div className="max-w-3xl">
            <Card>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Nome da Empresa</Label>
                      <Input
                        id="company-name"
                        name="companyName"
                        placeholder="Nome da Comercializadora"
                        required
                        data-testid="input-company-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-cnpj">CNPJ</Label>
                      <Input
                        id="company-cnpj"
                        name="cnpj"
                        placeholder="00.000.000/0001-00"
                        required
                        data-testid="input-company-cnpj"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company-email">E-mail Corporativo</Label>
                      <Input
                        id="company-email"
                        name="email"
                        type="email"
                        placeholder="contato@empresa.com"
                        required
                        data-testid="input-company-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-phone">Telefone</Label>
                      <Input
                        id="company-phone"
                        name="phone"
                        type="tel"
                        placeholder="(11) 3000-0000"
                        required
                        data-testid="input-company-phone"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-address">Endereço Completo</Label>
                    <Textarea
                      id="company-address"
                      name="address"
                      rows={3}
                      placeholder="Rua, número, bairro, cidade, estado, CEP"
                      className="resize-none"
                      required
                      data-testid="textarea-company-address"
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="registration-number">Registro ANEEL</Label>
                      <Input
                        id="registration-number"
                        name="aneelRegistration"
                        placeholder="Número do registro"
                        required
                        data-testid="input-aneel-registration"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service-areas">Áreas de Atuação</Label>
                      <Select name="serviceAreas" required>
                        <SelectTrigger data-testid="select-service-areas">
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
                    <Label htmlFor="affiliate-link">Link de Afiliado (Opcional)</Label>
                    <Input
                      id="affiliate-link"
                      name="affiliateLink"
                      type="url"
                      placeholder="https://exemplo.com/afiliado/seu-codigo"
                      data-testid="input-affiliate-link"
                    />
                    <p className="text-sm text-muted-foreground">
                      Link para rastreamento de afiliados que será usado para creditar comissões por indicações.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-description">Descrição da Empresa</Label>
                    <Textarea
                      id="company-description"
                      name="description"
                      rows={4}
                      placeholder="Descreva os serviços oferecidos, diferenciais competitivos, etc."
                      className="resize-none"
                      data-testid="textarea-company-description"
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setLocation("/admin-dashboard")}
                      data-testid="button-cancel-registration"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={createComercializadoraMutation.isPending}
                      data-testid="button-submit-registration"
                    >
                      {createComercializadoraMutation.isPending ? "Cadastrando..." : "Cadastrar Comercializadora"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
