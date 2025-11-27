import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Pencil,
  Clock,
  Palmtree,
  Award,
  FileText,
  Plus,
  Trash2,
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  Employee,
  HoursBank,
  VacationPeriod,
  LeavePeriod,
} from "@shared/schema";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  completed: "Concluído",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  completed: "default",
};

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function EmployeeDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-10 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface HoursBankFormProps {
  employeeId: string;
  onSuccess: () => void;
}

function HoursBankForm({ employeeId, onSuccess }: HoursBankFormProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: { employeeId: string; month: number; year: number; hours: number; description?: string }) => {
      const response = await apiRequest("POST", "/api/hours-bank", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hours-bank"] });
      toast({
        title: "Lançamento registrado",
        description: "O banco de horas foi atualizado.",
      });
      setOpen(false);
      setHours("");
      setDescription("");
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível registrar o lançamento.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = parseInt(hours);
    if (isNaN(hoursNum)) return;

    mutation.mutate({
      employeeId,
      month,
      year,
      hours: hoursNum,
      description: description || undefined,
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-add-hours">
          <Plus className="h-4 w-4 mr-2" />
          Lançar Horas
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançar Banco de Horas</DialogTitle>
          <DialogDescription>
            Registre horas extras (+) ou débitos (-) no banco de horas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Mês</Label>
              <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={(i + 1).toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Ano</Label>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hours">Horas (positivo ou negativo)</Label>
            <Input
              id="hours"
              type="number"
              placeholder="Ex: 8 ou -4"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
              data-testid="input-hours"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              placeholder="Ex: Projeto especial"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-hours-description"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-hours">
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Registrar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PeriodFormProps {
  employeeId: string;
  type: "vacation" | "leave";
  onSuccess: () => void;
}

function PeriodForm({ employeeId, type, onSuccess }: PeriodFormProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const endpoint = type === "vacation" ? "/api/vacations" : "/api/leaves";
  const title = type === "vacation" ? "Férias" : "Licença-Prêmio";

  const mutation = useMutation({
    mutationFn: async (data: { employeeId: string; startDate: string; endDate: string; status: string; notes?: string }) => {
      const response = await apiRequest("POST", endpoint, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({
        title: `${title} registrada`,
        description: `O período de ${title.toLowerCase()} foi cadastrado.`,
      });
      setOpen(false);
      setStartDate("");
      setEndDate("");
      setNotes("");
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: `Não foi possível registrar o período de ${title.toLowerCase()}.`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      employeeId,
      startDate,
      endDate,
      status: "pending",
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid={`button-add-${type}`}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Período
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar {title}</DialogTitle>
          <DialogDescription>
            Informe o período pretendido de {title.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                data-testid="input-end-date"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Observações adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              data-testid="input-period-notes"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-period">
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Registrar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function EmployeeDetail() {
  const [, params] = useRoute("/employees/:id");
  const { toast } = useToast();

  const { data: employee, isLoading: loadingEmployee } = useQuery<Employee>({
    queryKey: ["/api/employees", params?.id],
    enabled: !!params?.id,
  });

  const { data: hoursBank = [], isLoading: loadingHours } = useQuery<HoursBank[]>({
    queryKey: ["/api/hours-bank"],
    enabled: !!params?.id,
  });

  const { data: vacations = [], isLoading: loadingVacations } = useQuery<VacationPeriod[]>({
    queryKey: ["/api/vacations"],
    enabled: !!params?.id,
  });

  const { data: leaves = [], isLoading: loadingLeaves } = useQuery<LeavePeriod[]>({
    queryKey: ["/api/leaves"],
    enabled: !!params?.id,
  });

  const deleteHoursMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/hours-bank/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hours-bank"] });
      toast({ title: "Lançamento removido" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o lançamento.",
        variant: "destructive",
      });
    },
  });

  const deleteVacationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/vacations/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vacations"] });
      toast({ title: "Período de férias removido" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o período de férias.",
        variant: "destructive",
      });
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/leaves/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      toast({ title: "Período de licença removido" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o período de licença.",
        variant: "destructive",
      });
    },
  });

  const updateObservationsMutation = useMutation({
    mutationFn: async (observations: string) => {
      const response = await apiRequest("PATCH", `/api/employees/${params?.id}`, { observations });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", params?.id] });
      toast({ title: "Observações atualizadas" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as observações.",
        variant: "destructive",
      });
    },
  });

  const [observations, setObservations] = useState<string | null>(null);
  const currentObservations = observations !== null ? observations : (employee?.observations || "");

  if (loadingEmployee) {
    return <EmployeeDetailSkeleton />;
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold mb-2">Funcionário não encontrado</h2>
        <p className="text-muted-foreground mb-4">O funcionário solicitado não existe.</p>
        <Link href="/">
          <Button>Voltar ao Dashboard</Button>
        </Link>
      </div>
    );
  }

  const employeeHours = hoursBank.filter((h) => h.employeeId === employee.id);
  const employeeVacations = vacations.filter((v) => v.employeeId === employee.id);
  const employeeLeaves = leaves.filter((l) => l.employeeId === employee.id);
  const totalHours = employeeHours.reduce((sum, h) => sum + h.hours, 0);

  const handleSaveObservations = () => {
    updateObservationsMutation.mutate(currentObservations);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{employee.fullName}</h1>
            <p className="text-muted-foreground mt-1">
              {employee.position} - Matrícula: {employee.registrationNumber}
            </p>
          </div>
        </div>
        <Link href={`/employees/${employee.id}/edit`}>
          <Button data-testid="button-edit-employee">
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome Completo</p>
              <p className="font-medium">{employee.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Matrícula</p>
              <p className="font-medium">{employee.registrationNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cargo</p>
              <p className="font-medium">{employee.position}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Banco de Horas</p>
              <Badge
                variant={totalHours < 0 ? "destructive" : totalHours > 0 ? "default" : "secondary"}
                className="mt-1"
              >
                {totalHours > 0 ? "+" : ""}
                {totalHours}h
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="hours" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="hours" className="flex items-center gap-2" data-testid="tab-hours">
                <Clock className="h-4 w-4" />
                Banco de Horas
              </TabsTrigger>
              <TabsTrigger value="vacation" className="flex items-center gap-2" data-testid="tab-vacation">
                <Palmtree className="h-4 w-4" />
                Férias
              </TabsTrigger>
              <TabsTrigger value="leave" className="flex items-center gap-2" data-testid="tab-leave">
                <Award className="h-4 w-4" />
                Licença-Prêmio
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2" data-testid="tab-notes">
                <FileText className="h-4 w-4" />
                Observações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hours" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">Banco de Horas</CardTitle>
                    <CardDescription>Histórico de lançamentos mensais</CardDescription>
                  </div>
                  <HoursBankForm employeeId={employee.id} onSuccess={() => {}} />
                </CardHeader>
                <CardContent>
                  {loadingHours ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : employeeHours.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum lançamento registrado
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Período</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-center">Horas</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employeeHours
                            .sort((a, b) => b.year - a.year || b.month - a.month)
                            .map((h) => (
                              <TableRow key={h.id} data-testid={`row-hours-${h.id}`}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {MONTHS[h.month - 1]} {h.year}
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {h.description || "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={h.hours < 0 ? "destructive" : "default"}>
                                    {h.hours > 0 ? "+" : ""}
                                    {h.hours}h
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        data-testid={`button-delete-hours-${h.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Remover Lançamento</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Deseja remover este lançamento de {h.hours}h?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteHoursMutation.mutate(h.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Remover
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vacation" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">Férias</CardTitle>
                    <CardDescription>Períodos pretendidos de férias</CardDescription>
                  </div>
                  <PeriodForm employeeId={employee.id} type="vacation" onSuccess={() => {}} />
                </CardHeader>
                <CardContent>
                  {loadingVacations ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : employeeVacations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Palmtree className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum período de férias registrado
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Período</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Observações</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employeeVacations.map((v) => (
                            <TableRow key={v.id} data-testid={`row-vacation-${v.id}`}>
                              <TableCell>
                                {formatDate(v.startDate)} a {formatDate(v.endDate)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={STATUS_VARIANTS[v.status] || "secondary"}>
                                  {STATUS_LABELS[v.status] || v.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {v.notes || "-"}
                              </TableCell>
                              <TableCell>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      data-testid={`button-delete-vacation-${v.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remover Férias</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Deseja remover este período de férias?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteVacationMutation.mutate(v.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Remover
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leave" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">Licença-Prêmio</CardTitle>
                    <CardDescription>Períodos pretendidos de licença-prêmio</CardDescription>
                  </div>
                  <PeriodForm employeeId={employee.id} type="leave" onSuccess={() => {}} />
                </CardHeader>
                <CardContent>
                  {loadingLeaves ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : employeeLeaves.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Award className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum período de licença-prêmio registrado
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Período</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Observações</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employeeLeaves.map((l) => (
                            <TableRow key={l.id} data-testid={`row-leave-${l.id}`}>
                              <TableCell>
                                {formatDate(l.startDate)} a {formatDate(l.endDate)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={STATUS_VARIANTS[l.status] || "secondary"}>
                                  {STATUS_LABELS[l.status] || l.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {l.notes || "-"}
                              </TableCell>
                              <TableCell>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      data-testid={`button-delete-leave-${l.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remover Licença-Prêmio</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Deseja remover este período de licença-prêmio?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteLeaveMutation.mutate(l.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Remover
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Observações</CardTitle>
                  <CardDescription>Anotações adicionais sobre o funcionário</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Digite observações sobre o funcionário..."
                    className="min-h-[200px] resize-none"
                    value={currentObservations}
                    onChange={(e) => setObservations(e.target.value)}
                    data-testid="textarea-observations"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveObservations}
                      disabled={updateObservationsMutation.isPending}
                      data-testid="button-save-observations"
                    >
                      {updateObservationsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Salvar Observações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
