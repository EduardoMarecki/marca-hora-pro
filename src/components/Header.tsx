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
      <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center cursor-pointer" onClick={() => navigate("/painel")}>
            <Clock className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold cursor-pointer" onClick={() => navigate("/painel")}>PontoFácil</h1>
            <p className="text-sm text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={location.pathname === "/painel" ? "default" : "ghost"} 
            onClick={() => navigate("/painel")} 
            size="sm"
          >
            <Clock className="h-4 w-4 mr-2" />
            Painel
          </Button>
          <Button 
            variant={location.pathname === "/historico" ? "default" : "ghost"} 
            onClick={() => navigate("/historico")} 
            size="sm"
          >
            <History className="h-4 w-4 mr-2" />
            Histórico
          </Button>
          {isAdmin && (
            <Button 
              variant={location.pathname === "/equipe" ? "default" : "ghost"} 
              onClick={() => navigate("/equipe")} 
              size="sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Equipe
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditarPerfilOpen(true)} size="sm">
            <UserCog className="h-4 w-4 mr-2" />
            Perfil
          </Button>
          <Button variant="outline" onClick={onLogout} size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
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
