import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Users,
  Clock,
  Palmtree,
  AlertTriangle,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BulkImportDialog } from '@/components/bulk-import-dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
} from '@/components/ui/alert-dialog';
import type {
  Employee,
  HoursBank,
  VacationPeriod,
  LeavePeriod,
  PaidDayOff,
} from '@shared/schema';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function minutesToHHMM(minutes: number): string {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? '-' : '';
  return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(
    2,
    '0',
  )}`;
}

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  variant?: 'default' | 'warning' | 'success';
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  variant = 'default',
}: StatsCardProps) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    vacationsAndLeaves: true,
    paidDaysOff: true,
    employees: true,
  });
  const { toast } = useToast();

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<
    Employee[]
  >({
    queryKey: ['/api/employees'],
  });

  const { data: hoursBank = [], isLoading: loadingHours } = useQuery<
    HoursBank[]
  >({
    queryKey: ['/api/hours-bank'],
  });

  const { data: vacations = [], isLoading: loadingVacations } = useQuery<
    VacationPeriod[]
  >({
    queryKey: ['/api/vacations'],
  });

  const { data: leaves = [] } = useQuery<LeavePeriod[]>({
    queryKey: ['/api/leaves'],
  });

  const { data: paidDaysOff = [] } = useQuery<PaidDayOff[]>({
    queryKey: ['/api/paid-days-off'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/employees/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hours-bank'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vacations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaves'] });
      toast({
        title: 'Funcionário removido',
        description: 'O funcionário foi removido com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o funcionário.',
        variant: 'destructive',
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      id,
      type,
      status,
    }: {
      id: string;
      type: 'vacation' | 'leave';
      status: 'approved' | 'rejected';
    }) => {
      const endpoint =
        type === 'vacation' ? `/api/vacations/${id}` : `/api/leaves/${id}`;
      const response = await apiRequest('PATCH', endpoint, { status });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vacations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaves'] });
      toast({ title: 'Status atualizado com sucesso' });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    },
  });

  const getEmployeeHoursBalance = (employeeId: string): number => {
    return hoursBank
      .filter((h) => h.employeeId === employeeId)
      .reduce((sum, h) => sum + h.hours, 0);
  };

  const getEmployeeNameById = (id: string): string => {
    return employees.find((e) => e.id === id)?.fullName || 'Desconhecido';
  };

  const isDateInNext3Months = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    return date >= today && date <= threeMonthsLater;
  };

  const isDateRangeActive = (startDate: string, endDate: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return today >= start && today <= end;
  };

  const employeesOnVacation = employees
    .filter((e) => {
      const employeeVacations = vacations.filter(
        (v) =>
          v.employeeId === e.id &&
          (v.status === 'approved' || v.status === 'pending') &&
          isDateRangeActive(v.startDate, v.endDate),
      );
      const employeeLeaves = leaves.filter(
        (l) =>
          l.employeeId === e.id &&
          (l.status === 'approved' || l.status === 'pending') &&
          isDateRangeActive(l.startDate, l.endDate),
      );
      return employeeVacations.length > 0 || employeeLeaves.length > 0;
    })
    .map((e) => ({
      employee: e,
      periods: [
        ...vacations
          .filter(
            (v) =>
              v.employeeId === e.id &&
              (v.status === 'approved' || v.status === 'pending') &&
              isDateRangeActive(v.startDate, v.endDate),
          )
          .map((v) => ({ ...v, type: 'vacation' })),
        ...leaves
          .filter(
            (l) =>
              l.employeeId === e.id &&
              (l.status === 'approved' || l.status === 'pending') &&
              isDateRangeActive(l.startDate, l.endDate),
          )
          .map((l) => ({ ...l, type: 'leave' })),
      ],
    }));

  const pendingVacations = vacations.filter(
    (v) => v.status === 'pending',
  ).length;
  const pendingLeaves = leaves.filter((l) => l.status === 'pending').length;
  const upcomingVacations = vacations
    .filter((v) => isDateInNext3Months(v.startDate))
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
  const upcomingLeaves = leaves
    .filter((l) => isDateInNext3Months(l.startDate))
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

  const employeesWithNegativeBalance = employees.filter(
    (e) => getEmployeeHoursBalance(e.id) < 0,
  ).length;

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.registrationNumber
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Paid days off logic
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];

  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const sevenDaysLaterString = sevenDaysLater.toISOString().split('T')[0];

  const paidDaysOffToday = paidDaysOff
    .filter((p) => p.date === todayString)
    .map((p) => ({
      ...p,
      employee: employees.find((e) => e.id === p.employeeId),
    }))
    .filter((p) => p.employee)
    .sort((a, b) => a.employee!.fullName.localeCompare(b.employee!.fullName));

  const paidDaysOffNext7Days = paidDaysOff
    .filter((p) => p.date > todayString && p.date <= sevenDaysLaterString)
    .map((p) => ({
      ...p,
      employee: employees.find((e) => e.id === p.employeeId),
    }))
    .filter((p) => p.employee)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.employee!.fullName.localeCompare(b.employee!.fullName);
    });

  const totalPaidDaysOffToday = paidDaysOffToday.length;
  const totalPaidDaysOffNext7Days = paidDaysOffNext7Days.length;

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
        <div className="flex gap-2">
          <BulkImportDialog />
          <Link href="/employees/new">
            <Button data-testid="button-add-employee">
              <Plus className="h-4 w-4 mr-2" />
              Novo Funcionário
            </Button>
          </Link>
        </div>
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
              variant={employeesWithNegativeBalance > 0 ? 'warning' : 'default'}
            />
            <StatsCard
              title="Férias Pendentes"
              value={pendingVacations}
              description="Solicitações aguardando"
              icon={Palmtree}
              variant={pendingVacations > 0 ? 'warning' : 'success'}
            />
            <StatsCard
              title="Licenças Pendentes"
              value={pendingLeaves}
              description="Licenças-prêmio aguardando"
              icon={AlertTriangle}
              variant={pendingLeaves > 0 ? 'warning' : 'success'}
            />
          </>
        )}
      </div>

      {(totalPaidDaysOffToday > 0 || totalPaidDaysOffNext7Days > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Folgas Abonadas</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSection('paidDaysOff')}
                data-testid="button-toggle-paid-days-off"
                className="h-6 w-6"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    expandedSections.paidDaysOff ? '' : '-rotate-90'
                  }`}
                />
              </Button>
            </div>
          </CardHeader>
          {expandedSections.paidDaysOff ? (
            <CardContent>
              <div className="space-y-6">
                {totalPaidDaysOffToday > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Hoje
                    </h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Funcionário</TableHead>
                            <TableHead>Matrícula</TableHead>
                            <TableHead className="text-center">Horas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paidDaysOffToday.map((p) => (
                            <TableRow
                              key={p.id}
                              data-testid={`row-paid-day-off-today-${p.id}`}
                            >
                              <TableCell>
                                <Link href={`/employees/${p.employeeId}`}>
                                  <p className="font-medium text-primary hover:underline cursor-pointer">
                                    {p.employee?.fullName}
                                  </p>
                                </Link>
                              </TableCell>
                              <TableCell>
                                {p.employee?.registrationNumber}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge>{minutesToHHMM(p.hours)}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                {totalPaidDaysOffNext7Days > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Próximos 7 Dias
                    </h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Funcionário</TableHead>
                            <TableHead>Matrícula</TableHead>
                            <TableHead className="text-center">Horas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paidDaysOffNext7Days.map((p) => (
                            <TableRow
                              key={p.id}
                              data-testid={`row-paid-day-off-next7-${p.id}`}
                            >
                              <TableCell className="font-medium">
                                {formatDate(p.date)}
                              </TableCell>
                              <TableCell>
                                <Link href={`/employees/${p.employeeId}`}>
                                  <p className="font-medium text-primary hover:underline cursor-pointer">
                                    {p.employee?.fullName}
                                  </p>
                                </Link>
                              </TableCell>
                              <TableCell>
                                {p.employee?.registrationNumber}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge>{minutesToHHMM(p.hours)}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {totalPaidDaysOffToday} hoje, {totalPaidDaysOffNext7Days}{' '}
                próximos 7 dias
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {(employeesOnVacation.length > 0 ||
        upcomingVacations.length > 0 ||
        upcomingLeaves.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Férias e Licença prêmio</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSection('vacationsAndLeaves')}
                data-testid="button-toggle-vacations-leaves"
                className="h-6 w-6"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    expandedSections.vacationsAndLeaves ? '' : '-rotate-90'
                  }`}
                />
              </Button>
            </div>
          </CardHeader>
          {expandedSections.vacationsAndLeaves ? (
            <CardContent>
              <div className="space-y-6">
                {employeesOnVacation.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Palmtree className="h-4 w-4" />
                      Hoje
                    </h3>
                    <div className="space-y-2">
                      {employeesOnVacation.map(({ employee, periods }) => (
                        <div
                          key={employee.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                          data-testid={`card-on-vacation-${employee.id}`}
                        >
                          <div className="flex-1">
                            <Link href={`/employees/${employee.id}`}>
                              <p className="font-medium text-primary hover:underline cursor-pointer">
                                {employee.fullName}
                              </p>
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              {periods
                                .map((p) =>
                                  p.type === 'vacation'
                                    ? 'Férias'
                                    : 'Licença-Prêmio',
                                )
                                .join(' + ')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Término:{' '}
                              <span className="font-medium">
                                {formatDate(periods[0].endDate)}
                              </span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {periods.map((p) => (
                              <Badge
                                key={p.id}
                                variant={
                                  p.status === 'pending' ? 'outline' : 'default'
                                }
                              >
                                {p.status === 'pending'
                                  ? 'Pendente'
                                  : 'Aprovado'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(upcomingVacations.length > 0 ||
                  upcomingLeaves.length > 0) && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Palmtree className="h-4 w-4" />
                      Próximos 3 Meses
                    </h3>
                    <div className="space-y-2">
                      {upcomingVacations.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                          data-testid={`card-vacation-${v.id}`}
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              {getEmployeeNameById(v.employeeId)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(v.startDate)} até{' '}
                              {formatDate(v.endDate)}
                            </p>
                            {v.notes && (
                              <p className="text-sm mt-1">{v.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                v.status === 'pending'
                                  ? 'outline'
                                  : v.status === 'approved'
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {v.status === 'pending'
                                ? 'Pendente'
                                : v.status === 'approved'
                                ? 'Lançado no sistema'
                                : 'Rejeitado'}
                            </Badge>
                            {v.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    approveMutation.mutate({
                                      id: v.id,
                                      type: 'vacation',
                                      status: 'approved',
                                    })
                                  }
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-approve-vacation-${v.id}`}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    approveMutation.mutate({
                                      id: v.id,
                                      type: 'vacation',
                                      status: 'rejected',
                                    })
                                  }
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-reject-vacation-${v.id}`}
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {upcomingLeaves.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                          data-testid={`card-leave-${l.id}`}
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              {getEmployeeNameById(l.employeeId)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(l.startDate)} até{' '}
                              {formatDate(l.endDate)}
                            </p>
                            {l.notes && (
                              <p className="text-sm mt-1">{l.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                l.status === 'pending'
                                  ? 'outline'
                                  : l.status === 'approved'
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {l.status === 'pending'
                                ? 'Pendente'
                                : l.status === 'approved'
                                ? 'Lançado no sistema'
                                : 'Rejeitado'}
                            </Badge>
                            {l.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    approveMutation.mutate({
                                      id: l.id,
                                      type: 'leave',
                                      status: 'approved',
                                    })
                                  }
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-approve-leave-${l.id}`}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    approveMutation.mutate({
                                      id: l.id,
                                      type: 'leave',
                                      status: 'rejected',
                                    })
                                  }
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-reject-leave-${l.id}`}
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {employeesOnVacation.length} hoje •{' '}
                {upcomingVacations.length + upcomingLeaves.length} próximos 3
                meses
              </p>
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Funcionários</CardTitle>
            {expandedSections.employees && (
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
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleSection('employees')}
              data-testid="button-toggle-employees"
              className="h-6 w-6"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expandedSections.employees ? '' : '-rotate-90'
                }`}
              />
            </Button>
          </div>
        </CardHeader>
        {expandedSections.employees ? (
          <CardContent>
            {loadingEmployees ? (
              <EmployeeTableSkeleton />
            ) : filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">
                  {searchQuery
                    ? 'Nenhum funcionário encontrado'
                    : 'Nenhum funcionário cadastrado'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  {searchQuery
                    ? 'Tente buscar com outros termos'
                    : 'Comece adicionando seu primeiro funcionário'}
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
                      <TableHead className="text-center">
                        Banco de Horas
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => {
                      const hoursBalance = getEmployeeHoursBalance(employee.id);
                      return (
                        <TableRow
                          key={employee.id}
                          data-testid={`row-employee-${employee.id}`}
                        >
                          <TableCell className="font-medium">
                            <Link href={`/employees/${employee.id}`}>
                              <span className="text-primary hover:underline cursor-pointer">
                                {employee.fullName}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell>{employee.registrationNumber}</TableCell>
                          <TableCell>{employee.position}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                hoursBalance < 0
                                  ? 'destructive'
                                  : hoursBalance > 0
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {hoursBalance > 0 ? '+' : ''}
                              {minutesToHHMM(hoursBalance)}
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
                                    <AlertDialogTitle>
                                      Remover Funcionário
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover{' '}
                                      <strong>{employee.fullName}</strong>? Esta
                                      ação não pode ser desfeita e todos os
                                      dados relacionados serão perdidos.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        deleteMutation.mutate(employee.id)
                                      }
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
        ) : (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {filteredEmployees.length} funcionário
              {filteredEmployees.length > 1 ? 's' : ''} cadastrado
              {filteredEmployees.length > 1 ? 's' : ''}
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
