import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyTheme } from "@/lib/theme";

// Componente leve que aplica o tema do usuário autenticado (ou 'system' se não autenticado)
export const ThemeLoader = () => {
  useEffect(() => {
    let mounted = true;

    const applyFromProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          applyTheme('system');
          return;
        }
        const { data } = await supabase
          .from('profiles')
          .select('theme_preference')
          .eq('id', user.id)
          .maybeSingle();

        if (!mounted) return;
        const pref = (data as any)?.theme_preference === 'light' || (data as any)?.theme_preference === 'dark'
          ? (data as any).theme_preference
          : 'system';
        applyTheme(pref);
      } catch {
        applyTheme('system');
      }
    };

    applyFromProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      applyFromProfile();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
};