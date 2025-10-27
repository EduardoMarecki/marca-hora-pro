import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Painel from "./pages/Painel";
import Historico from "./pages/Historico";
import Equipe from "./pages/Equipe";
import NotFound from "./pages/NotFound";
import SupportButton from "@/components/SupportButton";
import { ThemeLoader } from "@/components/ThemeLoader";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeLoader />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/painel" element={<Painel />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/equipe" element={<Equipe />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* Botão flutuante de suporte via WhatsApp, visível em todas as páginas */}
        <SupportButton />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
