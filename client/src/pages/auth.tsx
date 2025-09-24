import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Zap } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import logoImage from "@assets/EnergyMatch_Logo_01_1756844451221.png";

import EnergyMatch_Logo_01 from "@assets/EnergyMatch_Logo_01.png";

export default function Auth() {
  const { user, login, register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      switch (user.role) {
        case "admin":
          setLocation("/admin-dashboard");
          break;
        case "comercializadora":
          setLocation("/comercializadora-dashboard");
          break;
        default:
          setLocation("/dashboard");
      }
    }
  }, [user, setLocation]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await login(email, password);
      toast({
        title: "Sucesso!",
        description: "Login realizado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "E-mail ou senha incorretos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const userData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      role: formData.get("role") as string,
    };

    try {
      await register(userData);
      toast({
        title: "Sucesso!",
        description: "Conta criada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="auth-container p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-72 h-72 mx-auto mb-4">
            <img 
              src={EnergyMatch_Logo_01} 
              alt="Energy Match Logo" 
              className="w-full h-full object-contain"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Entrar</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Cadastrar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="seu-email@exemplo.com"
                    required
                    data-testid="input-login-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    data-testid="input-login-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Nome Completo</Label>
                  <Input
                    id="register-name"
                    name="name"
                    type="text"
                    placeholder="Seu nome completo"
                    required
                    data-testid="input-register-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">E-mail</Label>
                  <Input
                    id="register-email"
                    name="email"
                    type="email"
                    placeholder="seu-email@exemplo.com"
                    required
                    data-testid="input-register-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Senha</Label>
                  <Input
                    id="register-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    data-testid="input-register-password"
                  />
                </div>
                {/* Campo oculto para definir o tipo como cliente automaticamente */}
                <input type="hidden" name="role" value="user" />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  data-testid="button-register"
                >
                  {isLoading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 google-btn"
              onClick={handleGoogleAuth}
              data-testid="button-google-auth"
            >
              <FaGoogle className="mr-2 h-4 w-4" />
              Continuar com Google
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Ao continuar, você concorda com nossos{" "}
            <a href="#" className="text-primary hover:underline">
              Termos de Serviço
            </a>{" "}
            e{" "}
            <a href="#" className="text-primary hover:underline">
              Política de Privacidade
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
