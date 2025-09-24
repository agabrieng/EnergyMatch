import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import PurchaseIntent from "@/pages/purchase-intent";
import IframePurchaseIntent from "@/pages/iframe-purchase-intent";
import ComercializadoraDashboard from "@/pages/comercializadora-dashboard";
import AvailableIntents from "@/pages/available-intents";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminSolicitationsTracking from "@/pages/admin-solicitations-tracking";
import AdminSync from "@/pages/admin-sync";
import ComercializadoraRegistration from "@/pages/comercializadora-registration";
import ComercializadorasList from "@/pages/comercializadoras-list";
import NotFound from "@/pages/not-found";
import UserManagement from "@/pages/user-management";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Auth} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/purchase-intent" component={PurchaseIntent} />
      <Route path="/iframe-purchase-intent" component={IframePurchaseIntent} />
      <Route path="/comercializadora-dashboard" component={ComercializadoraDashboard} />
      <Route path="/available-intents" component={AvailableIntents} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/admin-solicitations-tracking" component={AdminSolicitationsTracking} />
      <Route path="/admin-sync" component={AdminSync} />
      <Route path="/comercializadora-registration" component={ComercializadoraRegistration} />
      <Route path="/comercializadoras-list" component={ComercializadorasList} />
      <Route path="/user-management" component={UserManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="energia-livre-theme">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
