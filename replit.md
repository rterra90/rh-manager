# Sistema de RH - Gestão de Funcionários

## Visão Geral
Sistema de gestão de recursos humanos para controle de funcionários, incluindo cadastro, banco de horas, férias, licença-prêmio e observações.

## Stack Tecnológico
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + TypeScript
- **Armazenamento**: In-memory storage
- **Roteamento Frontend**: Wouter
- **Formulários**: React Hook Form + Zod
- **Data Fetching**: TanStack Query

## Estrutura do Projeto

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # Componentes Shadcn UI
│   │   │   ├── app-sidebar.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── pages/
│   │   │   ├── dashboard.tsx       # Dashboard com visão geral
│   │   │   ├── employees-list.tsx  # Lista de funcionários
│   │   │   ├── employee-form.tsx   # Formulário de cadastro/edição
│   │   │   ├── employee-detail.tsx # Detalhes do funcionário
│   │   │   └── not-found.tsx
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── App.tsx
│   │   └── index.css
│   └── index.html
├── server/
│   ├── routes.ts    # Rotas da API
│   ├── storage.ts   # Interface de armazenamento
│   └── index.ts
├── shared/
│   └── schema.ts    # Schemas Drizzle/Zod
└── design_guidelines.md
```

## Funcionalidades

### Gestão de Funcionários
- Cadastro com nome completo, matrícula e cargo
- Edição de dados cadastrais
- Remoção de funcionários
- Campo de observações para anotações

### Banco de Horas
- Lançamento de horas positivas ou negativas mês a mês
- Visualização do saldo total
- Descrição opcional para cada lançamento

### Férias
- Registro de períodos pretendidos de férias
- Status: Pendente, Aprovado, Rejeitado, Concluído
- Observações adicionais

### Licença-Prêmio
- Registro de períodos pretendidos de licença-prêmio
- Status: Pendente, Aprovado, Rejeitado, Concluído
- Observações adicionais

## API Endpoints

### Funcionários
- `GET /api/employees` - Lista todos os funcionários
- `GET /api/employees/:id` - Busca funcionário por ID
- `POST /api/employees` - Cria novo funcionário
- `PATCH /api/employees/:id` - Atualiza funcionário
- `DELETE /api/employees/:id` - Remove funcionário

### Banco de Horas
- `GET /api/hours-bank` - Lista todos os lançamentos
- `GET /api/hours-bank/employee/:employeeId` - Lançamentos por funcionário
- `POST /api/hours-bank` - Cria lançamento
- `DELETE /api/hours-bank/:id` - Remove lançamento

### Férias
- `GET /api/vacations` - Lista todas as férias
- `GET /api/vacations/employee/:employeeId` - Férias por funcionário
- `POST /api/vacations` - Cria período de férias
- `PATCH /api/vacations/:id` - Atualiza período
- `DELETE /api/vacations/:id` - Remove período

### Licença-Prêmio
- `GET /api/leaves` - Lista todas as licenças
- `GET /api/leaves/employee/:employeeId` - Licenças por funcionário
- `POST /api/leaves` - Cria período de licença
- `PATCH /api/leaves/:id` - Atualiza período
- `DELETE /api/leaves/:id` - Remove período

## Modelos de Dados

### Employee
- id: string (UUID)
- fullName: string
- registrationNumber: string (único)
- position: string
- observations: string | null

### HoursBank
- id: string (UUID)
- employeeId: string
- month: number (1-12)
- year: number
- hours: number (positivo ou negativo)
- description: string | null

### VacationPeriod / LeavePeriod
- id: string (UUID)
- employeeId: string
- startDate: string (YYYY-MM-DD)
- endDate: string (YYYY-MM-DD)
- status: "pending" | "approved" | "rejected" | "completed"
- notes: string | null

## Como Executar
```bash
npm run dev
```

O servidor será iniciado na porta 5000 com frontend e backend integrados.

## Preferências de Design
- Fonte: Inter
- Tema: Light/Dark mode suportado
- Layout: Sidebar fixo à esquerda + área principal
- Estilo: Linear/Notion-inspired (produtividade corporativa)
