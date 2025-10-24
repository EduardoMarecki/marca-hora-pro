import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, UserCog } from "lucide-react";
import { EditarPerfilDialog } from "./EditarPerfilDialog";

type HeaderProps = {
  user: User | null;
  onLogout: () => void;
};

export const Header = ({ user, onLogout }: HeaderProps) => {
  const [editarPerfilOpen, setEditarPerfilOpen] = useState(false);
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-6xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Clock className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">PontoFácil</h1>
            <p className="text-sm text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
