import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BulkImportResult {
  totalRows: number;
  created: number;
  duplicates: Array<{ row: number; fullName: string; registrationNumber: string; reason: string }>;
}

interface BulkImportDialogProps {
  onSuccess?: () => void;
}

export function BulkImportDialog({ onSuccess }: BulkImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const { toast } = useToast();

  const sanitizeRegistration = (reg: string): string => {
    return reg.replace(/[\s.-]/g, "").trim();
  };

  const parseCSV = (text: string): Array<{ fullName: string; registrationNumber: string; position: string }> => {
    const lines = text.split("\n").filter(line => line.trim());
    const data: Array<{ fullName: string; registrationNumber: string; position: string }> = [];
    
    for (const line of lines) {
      const parts = line.split(",").map(p => p.trim());
      if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
        data.push({
          fullName: parts[0],
          registrationNumber: parts[1],
          position: parts[2],
        });
      }
    }
    
    return data;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["text/csv", "application/vnd.ms-excel", "text/plain"];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".csv")) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo CSV válido",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast({
          title: "Erro",
          description: "Nenhuma linha válida encontrada no arquivo. Verifique o formato.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Send to backend for bulk import
      const response = await apiRequest("POST", "/api/employees/bulk", { rows });
      const importResult: BulkImportResult = await response.json();

      setResult(importResult);

      // Invalidate employees query
      await queryClient.invalidateQueries({ queryKey: ["/api/employees"] });

      if (importResult.created > 0) {
        toast({
          title: "Importação Concluída",
          description: `${importResult.created} funcionário(s) criado(s) com sucesso.`,
        });
      }

      onSuccess?.();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível processar o arquivo. Verifique o formato.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-bulk-import">
          <Upload className="h-4 w-4 mr-2" />
          Importar em Lote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Funcionários em Lote</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV com as colunas: Nome Completo, Matrícula, Cargo
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.duplicates.length === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}
                  Resumo da Importação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total de Linhas</p>
                    <p className="text-2xl font-bold">{result.totalRows}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Criados</p>
                    <p className="text-2xl font-bold text-green-600">{result.created}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Duplicatas</p>
                    <p className="text-2xl font-bold text-amber-600">{result.duplicates.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Duplicates Log */}
            {result.duplicates.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-3">Funcionários não importados (duplicata ou erro):</p>
                  <div className="space-y-2 text-sm">
                    {result.duplicates.map((dup, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-medium">{dup.fullName}</p>
                          <p className="text-xs opacity-75">Matrícula: {dup.registrationNumber}</p>
                        </div>
                        <p className="text-right text-xs opacity-75">{dup.reason}</p>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleClose} data-testid="button-close-import-result">
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Instructions */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Formato esperado do arquivo CSV:</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>Coluna 1: Nome Completo</li>
                  <li>Coluna 2: Matrícula (será sanitizado: pontos e traços removidos)</li>
                  <li>Coluna 3: Cargo</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* File Upload */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-upload">Selecione o arquivo CSV</Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  data-testid="input-bulk-import-file"
                />
              </div>

              <Button
                onClick={() => document.getElementById("csv-upload")?.click()}
                disabled={isLoading}
                className="w-full"
                data-testid="button-select-file"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </>
                )}
              </Button>
            </div>

            {/* Example */}
            <Alert>
              <AlertDescription>
                <p className="font-semibold text-sm mb-2">Exemplo de formato:</p>
                <code className="text-xs bg-muted p-3 rounded block whitespace-pre-wrap break-words">
João Silva,123.456.789-01,Gerente{"\n"}
Maria Santos,987.654.321-02,Desenvolvedora{"\n"}
Pedro Costa,555.666.777-88,Analista</code>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
