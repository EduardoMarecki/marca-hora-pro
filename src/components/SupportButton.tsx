import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LifeBuoy } from "lucide-react";

type SupportButtonProps = {
  /** Número de telefone no formato brasileiro (DDD + número), sem símbolos. Ex.: 4199988414 */
  phone?: string;
  /** Mensagem padrão a ser enviada ao abrir o WhatsApp */
  message?: string;
};

export const SupportButton = ({
  phone = "41999884144",
  message = "Preciso de suporte para o sistema",
}: SupportButtonProps) => {
  // Sanitiza o número e adiciona código do país (Brasil = 55)
  const onlyDigits = phone.replace(/\D/g, "");
  const international = onlyDigits.startsWith("55") ? onlyDigits : `55${onlyDigits}`;
  const waUrl = `https://wa.me/${international}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Tooltip>
        <TooltipTrigger asChild>
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
             aria-label="Suporte no WhatsApp" title="Suporte no WhatsApp">
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg bg-green-500 hover:bg-green-600">
              <LifeBuoy className="h-6 w-6 text-white" />
              <span className="sr-only">Abrir conversa de suporte no WhatsApp</span>
            </Button>
          </a>
        </TooltipTrigger>
        <TooltipContent side="left">Falar com suporte</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default SupportButton;