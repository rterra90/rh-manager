import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Filter,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Employee, HoursBank } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

function minutesToHHMM(minutes: number): string {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? '-' : '';
  return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(
    2,
    '0',
  )}`;
}

function EmployeeTableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-12 flex-1" />
        </div>
      ))}
    </div>
  );
}

export default function EmployeesList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoursFilter, setHoursFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const { toast } = useToast();

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<
    Employee[]
  >({
    queryKey: ['/api/employees'],
  });

  const { data: hoursBank = [] } = useQuery<HoursBank[]>({
    queryKey: ['/api/hours-bank'],
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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const promises = ids.map((id) =>
        apiRequest('DELETE', `/api/employees/${id}`),
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hours-bank'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vacations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaves'] });
      setSelectedEmployees(new Set());
      setShowBulkDeleteDialog(false);
      toast({
        title: 'Funcionários removidos',
        description: `${selectedEmployees.size} funcionário(s) removido(s) com sucesso.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover alguns funcionários.',
        variant: 'destructive',
      });
    },
  });

  const getEmployeeHoursBalance = (employeeId: string): number => {
    return hoursBank
      .filter((h) => h.employeeId === employeeId)
      .reduce((sum, h) => sum + h.hours, 0);
  };

  const filteredEmployees = employees
    .filter((employee) => {
      const matchesSearch =
        employee.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.registrationNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchQuery.toLowerCase());

      const hoursBalance = getEmployeeHoursBalance(employee.id);
      const matchesHours =
        hoursFilter === 'all' ||
        (hoursFilter === 'positive' && hoursBalance > 0) ||
        (hoursFilter === 'negative' && hoursBalance < 0) ||
        (hoursFilter === 'zero' && hoursBalance === 0);

      return matchesSearch && matchesHours;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.fullName.localeCompare(b.fullName, 'pt-BR');
      } else if (sortBy === 'negative-hours') {
        const balanceA = getEmployeeHoursBalance(a.id);
        const balanceB = getEmployeeHoursBalance(b.id);
        return balanceA - balanceB;
      } else if (sortBy === 'positive-hours') {
        const balanceA = getEmployeeHoursBalance(a.id);
        const balanceB = getEmployeeHoursBalance(b.id);
        return balanceB - balanceA;
      } else if (sortBy === 'position') {
        return a.position.localeCompare(b.position, 'pt-BR');
      }
      return 0;
    });

  const toggleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map((e) => e.id)));
    }
  };

  const toggleSelectEmployee = (id: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEmployees(newSelected);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Funcionários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os funcionários cadastrados
          </p>
        </div>
        <Link href="/employees/new">
          <Button data-testid="button-add-employee">
            <Plus className="h-4 w-4 mr-2" />
            Novo Funcionário
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Funcionários
              <Badge variant="secondary" className="ml-2">
                {employees.length}
              </Badge>
            </CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, matrícula ou cargo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-employee"
                />
              </div>
              <Select value={hoursFilter} onValueChange={setHoursFilter}>
                <SelectTrigger
                  className="w-full sm:w-48"
                  data-testid="select-hours-filter"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por horas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="positive">Horas Positivas</SelectItem>
                  <SelectItem value="negative">Horas Negativas</SelectItem>
                  <SelectItem value="zero">Sem Horas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger
                  className="w-full sm:w-56"
                  data-testid="select-sort-by"
                >
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome (A-Z)</SelectItem>
                  <SelectItem value="negative-hours">
                    Banco de Horas Negativo
                  </SelectItem>
                  <SelectItem value="positive-hours">
                    Banco de Horas Positivo
                  </SelectItem>
                  <SelectItem value="position">Cargo</SelectItem>
                </SelectContent>
              </Select>
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
                {searchQuery || hoursFilter !== 'all'
                  ? 'Nenhum funcionário encontrado'
                  : 'Nenhum funcionário cadastrado'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {searchQuery || hoursFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece adicionando seu primeiro funcionário'}
              </p>
              {!searchQuery && hoursFilter === 'all' && (
                <Link href="/employees/new">
                  <Button data-testid="button-add-first-employee">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Funcionário
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedEmployees.size > 0 && (
                <AlertDialog
                  open={showBulkDeleteDialog}
                  onOpenChange={setShowBulkDeleteDialog}
                >
                  <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
                    <p className="text-sm font-medium">
                      {selectedEmployees.size} funcionário
                      {selectedEmployees.size > 1 ? 's' : ''} selecionado
                      {selectedEmployees.size > 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEmployees(new Set())}
                        data-testid="button-cancel-bulk-delete"
                      >
                        Cancelar
                      </Button>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          data-testid="button-start-bulk-delete"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover Selecionados
                        </Button>
                      </AlertDialogTrigger>
                    </div>
                  </div>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover Funcionários</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja remover {selectedEmployees.size}{' '}
                        funcionário{selectedEmployees.size > 1 ? 's' : ''}? Esta
                        ação não pode ser desfeita e todos os dados relacionados
                        serão perdidos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          bulkDeleteMutation.mutate(
                            Array.from(selectedEmployees),
                          )
                        }
                        disabled={bulkDeleteMutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-bulk-delete"
                      >
                        {bulkDeleteMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Removendo...
                          </>
                        ) : (
                          'Remover'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedEmployees.size ===
                              filteredEmployees.length &&
                            filteredEmployees.length > 0
                          }
                          indeterminate={
                            selectedEmployees.size > 0 &&
                            selectedEmployees.size < filteredEmployees.length
                          }
                          onCheckedChange={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>Nome Completo</TableHead>
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
                      const isSelected = selectedEmployees.has(employee.id);
                      return (
                        <TableRow
                          key={employee.id}
                          data-testid={`row-employee-${employee.id}`}
                          className={isSelected ? 'bg-muted' : ''}
                        >
                          <TableCell className="w-12">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() =>
                                toggleSelectEmployee(employee.id)
                              }
                              data-testid={`checkbox-employee-${employee.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link
                              href={`/employees/${employee.id}`}
                              className="hover:underline"
                              data-testid={`link-employee-${employee.id}`}
                            >
                              {employee.fullName}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
