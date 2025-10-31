import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook para gerenciar o logout de forma robusta
 * Lida com erros de conexão e garante que o usuário seja redirecionado
 */
export const useLogout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Primeiro, limpa o localStorage para garantir que a sessão seja removida localmente
      localStorage.removeItem('sb-rxbnmitkcbgpkgdwlvyk-auth-token');
      
      // Tenta fazer o logout no Supabase
      await supabase.auth.signOut();
      
      // Redireciona para a página de login
      navigate("/auth");
      
      // Mostra mensagem de sucesso
      toast.success("Logout realizado com sucesso!");
    } catch (e: any) {
      console.warn("Erro durante logout:", e);
      
      // Mesmo com erro, limpa a sessão local e redireciona
      localStorage.removeItem('sb-rxbnmitkcbgpkgdwlvyk-auth-token');
      navigate("/auth");
      
      // Não mostra erro para o usuário, pois o logout foi efetivamente realizado
      toast.success("Logout realizado com sucesso!");
    }
  };

  return { handleLogout };
};