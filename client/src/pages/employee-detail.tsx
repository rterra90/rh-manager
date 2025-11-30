import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  PaidDayOff,
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

function minutesToHHMM(minutes: number): string {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? "-" : "";
  return `${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function hhmmToMinutes(hhmmStr: string): number {
  if (!hhmmStr) return 0;
  
  const isNegative = hhmmStr.startsWith("-") || hhmmStr.startsWith("+") && hhmmStr.length > 1 && hhmmStr[0] === "-";
  const cleanStr = hhmmStr.replace(/^[+-]/, "").trim();
  
  let hours = 0;
  let mins = 0;
  
  // Se contém dois pontos, usa split normal
  if (cleanStr.includes(":")) {
    const parts = cleanStr.split(":");
    if (parts.length === 2) {
      hours = parseInt(parts[0]) || 0;
      mins = parseInt(parts[1]) || 0;
    }
  } else {
    // Se não contém dois pontos, interpreta como dígitos
    // "0315" = 03h15m, "315" = 3h15m, "15" = 0h15m
    const digits = cleanStr.replace(/\D/g, ""); // Remove caracteres não-numéricos
    
    if (digits.length === 4) {
      // "0315" -> hh e mm
      hours = parseInt(digits.substring(0, 2)) || 0;
      mins = parseInt(digits.substring(2, 4)) || 0;
    } else if (digits.length === 3) {
      // "315" -> h e mm
      hours = parseInt(digits.substring(0, 1)) || 0;
      mins = parseInt(digits.substring(1, 3)) || 0;
    } else if (digits.length === 2) {
      // "15" -> mm
      mins = parseInt(digits) || 0;
    } else if (digits.length > 0) {
      // "3" ou números variáveis
      const num = parseInt(digits);
      if (num > 60) {
        // Provavelmente é HHmm sem leading zero
        hours = Math.floor(num / 100);
        mins = num % 100;
      } else {
        mins = num;
      }
    }
  }
  
  // Validar minutos (não podem ser >= 60)
  if (mins >= 60) {
    hours += Math.floor(mins / 60);
    mins = mins % 60;
  }
  
  const totalMinutes = hours * 60 + mins;
  return isNegative ? -totalMinutes : totalMinutes;
}

function isValidHHMM(value: string, allowNegative: boolean = false): boolean {
  if (!value) return false;
  const pattern = allowNegative ? /^-?\d{1,2}:\d{2}$/ : /^\d{1,2}:\d{2}$/;
  if (!pattern.test(value)) return false;
  const [hh, mm] = value.replace(/^-/, "").split(":");
  return parseInt(mm) < 60;
}

interface PaidDayOffFormProps {
  employeeId: string;
  onSuccess: () => void;
}

function PaidDayOffForm({ employeeId, onSuccess }: PaidDayOffFormProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: { employeeId: string; date: string; hours: number; year: number; initialHours?: number }) => {
      const response = await apiRequest("POST", "/api/paid-days-off", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paid-days-off"] });
      toast({
        title: "Folga abonada registrada",
        description: "A folga foi adicionada com sucesso.",
      });
      setOpen(false);
      setDate("");
      setHours("");
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível registrar a folga abonada.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !hours) return;
    
    if (!isValidHHMM(hours, false)) {
      toast({
        title: "Formato inválido",
        description: "Use o formato HH:MM (ex: 08:00)",
        variant: "destructive",
      });
      return;
    }
    
    const minutes = hhmmToMinutes(hours);
    if (minutes === 0) return;

    const dateObj = new Date(date);
    mutation.mutate({
      employeeId,
      date,
      hours: minutes,
      year: dateObj.getFullYear(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-add-paid-day-off">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Folga
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Folga Abonada</DialogTitle>
          <DialogDescription>
            Informe a data e a quantidade de horas da folga abonada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dayOffDate">Data da Folga</Label>
            <Input
              id="dayOffDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              data-testid="input-paid-day-off-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dayOffHours">Horas:Minutos (HH:MM)</Label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setHours("06:00")}
                className="px-3 py-1 text-sm bg-muted rounded-full hover:bg-muted/80 transition-colors"
                data-testid="button-quick-fill-0600"
              >
                06:00
              </button>
              <button
                type="button"
                onClick={() => setHours("09:00")}
                className="px-3 py-1 text-sm bg-muted rounded-full hover:bg-muted/80 transition-colors"
                data-testid="button-quick-fill-0900"
              >
                09:00
              </button>
              <button
                type="button"
                onClick={() => setHours("07:12")}
                className="px-3 py-1 text-sm bg-muted rounded-full hover:bg-muted/80 transition-colors"
                data-testid="button-quick-fill-0712"
              >
                7:12
              </button>
            </div>
            <Input
              id="dayOffHours"
              type="text"
              placeholder="Ex: 08:00 (formato HH:MM)"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
              data-testid="input-paid-day-off-hours"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-paid-day-off">
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
    
    if (!isValidHHMM(hours, true)) {
      toast({
        title: "Formato inválido",
        description: "Use o formato HH:MM ou -HH:MM (ex: 08:30 ou -02:15)",
        variant: "destructive",
      });
      return;
    }
    
    const minutes = hhmmToMinutes(hours);
    if (minutes === 0 && hours !== "0:00" && hours !== "-0:00") return;

    mutation.mutate({
      employeeId,
      month,
      year,
      hours: minutes,
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
            <Label htmlFor="hours">Horas:Minutos (HH:MM)</Label>
            <Input
              id="hours"
              type="text"
              placeholder="Ex: 08:30 ou -04:15 (formato HH:MM)"
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
  const [periodDays, setPeriodDays] = useState(type === "leave" ? "30" : "15");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const calculateEndDate = (start: string, days: number): string => {
    if (!start) return "";
    const date = new Date(start);
    date.setDate(date.getDate() + days - 1);
    return date.toISOString().split('T')[0];
  };

  const endDate = calculateEndDate(startDate, parseInt(periodDays));

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
      setPeriodDays(type === "leave" ? "30" : "15");
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
          <div className={type === "leave" ? "" : "grid grid-cols-2 gap-4"}>
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
            {type === "vacation" && (
              <div className="space-y-2">
                <Label htmlFor="periodDays">Período</Label>
                <Select value={periodDays} onValueChange={setPeriodDays}>
                  <SelectTrigger data-testid="select-period-days">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {startDate && (
            <div className="p-3 bg-muted rounded-md text-sm">
              <p className="text-muted-foreground">Data fim: <span className="font-medium text-foreground">{formatDate(endDate)}</span></p>
            </div>
          )}
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

  const { data: paidDaysOff = [], isLoading: loadingPaidDaysOff } = useQuery<PaidDayOff[]>({
    queryKey: ["/api/paid-days-off"],
    enabled: !!params?.id,
  });

  // All state and memoized values MUST be declared before any conditional returns
  const [observations, setObservations] = useState<string | null>(null);
  const [initialHoursByYear, setInitialHoursByYear] = useState<Record<number, string>>({});
  const [yearCarouselIndex, setYearCarouselIndex] = useState(0);

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

  const deletePaidDayOffMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/paid-days-off/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/paid-days-off"] });
      toast({ title: "Folga abonada removida" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover a folga abonada.",
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

  const currentYear = new Date().getFullYear();
  
  // Compute derived values for use below
  const currentObservations = observations !== null ? observations : (employee?.observations || "");
  
  // Filter employee-specific data - must be after !employee check 
  const employeeHours = useMemo(() => employee ? hoursBank.filter((h) => h.employeeId === employee.id) : [], [hoursBank, employee]);
  const employeeVacations = useMemo(() => employee ? vacations.filter((v) => v.employeeId === employee.id) : [], [vacations, employee]);
  const employeeLeaves = useMemo(() => employee ? leaves.filter((l) => l.employeeId === employee.id) : [], [leaves, employee]);
  const employeePaidDaysOff = useMemo(() => employee ? paidDaysOff.filter((d) => d.employeeId === employee.id) : [], [paidDaysOff, employee]);
  const totalHours = useMemo(() => employeeHours.reduce((sum, h) => sum + h.hours, 0), [employeeHours]);
  
  const currentYearDaysOff = useMemo(() => employeePaidDaysOff.filter(d => d.year === currentYear), [employeePaidDaysOff, currentYear]);
  const usedHoursCurrentYear = useMemo(() => currentYearDaysOff.reduce((sum, d) => sum + d.hours, 0), [currentYearDaysOff]);
  const initialHoursCurrentYear = useMemo(() => initialHoursByYear[currentYear] ? hhmmToMinutes(initialHoursByYear[currentYear]) : 0, [initialHoursByYear, currentYear]);
  const balancePaidDaysOffCurrentYear = useMemo(() => initialHoursCurrentYear - usedHoursCurrentYear, [initialHoursCurrentYear, usedHoursCurrentYear]);

  // Year carousel logic
  const yearsList = useMemo(() => {
    if (employeePaidDaysOff.length === 0) return [currentYear];
    const years = employeePaidDaysOff.map(d => d.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const allYears = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
    // Ensure current year is included
    if (!allYears.includes(currentYear)) {
      allYears.push(currentYear);
      allYears.sort((a, b) => a - b);
    }
    return allYears;
  }, [employeePaidDaysOff, currentYear]);

  // Initialize carousel to current year
  useEffect(() => {
    if (yearsList.length > 0) {
      const currentYearIndex = yearsList.indexOf(currentYear);
      setYearCarouselIndex(currentYearIndex >= 0 ? currentYearIndex : 0);
    }
  }, [yearsList, currentYear]);

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
                {minutesToHHMM(totalHours)}
              </Badge>
            </div>
            {initialHoursCurrentYear > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Saldo Folgas Abonadas ({currentYear})</p>
                <Badge
                  variant={balancePaidDaysOffCurrentYear < 0 ? "destructive" : balancePaidDaysOffCurrentYear > 0 ? "default" : "secondary"}
                  className="mt-1"
                >
                  {balancePaidDaysOffCurrentYear > 0 ? "+" : ""}
                  {minutesToHHMM(balancePaidDaysOffCurrentYear)}
                </Badge>
              </div>
            )}
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
              <TabsTrigger value="paid-off" className="flex items-center gap-2" data-testid="tab-paid-off">
                <Calendar className="h-4 w-4" />
                Abonada
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
                                    {minutesToHHMM(h.hours)}
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
                                          Deseja remover este lançamento de {minutesToHHMM(h.hours)}?
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
                          {employeeVacations.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map((v) => (
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
                          {employeeLeaves.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map((l) => (
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

            <TabsContent value="paid-off" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">Folgas Abonadas</CardTitle>
                    <CardDescription>Registro de folgas abonadas por ano</CardDescription>
                  </div>
                  <PaidDayOffForm employeeId={employee.id} onSuccess={() => {}} />
                </CardHeader>
                <CardContent>
                  {loadingPaidDaysOff ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : employeePaidDaysOff.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma folga abonada registrada
                      </p>
                    </div>
                  ) : yearsList.length <= 1 ? (
                    // Single year - show without carousel
                    <div className="space-y-6">
                      {yearsList.map((year) => {
                        const yearDaysOff = employeePaidDaysOff
                          .filter(d => d.year === year)
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        
                        const totalYearHours = yearDaysOff.reduce((sum, d) => sum + d.hours, 0);
                        const initialHours = initialHoursByYear[year] ? hhmmToMinutes(initialHoursByYear[year]) : 0;
                        const balance = initialHours - totalYearHours;

                        return (
                          <div key={year} className="space-y-4 p-4 border rounded-lg">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg mb-3">{year}</h4>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor={`initial-hours-${year}`} className="text-sm text-muted-foreground min-w-max">Horas Iniciais:</Label>
                                    <Input
                                      id={`initial-hours-${year}`}
                                      type="text"
                                      placeholder="Ex: 40:00"
                                      value={initialHoursByYear[year] || ""}
                                      onChange={(e) => setInitialHoursByYear(prev => ({ ...prev, [year]: e.target.value }))}
                                      className="h-8 w-24"
                                      data-testid={`input-initial-hours-${year}`}
                                    />
                                  </div>
                                  <div className="text-sm space-y-1">
                                    <p><span className="text-muted-foreground">Utilizado:</span> <span className="font-medium">{minutesToHHMM(totalYearHours)}</span></p>
                                    {initialHours > 0 && (
                                      <p><span className="text-muted-foreground">Saldo:</span> <Badge variant={balance < 0 ? "destructive" : balance > 0 ? "default" : "secondary"}>{balance > 0 ? "+" : ""}{minutesToHHMM(balance)}</Badge></p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            {yearDaysOff.length > 0 && (
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Data</TableHead>
                                      <TableHead className="text-center">Horas</TableHead>
                                      <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {yearDaysOff.map((dayOff) => (
                                      <TableRow key={dayOff.id} data-testid={`row-paid-day-off-${dayOff.id}`}>
                                        <TableCell>
                                          {formatDate(dayOff.date)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge variant="default">{minutesToHHMM(dayOff.hours)}</Badge>
                                        </TableCell>
                                        <TableCell>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                data-testid={`button-delete-paid-day-off-${dayOff.id}`}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Remover Folga Abonada</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Deseja remover esta folga abonada de {minutesToHHMM(dayOff.hours)} em {formatDate(dayOff.date)}?
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                  onClick={() => deletePaidDayOffMutation.mutate(dayOff.id)}
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
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Multiple years - show as carousel
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setYearCarouselIndex(prev => prev > 0 ? prev - 1 : yearsList.length - 1)}
                          data-testid="button-prev-year"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex-1 overflow-hidden">
                          <div className="transition-transform duration-300" style={{ transform: `translateX(-${yearCarouselIndex * 100}%)` }}>
                            <div className="flex gap-6">
                              {yearsList.map((year) => {
                                const yearDaysOff = employeePaidDaysOff
                                  .filter(d => d.year === year)
                                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                
                                const totalYearHours = yearDaysOff.reduce((sum, d) => sum + d.hours, 0);
                                const initialHours = initialHoursByYear[year] ? hhmmToMinutes(initialHoursByYear[year]) : 0;
                                const balance = initialHours - totalYearHours;

                                return (
                                  <div key={year} className="w-full flex-shrink-0 space-y-4 p-4 border rounded-lg min-h-[350px]">
                                    <h4 className="font-semibold text-lg">{year}</h4>
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <Label htmlFor={`initial-hours-${year}`} className="text-sm text-muted-foreground min-w-max">Horas Iniciais:</Label>
                                        <Input
                                          id={`initial-hours-${year}`}
                                          type="text"
                                          placeholder="Ex: 40:00"
                                          value={initialHoursByYear[year] || ""}
                                          onChange={(e) => setInitialHoursByYear(prev => ({ ...prev, [year]: e.target.value }))}
                                          className="h-8 w-24"
                                          data-testid={`input-initial-hours-${year}`}
                                        />
                                      </div>
                                      <div className="text-sm space-y-1">
                                        <p><span className="text-muted-foreground">Utilizado:</span> <span className="font-medium">{minutesToHHMM(totalYearHours)}</span></p>
                                        {initialHours > 0 && (
                                          <p><span className="text-muted-foreground">Saldo:</span> <Badge variant={balance < 0 ? "destructive" : balance > 0 ? "default" : "secondary"}>{balance > 0 ? "+" : ""}{minutesToHHMM(balance)}</Badge></p>
                                        )}
                                      </div>
                                    </div>
                                    {yearDaysOff.length > 0 && (
                                      <div className="rounded-md border">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Data</TableHead>
                                              <TableHead className="text-center">Horas</TableHead>
                                              <TableHead className="w-12"></TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {yearDaysOff.map((dayOff) => (
                                              <TableRow key={dayOff.id} data-testid={`row-paid-day-off-${dayOff.id}`}>
                                                <TableCell>
                                                  {formatDate(dayOff.date)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                  <Badge variant="default">{minutesToHHMM(dayOff.hours)}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                  <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        data-testid={`button-delete-paid-day-off-${dayOff.id}`}
                                                      >
                                                        <Trash2 className="h-4 w-4" />
                                                      </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                      <AlertDialogHeader>
                                                        <AlertDialogTitle>Remover Folga Abonada</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                          Deseja remover esta folga abonada de {minutesToHHMM(dayOff.hours)} em {formatDate(dayOff.date)}?
                                                        </AlertDialogDescription>
                                                      </AlertDialogHeader>
                                                      <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                          onClick={() => deletePaidDayOffMutation.mutate(dayOff.id)}
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
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setYearCarouselIndex(prev => prev < yearsList.length - 1 ? prev + 1 : 0)}
                          data-testid="button-next-year"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex justify-center gap-2">
                        {yearsList.map((year, idx) => (
                          <button
                            key={year}
                            onClick={() => setYearCarouselIndex(idx)}
                            className={`h-2 rounded-full transition-all ${idx === yearCarouselIndex ? 'w-8 bg-foreground' : 'w-2 bg-muted-foreground/50'}`}
                            data-testid={`button-year-indicator-${year}`}
                          />
                        ))}
                      </div>
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
