import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const routeMap: Record<string, BreadcrumbItem[]> = {
  "/": [{ label: "Dashboard" }],
  "/employees": [
    { label: "Dashboard", href: "/" },
    { label: "Funcionários" },
  ],
  "/employees/new": [
    { label: "Dashboard", href: "/" },
    { label: "Funcionários", href: "/employees" },
    { label: "Novo Funcionário" },
  ],
};

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (routeMap[pathname]) {
    return routeMap[pathname];
  }

  const employeeDetailMatch = pathname.match(/^\/employees\/([^/]+)$/);
  if (employeeDetailMatch) {
    return [
      { label: "Dashboard", href: "/" },
      { label: "Funcionários", href: "/employees" },
      { label: "Detalhes" },
    ];
  }

  const employeeEditMatch = pathname.match(/^\/employees\/([^/]+)\/edit$/);
  if (employeeEditMatch) {
    return [
      { label: "Dashboard", href: "/" },
      { label: "Funcionários", href: "/employees" },
      { label: "Detalhes", href: `/employees/${employeeEditMatch[1]}` },
      { label: "Editar" },
    ];
  }

  return [{ label: "Dashboard", href: "/" }];
}

export function Breadcrumbs() {
  const [location] = useLocation();
  const items = getBreadcrumbs(location);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm" data-testid="breadcrumbs">
      <ol className="flex items-center gap-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`breadcrumb-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                {index === 0 ? (
                  <span className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            ) : (
              <span
                className="font-medium text-foreground"
                data-testid={`breadcrumb-current`}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
