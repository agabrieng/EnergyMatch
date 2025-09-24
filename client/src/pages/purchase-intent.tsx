import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { InvoiceUpload } from "@/components/invoice-upload";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { validateDocument, applyDocumentMask } from "@/lib/document-validation";
import { uploadInvoiceFile } from "@/components/invoice-upload";
// Removido import localStorage - usando apenas banco de dados
import { isProductionEnvironment } from "@/lib/environment";

export default function PurchaseIntent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedInvoiceFile, setSelectedInvoiceFile] = useState<File | null>(null);
  const [hasCompany, setHasCompany] = useState(user?.documentType === "cnpj");
  const [documentNumber, setDocumentNumber] = useState(() => {
    if (user?.documentNumber && user?.documentType) {
      return applyDocumentMask(user.documentNumber, user.documentType === "cnpj");
    }
    return "";
  });
  const [documentError, setDocumentError] = useState("");
  const [selectedComercializadora, setSelectedComercializadora] = useState("");
  const [affiliateComercializadoraId, setAffiliateComercializadoraId] = useState<string | null>(null);
  const [affiliateCompanyName, setAffiliateCompanyName] = useState<string | null>(null);
  const [billValue, setBillValue] = useState("");
  const [consumptionType, setConsumptionType] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  // Detectar código de afiliado na URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const affiliateCode = urlParams.get('ref');
    
    if (affiliateCode) {
      // Resolver o código de afiliado
      apiRequest("GET", `/api/affiliate/resolve/${affiliateCode}`)
        .then(response => response.json())
        .then(data => {
          setAffiliateComercializadoraId(data.comercializadoraId);
          setAffiliateCompanyName(data.companyName);
          toast({
            title: "Link de Afiliado Detectado",
            description: `Esta intenção será creditada à ${data.companyName}`,
          });
        })
        .catch(error => {
          console.error("Erro ao resolver código de afiliado:", error);
        });
    }
  }, [toast]);

  // Buscar comercializadoras aprovadas
  const { data: comercializadoras = [], isLoading: loadingComercializadoras } = useQuery({
    queryKey: ["/api/comercializadoras/approved"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/comercializadoras/approved");
      return response.json();
    },
  });

  const createIntentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/purchase-intents", data);
      return response.json();
    },
    onSuccess: async (data, variables) => {
      toast({
        title: "Sucesso!",
        description: "Sua intenção de compra foi registrada com sucesso.",
      });
      
      // Invalidar queries para recarregar dados
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-intents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-partner-accesses"] });
      
      // Registrar acesso ao parceiro direto no banco
      if (variables.comercializadoraId) {
        try {
          const comercializadoraData = comercializadoras.find((c: any) => c.id === variables.comercializadoraId);
          if (comercializadoraData) {
            await fetch('/api/partner-accesses/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                comercializadoraId: comercializadoraData.id,
                companyName: comercializadoraData.companyName,
              }),
            });
          }
        } catch (error) {
          console.error('Erro ao registrar acesso ao parceiro:', error);
        }
      }
      
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao registrar sua intenção. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedComercializadora) {
      toast({
        title: "Erro",
        description: "Você deve selecionar uma comercializadora.",
        variant: "destructive",
      });
      return;
    }

    if (!termsAccepted) {
      toast({
        title: "Erro",
        description: "Você deve aceitar os termos e condições.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedInvoiceFile) {
      toast({
        title: "Erro",
        description: "É necessário selecionar a fatura de energia elétrica.",
        variant: "destructive",
      });
      return;
    }

    if (!validateDocument(documentNumber, hasCompany)) {
      toast({
        title: "Erro",
        description: `${hasCompany ? 'CNPJ' : 'CPF'} inválido. Verifique o número digitado.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Primeiro faz o upload da fatura
      const invoiceFilePath = await uploadInvoiceFile(selectedInvoiceFile);

      // Coletando dados diretamente dos estados e dados do usuário
      const data = {
        comercializadoraId: selectedComercializadora,
        affiliateComercializadoraId: affiliateComercializadoraId, // Incluir ID da comercializadora afiliada
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        company: hasCompany ? "" : "",
        documentType: hasCompany ? "cnpj" : "cpf",
        documentNumber: documentNumber.replace(/\D/g, ''), // Remove formatação antes de enviar
        billValue: billValue,
        consumptionType: consumptionType,
        additionalInfo: additionalInfo,
        invoiceFilePath: invoiceFilePath,
      };

      createIntentMutation.mutate(data);
    } catch (error) {
      console.error("Error during form submission:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar fatura. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
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
            <span className="text-foreground font-medium">Nova Intenção</span>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nova Intenção de Compra</h1>
            <p className="text-muted-foreground mt-2">
              Preencha os dados abaixo para criar uma nova intenção de compra de energia
            </p>
          </div>

          {affiliateCompanyName && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm text-green-700">
                  <strong>Link de Afiliado Ativo:</strong> Esta intenção será creditada à comercializadora {affiliateCompanyName}
                </p>
              </div>
            </div>
          )}

          <div className="max-w-2xl">
            <Card>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="comercializadora">Comercializadora Preferida *</Label>
                    <Select value={selectedComercializadora} onValueChange={setSelectedComercializadora} required>
                      <SelectTrigger data-testid="select-comercializadora">
                        <SelectValue placeholder={loadingComercializadoras ? "Carregando..." : "Selecione uma comercializadora"} />
                      </SelectTrigger>
                      <SelectContent>
                        {comercializadoras.map((comercializadora: any) => (
                          <SelectItem key={comercializadora.id} value={comercializadora.id}>
                            {comercializadora.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Escolha a comercializadora que você gostaria que avaliasse sua intenção de compra.
                    </p>
                  </div>

                  {!hasCompany && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Informação:</strong> Os dados pessoais são preenchidos automaticamente com suas informações de cadastro. 
                        Para alterar esses dados, digite o nome da empresa no campo correspondente.
                      </p>
                    </div>
                  )}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="client-name">Nome Completo</Label>
                      <Input
                        id="client-name"
                        name="name"
                        placeholder="Seu nome"
                        value={user?.name || ""}
                        disabled={!hasCompany}
                        required
                        data-testid="input-client-name"
                        className={!hasCompany ? "bg-muted" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-email">E-mail</Label>
                      <Input
                        id="client-email"
                        name="email"
                        type="email"
                        placeholder="seu-email@exemplo.com"
                        value={user?.email || ""}
                        disabled={!hasCompany}
                        required
                        data-testid="input-client-email"
                        className={!hasCompany ? "bg-muted" : ""}
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="client-phone">Telefone</Label>
                      <Input
                        id="client-phone"
                        name="phone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={user?.phone || ""}
                        disabled={!hasCompany}
                        required
                        data-testid="input-client-phone"
                        className={!hasCompany ? "bg-muted" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Nome da Empresa</Label>
                      <Input
                        id="company-name"
                        name="company"
                        placeholder="Sua empresa (opcional)"
                        onChange={(e) => {
                          const hasCompanyValue = e.target.value.trim().length > 0;
                          setHasCompany(hasCompanyValue);
                          
                          // Restaura o documento do usuário quando volta para CPF ou limpa para CNPJ
                          if (!hasCompanyValue && user?.documentNumber && user?.documentType) {
                            // Volta para CPF - restaura dados do usuário
                            setDocumentNumber(applyDocumentMask(user.documentNumber, user.documentType === "cnpj"));
                          } else {
                            // Vai para CNPJ - limpa o campo
                            setDocumentNumber("");
                          }
                          setDocumentError("");
                        }}
                        data-testid="input-company-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document-number">
                      {hasCompany ? "CNPJ" : "CPF"}
                    </Label>
                    <Input
                      id="document-number"
                      name="documentNumber"
                      value={documentNumber}
                      placeholder={hasCompany ? "00.000.000/0000-00" : "000.000.000-00"}
                      disabled={!hasCompany}
                      onChange={(e) => {
                        if (hasCompany) {
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
                        }
                      }}
                      required
                      data-testid="input-document-number"
                      className={documentError ? "border-red-500" : (!hasCompany ? "bg-muted" : "")}
                    />
                    {documentError && (
                      <p className="text-sm text-red-500 mt-1">{documentError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bill-value">Faixa de Valor da Conta de Luz</Label>
                    <Select value={billValue} onValueChange={setBillValue} required>
                      <SelectTrigger data-testid="select-bill-value">
                        <SelectValue placeholder="Selecione uma faixa de valor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="below-5000">Abaixo de R$ 5.000</SelectItem>
                        <SelectItem value="5000-8000">De R$ 5.000 a R$ 8.000</SelectItem>
                        <SelectItem value="8000-15000">De R$ 8.000 a R$ 15.000</SelectItem>
                        <SelectItem value="above-15000">Acima de R$ 15.000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consumption-type">Tipo de Consumo</Label>
                    <Select value={consumptionType} onValueChange={setConsumptionType} required>
                      <SelectTrigger data-testid="select-consumption-type">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residencial</SelectItem>
                        <SelectItem value="commercial">Comercial</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additional-info">Informações Adicionais</Label>
                    <Textarea
                      id="additional-info"
                      name="additionalInfo"
                      rows={4}
                      placeholder="Descreva suas necessidades específicas, horários de maior consumo, etc."
                      className="resize-none"
                      data-testid="textarea-additional-info"
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                    />
                  </div>

                  <InvoiceUpload 
                    onFileSelected={setSelectedInvoiceFile}
                    selectedFile={selectedInvoiceFile}
                  />

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms-consent"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                      data-testid="checkbox-terms"
                    />
                    <Label htmlFor="terms-consent" className="text-sm leading-relaxed">
                      Eu concordo com os{" "}
                      <a href="#" className="text-primary hover:underline">
                        Termos e Condições
                      </a>{" "}
                      e autorizo o compartilhamento dos meus dados com comercializadoras parceiras.
                    </Label>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setLocation("/dashboard")}
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={createIntentMutation.isPending || !termsAccepted || !selectedInvoiceFile || !selectedComercializadora || loadingComercializadoras}
                      data-testid="button-submit-intent"
                    >
                      {createIntentMutation.isPending ? "Criando..." : "Criar Intenção de Compra"}
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
