import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, History, Users } from "lucide-react";

type NavLink = {
  label: string;
  path: string;
  icon?: React.ReactNode;
};

type HeaderProps = {
  title?: string;
  userEmail?: string | null;
  links?: NavLink[];
  showAdminLink?: boolean;
  onLogout?: () => void;
};

export const Header = ({ title = "App", userEmail, links, showAdminLink = false, onLogout }: HeaderProps) => {
  const [/* deprecated */ _editarPerfilOpen, setEditarPerfilOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = showAdminLink;

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const navLinks: NavLink[] = links && links.length > 0 ? links : [
    { label: "Home", path: "/", icon: <Clock className="h-4 w-4 sm:mr-2" /> },
    { label: "About", path: "/about", icon: <History className="h-4 w-4 sm:mr-2" /> },
  ];

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between max-w-7xl">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-primary flex items-center justify-center cursor-pointer flex-shrink-0" onClick={() => navigate("/")}>
            <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold cursor-pointer truncate" onClick={() => navigate("/")}>{title}</h1>
            {userEmail && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">
                {userEmail}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => (
            <Button 
              key={link.path}
              variant={location.pathname === link.path ? "default" : "ghost"}
              onClick={() => navigate(link.path)}
              size="sm"
              className="h-8 px-2 sm:px-3"
            >
              {link.icon}
              <span className="hidden sm:inline">{link.label}</span>
            </Button>
          ))}
          {isAdmin && (
            <Button 
              variant={location.pathname === "/admin" ? "default" : "ghost"} 
              onClick={() => navigate("/admin")} 
              size="sm"
              className="h-8 px-2 sm:px-3"
            >
              <Users className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          )}
          {onLogout && (
            <Button variant="outline" onClick={handleLogoutClick} size="sm" className="h-8 px-2 sm:px-3">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};