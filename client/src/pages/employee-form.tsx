import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Employee, InsertEmployee } from "@shared/schema";

const employeeFormSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  registrationNumber: z.string().min(1, "Matrícula é obrigatória"),
  position: z.string().min(2, "Cargo deve ter pelo menos 2 caracteres"),
  observations: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export default function EmployeeForm() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/employees/:id/edit");
  const { toast } = useToast();
  const isEditing = !!params?.id;

  const { data: employee, isLoading: loadingEmployee } = useQuery<Employee>({
    queryKey: ["/api/employees", params?.id],
    enabled: isEditing,
  });

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      fullName: "",
      registrationNumber: "",
      position: "",
      observations: "",
    },
    values: employee
      ? {
          fullName: employee.fullName,
          registrationNumber: employee.registrationNumber,
          position: employee.position,
          observations: employee.observations || "",
        }
      : undefined,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEmployee) => {
      const response = await apiRequest("POST", "/api/employees", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Funcionário cadastrado",
        description: "O funcionário foi cadastrado com sucesso.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      const message = error.message.includes("Matrícula já cadastrada")
        ? "Esta matrícula já está em uso por outro funcionário."
        : error.message || "Não foi possível cadastrar o funcionário.";
      toast({
        title: "Erro ao cadastrar",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertEmployee) => {
      const response = await apiRequest("PATCH", `/api/employees/${params?.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", params?.id] });
      toast({
        title: "Funcionário atualizado",
        description: "Os dados foram atualizados com sucesso.",
      });
      setLocation(`/employees/${params?.id}`);
    },
    onError: (error: Error) => {
      const message = error.message.includes("Matrícula já cadastrada")
        ? "Esta matrícula já está em uso por outro funcionário."
        : error.message || "Não foi possível atualizar o funcionário.";
      toast({
        title: "Erro ao atualizar",
        description: message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmployeeFormValues) => {
    const submitData: InsertEmployee = {
      fullName: data.fullName,
      registrationNumber: data.registrationNumber,
      position: data.position,
      observations: data.observations || null,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && loadingEmployee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={isEditing ? `/employees/${params?.id}` : "/"}>
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? "Editar Funcionário" : "Novo Funcionário"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing
              ? "Atualize os dados do funcionário"
              : "Preencha os dados para cadastrar um novo funcionário"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
              <CardDescription>
                Informações básicas do funcionário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o nome completo"
                        data-testid="input-fullname"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="registrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matrícula *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 12345"
                          data-testid="input-registration"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Número único de identificação
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Analista de Sistemas"
                          data-testid="input-position"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Anotações adicionais sobre o funcionário..."
                        className="min-h-[120px] resize-none"
                        data-testid="input-observations"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Campo opcional para informações adicionais
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href={isEditing ? `/employees/${params?.id}` : "/"}>
              <Button type="button" variant="outline" data-testid="button-cancel">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={isPending} data-testid="button-submit">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? "Salvando..." : "Cadastrando..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Salvar Alterações" : "Cadastrar Funcionário"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
