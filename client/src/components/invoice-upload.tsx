import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { Upload, FileText, X } from "lucide-react";

interface InvoiceUploadProps {
  onFileSelected: (file: File | null) => void;
  selectedFile?: File | null;
}

// Função para upload será usada quando o formulário for submetido
export const uploadInvoiceFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("invoice", file);

  const response = await apiRequest("POST", "/api/upload-invoice", formData);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Erro desconhecido" }));
    throw new Error(errorData.message || `Erro HTTP ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.filePath) {
    throw new Error("Resposta inválida: caminho do arquivo não retornado");
  }
  
  return data.filePath;
};

export function InvoiceUpload({ onFileSelected, selectedFile }: InvoiceUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas arquivos PDF.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Apenas armazena o arquivo, não faz upload
    onFileSelected(file);
  };

  const handleRemove = () => {
    onFileSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Label htmlFor="invoice-upload">
        Fatura de Energia Elétrica (PDF) *
      </Label>
      
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="p-6">
          {selectedFile ? (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-800">Arquivo selecionado</p>
                  <p className="text-sm text-blue-600">
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                data-testid="button-remove-invoice"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-muted rounded-lg flex items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Clique para selecionar sua fatura de energia
                </p>
                <p className="text-xs text-muted-foreground">
                  Apenas arquivos PDF até 10MB
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={openFilePicker}
                data-testid="button-select-invoice"
              >
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Arquivo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-file-invoice"
      />

      <p className="text-xs text-muted-foreground">
        * A fatura será enviada apenas quando você criar a intenção de compra
      </p>
    </div>
  );
}