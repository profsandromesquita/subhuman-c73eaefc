import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Session = Tables<"event_sessions">;

export const typeLabels: Record<string, string> = {
  workshop: "Workshop",
  palestra: "Palestra",
  live: "Live",
  aula_ao_vivo: "Aula ao Vivo",
  mentoria: "Mentoria",
  mentoria_grupo: "Mentoria em Grupo",
  mentoria_individual: "Mentoria Individual",
  curso: "Curso",
};

export const modalityLabels: Record<string, string> = {
  online: "Online",
  online_gravado: "Online Gravado",
  online_ao_vivo: "Online ao Vivo",
  presencial: "Presencial",
  hibrido: "Híbrido",
};

export function formatSessionDates(sessions: Session[]): string {
  if (!sessions.length) return "Sem datas definidas";

  const dates = sessions.map((s) => {
    const start = new Date(s.starts_at);
    return format(start, "d 'de' MMM", { locale: ptBR });
  });

  const firstSession = new Date(sessions[0].starts_at);
  const lastSession = new Date(sessions[sessions.length - 1].ends_at);
  const timeRange = `${format(firstSession, "HH'h'mm")}–${format(lastSession, "HH'h'mm")}`;

  if (dates.length === 1) return `${dates[0]}, ${timeRange}`;
  return `${dates.join(" e ")}, ${timeRange}`;
}
