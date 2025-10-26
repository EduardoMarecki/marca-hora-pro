import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, UserCog, History, Users } from "lucide-react";
import { EditarPerfilDialog } from "./EditarPerfilDialog";
import { useUserRole } from "@/hooks/useUserRole";

type HeaderProps = {
  user: User | null;
  onLogout: () => void;
};

export const Header = ({ user, onLogout }: HeaderProps) => {
  const [editarPerfilOpen, setEditarPerfilOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole(user);

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between max-w-7xl">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-primary flex items-center justify-center cursor-pointer flex-shrink-0" onClick={() => navigate("/painel")}>
            <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold cursor-pointer truncate" onClick={() => navigate("/painel")}>PontoFácil</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">
              {user?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button 
            variant={location.pathname === "/painel" ? "default" : "ghost"} 
            onClick={() => navigate("/painel")} 
            size="sm"
            className="h-8 px-2 sm:px-3"
          >
            <Clock className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Painel</span>
          </Button>
          <Button 
            variant={location.pathname === "/historico" ? "default" : "ghost"} 
            onClick={() => navigate("/historico")} 
            size="sm"
            className="h-8 px-2 sm:px-3"
          >
            <History className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Histórico</span>
          </Button>
          {isAdmin && (
            <Button 
              variant={location.pathname === "/equipe" ? "default" : "ghost"} 
              onClick={() => navigate("/equipe")} 
              size="sm"
              className="h-8 px-2 sm:px-3"
            >
              <Users className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Equipe</span>
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditarPerfilOpen(true)} size="sm" className="h-8 px-2 sm:px-3">
            <UserCog className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Perfil</span>
          </Button>
          <Button variant="outline" onClick={onLogout} size="sm" className="h-8 px-2 sm:px-3">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
      <EditarPerfilDialog 
        open={editarPerfilOpen} 
        onOpenChange={setEditarPerfilOpen}
        user={user}
      />
    </header>
  );
};
