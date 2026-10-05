import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface BackendAppointment {
  _id?: string;
  id?: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  treatment: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  source: "manual" | "ai" | "patient_app";
  createdByAi?: boolean;
  price?: number | undefined;
  value?: number | undefined;
  notes?: string;
  createdAt: string;
}

export function useAppointments(dateFrom: string, dateTo: string) {
  return useQuery<BackendAppointment[]>({
    queryKey: ["appointments", dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.get(`/appointments?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=100`);
      return Array.isArray(res) ? res : (res.data || []);
    },
  });
}

export function useCreateAppointment(onSuccessCb?: () => void) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => api.post("/appointments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Rendez-vous ajouté avec succès au planning.");
      if (onSuccessCb) onSuccessCb();
    },
    onError: (err: any) => {
      if (err.message?.includes("409") || err.message?.includes("Double_Booking")) {
        toast.error("Créneau non disponible (chevauchement avec un autre rendez-vous).");
      } else {
        toast.error(err.message || "Erreur lors de la création du rendez-vous.");
      }
    },
  });
}

export function useUpdateAppointmentStatus(onSuccessCb?: () => void) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["recoveries"] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success(`Statut mis à jour : ${variables.status}`);
      if (onSuccessCb) onSuccessCb();
    },
    onError: () => toast.error("Erreur lors de la mise à jour du statut."),
  });
}

export function useDeleteAppointment(onSuccessCb?: () => void) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.delete(`/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Rendez-vous supprimé.");
      if (onSuccessCb) onSuccessCb();
    },
    onError: () => toast.error("Erreur lors de la suppression."),
  });
}

export function useUpdateAppointment(onSuccessCb?: () => void) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Rendez-vous mis à jour.");
      if (onSuccessCb) onSuccessCb();
    },
    onError: () => toast.error("Erreur lors de la mise à jour du rendez-vous."),
  });
}

