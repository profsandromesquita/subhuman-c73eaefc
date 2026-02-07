import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formats a date string into a compact relative time (e.g., "2h", "3d", "1sem")
 */
export function formatTime(dateString: string | null): string {
  if (!dateString) return "";
  const distance = formatDistanceToNow(new Date(dateString), { locale: ptBR });
  return distance
    .replace("cerca de ", "")
    .replace(" horas", "h")
    .replace(" hora", "h")
    .replace(" minutos", "min")
    .replace(" minuto", "min")
    .replace(" dias", "d")
    .replace(" dia", "d")
    .replace(" semanas", "sem")
    .replace(" semana", "sem")
    .replace(" meses", "m")
    .replace(" mês", "m");
}

/**
 * Estimates reading time based on word count (~200 wpm)
 */
export function estimateReadTime(content: string | null): string {
  if (!content) return "1min";
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes}min`;
}
