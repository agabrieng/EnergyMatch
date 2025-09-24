import { Home, Plus, List, Handshake, TrendingUp, Search, FileText, Building, Users, BarChart3, Settings, LogOut, Zap, ExternalLink, ClipboardList, Database } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import logoImage from "@assets/EnergyMatch_Logo_02_1756844933907.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";

import EnergyMatch_Logo_02 from "@assets/EnergyMatch_Logo_02.png";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  disabled?: boolean;
}

const userNavItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Nova Intenção", url: "/purchase-intent", icon: Plus, disabled: true },
  { title: "Intenção via Parceiro", url: "/iframe-purchase-intent", icon: ExternalLink },
  { title: "Minhas Intenções", url: "/my-intents", icon: List, disabled: true },
  { title: "Propostas Recebidas", url: "/proposals", icon: Handshake, disabled: true },
];

const comercializadoraNavItems: NavItem[] = [
  { title: "Dashboard", url: "/comercializadora-dashboard", icon: TrendingUp },
  { title: "Intenções Disponíveis", url: "/available-intents", icon: Search },
  { title: "Minhas Propostas", url: "/my-proposals", icon: FileText },
  { title: "Perfil da Empresa", url: "/company-profile", icon: Building },
];

const adminNavItems: NavItem[] = [
  { title: "Dashboard Admin", url: "/admin-dashboard", icon: BarChart3 },
  { title: "Tracking Solicitações", url: "/admin-solicitations-tracking", icon: ClipboardList },
  { title: "Sincronização", url: "/admin-sync", icon: Database },
  { title: "Gerenciar Usuários", url: "/user-management", icon: Users },
  { title: "Comercializadoras", url: "/comercializadoras-list", icon: Building },
  { title: "Cadastrar Comercializadora", url: "/comercializadora-registration", icon: Plus },
  { title: "Analytics", url: "/platform-analytics", icon: BarChart3 },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getNavItems = () => {
    switch (user?.role) {
      case "comercializadora":
        return comercializadoraNavItems;
      case "admin":
        return adminNavItems;
      default:
        return userNavItems;
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case "comercializadora":
        return "Comercializadora";
      case "admin":
        return "Administrador";
      default:
        return "Cliente";
    }
  };

  const getUserInitials = () => {
    return user?.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U";
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-4 py-6">
          <div className="w-8 h-8 rounded-md flex items-center justify-center">
            <img 
              src={EnergyMatch_Logo_02} 
              alt="Energy Match Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="font-semibold text-sidebar-foreground">EnergyMatch</h2>
            <p className="text-xs text-sidebar-foreground/60">{getRoleLabel()}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {getNavItems().map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url && !item.disabled}
                    data-testid={`nav-${item.url.replace("/", "")}`}
                  >
                    <button
                      onClick={() => !item.disabled && setLocation(item.url)}
                      disabled={item.disabled}
                      className={cn(
                        "flex items-center gap-3",
                        item.disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.disabled && (
                        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-auto">
                          Inativo
                        </span>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-primary-foreground">
                {getUserInitials()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.name}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={async () => {
              setIsLoggingOut(true);
              try {
                await logout();
              } finally {
                setIsLoggingOut(false);
              }
            }}
            disabled={isLoggingOut}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoggingOut ? "Saindo..." : "Sair"}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
