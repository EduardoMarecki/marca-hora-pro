import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, BarChart3, Shield, FileDown, Smartphone, Users, Filter, ShieldCheck, ArrowUp } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/painel");
      }
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
              <a href="#recursos" className="hover:text-foreground">Recursos</a>
              <a href="#faq" className="hover:text-foreground">FAQ</a>
            </nav>
            <a href="#recursos" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground">Conheça recursos</a>
            <Button onClick={() => navigate("/auth")} variant="outline">
              Entrar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4">
        {/* Hero */}
        <section className="py-20 text-center max-w-5xl mx-auto relative">
          {/* Decorativo sutil */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-40 w-40 bg-primary/20 blur-3xl rounded-full -z-10" aria-hidden="true" />
          <div className="mb-8">
            <div className="inline-flex h-20 w-20 rounded-2xl bg-gradient-primary items-center justify-center mb-6">
              <Clock className="h-12 w-12 text-primary-foreground" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Controle de Ponto Simplificado
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Gerencie seus horários de trabalho de forma prática e segura. 
              Registre entradas, saídas e pausas com um clique.
            </p>
            <div className="flex gap-4 justify-center flex-col sm:flex-row">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="h-12 px-8 text-base bg-gradient-primary hover:opacity-90 shadow-md hover:shadow-lg transition-shadow"
              >
                Começar Agora
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/auth")}
                className="h-12 px-8 text-base hover:shadow-md transition-shadow"
              >
                Fazer Login
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">Sem burocracia: login seguro, histórico detalhado e exportações em CSV/PDF.</p>
          </div>
        </section>

        {/* Benefícios principais */}
        <section className="py-16 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-xl shadow-md border transition-transform hover:-translate-y-0.5 hover:shadow-lg">
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fácil de Usar</h3>
              <p className="text-muted-foreground">
                Interface intuitiva para registrar pontos rapidamente, sem complicações.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-md border transition-transform hover:-translate-y-0.5 hover:shadow-lg">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Relatórios Detalhados</h3>
              <p className="text-muted-foreground">
                Acompanhe seu histórico de trabalho com relatórios claros e precisos.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-md border transition-transform hover:-translate-y-0.5 hover:shadow-lg">
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

        {/* Como funciona */}
        <section id="como-funciona" className="py-12 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-xl border">
              <div className="text-sm text-muted-foreground mb-2">Passo 1</div>
              <h3 className="text-lg font-semibold mb-2">Registre Entrada</h3>
              <p className="text-muted-foreground">Abra o app e registre sua entrada com um clique.</p>
            </div>
            <div className="bg-card p-6 rounded-xl border">
              <div className="text-sm text-muted-foreground mb-2">Passo 2</div>
              <h3 className="text-lg font-semibold mb-2">Controle Pausas</h3>
              <p className="text-muted-foreground">Inicie e finalize pausas (almoço, café) com acompanhamento no histórico.</p>
            </div>
            <div className="bg-card p-6 rounded-xl border">
              <div className="text-sm text-muted-foreground mb-2">Passo 3</div>
              <h3 className="text-lg font-semibold mb-2">Registre Saída</h3>
              <p className="text-muted-foreground">Finalize seu expediente e gere relatórios do período.</p>
            </div>
          </div>
        </section>

        {/* Recursos avançados */}
        <section id="recursos" className="py-16 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Recursos avançados</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card p-5 rounded-xl border">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Histórico com filtros e paginação</h3>
              <p className="text-sm text-muted-foreground">Filtre por data, tipo e usuário (admin) e navegue por páginas com desempenho.</p>
            </div>
            <div className="bg-card p-5 rounded-xl border">
              <div className="h-10 w-10 rounded-md bg-accent/10 flex items-center justify-center mb-3">
                <FileDown className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold mb-1">Exportações CSV e PDF</h3>
              <p className="text-sm text-muted-foreground">Baixe relatórios com layout padronizado em tabela e paginação automática.</p>
            </div>
            <div className="bg-card p-5 rounded-xl border">
              <div className="h-10 w-10 rounded-md bg-warning/10 flex items-center justify-center mb-3">
                <Smartphone className="h-5 w-5 text-warning" />
              </div>
              <h3 className="font-semibold mb-1">Responsivo e Mobile</h3>
              <p className="text-sm text-muted-foreground">Layout otimizado para telas pequenas com truncamento seguro de textos longos.</p>
            </div>
            <div className="bg-card p-5 rounded-xl border">
              <div className="h-10 w-10 rounded-md bg-secondary/10 flex items-center justify-center mb-3">
                <Users className="h-5 w-5 text-secondary-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Admin e Equipe</h3>
              <p className="text-sm text-muted-foreground">Gestão de usuários e visão consolidada para administradores.</p>
            </div>
            <div className="bg-card p-5 rounded-xl border">
              <div className="h-10 w-10 rounded-md bg-emerald-100/10 flex items-center justify-center mb-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-1">Segurança</h3>
              <p className="text-sm text-muted-foreground">Autenticação segura e políticas de acesso para proteger seus dados.</p>
            </div>
            <div className="bg-card p-5 rounded-xl border">
              <div className="h-10 w-10 rounded-md bg-muted/10 flex items-center justify-center mb-3">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Resumo de período</h3>
              <p className="text-sm text-muted-foreground">Contagens por tipo de evento e horas totais quando aplicável.</p>
            </div>
          </div>
        </section>

        {/* FAQ simples */}
        <section id="faq" className="py-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-6">Perguntas frequentes</h2>
          <div className="space-y-3">
            <details className="bg-card rounded-xl border p-4">
              <summary className="cursor-pointer font-medium">Posso usar no celular?</summary>
              <p className="mt-2 text-sm text-muted-foreground">Sim, a interface é responsiva e otimizada para telas pequenas.</p>
            </details>
            <details className="bg-card rounded-xl border p-4">
              <summary className="cursor-pointer font-medium">Como exporto meu histórico?</summary>
              <p className="mt-2 text-sm text-muted-foreground">No Histórico, use os botões “Exportar CSV” e “Exportar PDF”.</p>
            </details>
            <details className="bg-card rounded-xl border p-4">
              <summary className="cursor-pointer font-medium">Os dados estão seguros?</summary>
              <p className="mt-2 text-sm text-muted-foreground">Usamos autenticação segura e políticas de acesso para proteger as informações.</p>
            </details>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-12 max-w-5xl mx-auto">
          <div className="rounded-2xl border bg-gradient-to-r from-primary/10 to-accent/10 p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">Pronto para simplificar o controle de ponto?</h3>
            <p className="text-muted-foreground mb-6">Comece agora e tenha relatórios claros, exportações fáceis e segurança.</p>
            <div className="flex justify-center gap-3 flex-col sm:flex-row">
              <Button onClick={() => navigate("/auth")} className="h-11 px-8 bg-gradient-primary">Criar Conta</Button>
              <Button onClick={() => navigate("/auth")} variant="outline" className="h-11 px-8">Fazer Login</Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-20 border-t">
        <div className="text-center text-muted-foreground">
          <p>© 2025 PontoFácil. Sistema de controle de ponto profissional.</p>
        </div>
      </footer>
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Voltar ao topo"
          className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-4 py-2 shadow-md hover:shadow-lg transition-shadow"
        >
          <ArrowUp className="h-4 w-4" />
          <span className="hidden sm:inline">Topo</span>
        </button>
      )}
    </div>
  );
};

export default Index;
