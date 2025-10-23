import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, BarChart3, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/painel");
      }
    };
    checkUser();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-muted">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">PontoFácil</span>
          </div>
          <Button onClick={() => navigate("/auth")} variant="outline">
            Entrar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <section className="py-20 text-center max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex h-20 w-20 rounded-2xl bg-gradient-primary items-center justify-center mb-6">
              <Clock className="h-12 w-12 text-primary-foreground" />
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Controle de Ponto Simplificado
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Gerencie seus horários de trabalho de forma prática e segura. 
              Registre entradas, saídas e pausas com um clique.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="h-12 px-8 text-base bg-gradient-primary hover:opacity-90"
              >
                Começar Agora
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/auth")}
                className="h-12 px-8 text-base"
              >
                Fazer Login
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-xl shadow-md border">
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fácil de Usar</h3>
              <p className="text-muted-foreground">
                Interface intuitiva para registrar pontos rapidamente, sem complicações.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-md border">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Relatórios Detalhados</h3>
              <p className="text-muted-foreground">
                Acompanhe seu histórico de trabalho com relatórios claros e precisos.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-md border">
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-warning" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Seguro e Confiável</h3>
              <p className="text-muted-foreground">
                Seus dados protegidos com autenticação segura e backup automático.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-20 border-t">
        <div className="text-center text-muted-foreground">
          <p>© 2025 PontoFácil. Sistema de controle de ponto profissional.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
