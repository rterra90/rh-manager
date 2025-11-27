import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, Clock, Palmtree, AlertTriangle, Plus, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Employee, HoursBank, VacationPeriod, LeavePeriod } from "@shared/schema";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  variant?: "default" | "warning" | "success";
}

function StatsCard({ title, value, description, icon: Icon, variant = "default" }: StatsCardProps) {
  const variantStyles = {
    default: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`rounded-md p-2 ${variantStyles[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32 mt-2" />
      </CardContent>
    </Card>
  );
}

function EmployeeTableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: hoursBank = [], isLoading: loadingHours } = useQuery<HoursBank[]>({
    queryKey: ["/api/hours-bank"],
  });

  const { data: vacations = [], isLoading: loadingVacations } = useQuery<VacationPeriod[]>({
    queryKey: ["/api/vacations"],
  });

  const { data: leaves = [] } = useQuery<LeavePeriod[]>({
    queryKey: ["/api/leaves"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/employees/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hours-bank"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vacations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      toast({
        title: "Funcionário removido",
        description: "O funcionário foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o funcionário.",
        variant: "destructive",
      });
    },
  });

  const getEmployeeHoursBalance = (employeeId: string): number => {
    return hoursBank
      .filter((h) => h.employeeId === employeeId)
      .reduce((sum, h) => sum + h.hours, 0);
  };

  const pendingVacations = vacations.filter((v) => v.status === "pending").length;
  const pendingLeaves = leaves.filter((l) => l.status === "pending").length;

  const employeesWithNegativeBalance = employees.filter(
    (e) => getEmployeeHoursBalance(e.id) < 0
  ).length;

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = loadingEmployees || loadingHours || loadingVacations;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral da gestão de recursos humanos
          </p>
        </div>
        <Link href="/employees/new">
          <Button data-testid="button-add-employee">
            <Plus className="h-4 w-4 mr-2" />
            Novo Funcionário
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <StatsCard
              title="Total de Funcionários"
              value={employees.length}
              description="Cadastrados no sistema"
              icon={Users}
            />
            <StatsCard
              title="Banco de Horas Negativo"
              value={employeesWithNegativeBalance}
              description="Funcionários com saldo negativo"
              icon={Clock}
              variant={employeesWithNegativeBalance > 0 ? "warning" : "default"}
            />
            <StatsCard
              title="Férias Pendentes"
              value={pendingVacations}
              description="Solicitações aguardando"
              icon={Palmtree}
              variant={pendingVacations > 0 ? "warning" : "success"}
            />
            <StatsCard
              title="Licenças Pendentes"
              value={pendingLeaves}
              description="Licenças-prêmio aguardando"
              icon={AlertTriangle}
              variant={pendingLeaves > 0 ? "warning" : "success"}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Funcionários</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-employee"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingEmployees ? (
            <EmployeeTableSkeleton />
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">
                {searchQuery ? "Nenhum funcionário encontrado" : "Nenhum funcionário cadastrado"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {searchQuery
                  ? "Tente buscar com outros termos"
                  : "Comece adicionando seu primeiro funcionário"}
              </p>
              {!searchQuery && (
                <Link href="/employees/new">
                  <Button data-testid="button-add-first-employee">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Funcionário
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-center">Banco de Horas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => {
                    const hoursBalance = getEmployeeHoursBalance(employee.id);
                    return (
                      <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                        <TableCell className="font-medium">
                          {employee.fullName}
                        </TableCell>
                        <TableCell>{employee.registrationNumber}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={hoursBalance < 0 ? "destructive" : hoursBalance > 0 ? "default" : "secondary"}
                          >
                            {hoursBalance > 0 ? "+" : ""}
                            {hoursBalance}h
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/employees/${employee.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    data-testid={`button-view-${employee.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalhes</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/employees/${employee.id}/edit`}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    data-testid={`button-edit-${employee.id}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      data-testid={`button-delete-${employee.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Remover</TooltipContent>
                              </Tooltip>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover Funcionário</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover <strong>{employee.fullName}</strong>?
                                    Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(employee.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`button-confirm-delete-${employee.id}`}
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
