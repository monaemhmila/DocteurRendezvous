import { useEffect } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useAppState } from "@/hooks/use-app-state";
import { useQueryClient } from "@tanstack/react-query";

export function NotificationsListener() {
  const { addNotification } = useAppState();
  const queryClient = useQueryClient();

  useEffect(() => {
    const playBeep = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2); // 200ms beep
      } catch (err) {
        console.error("Audio playback failed", err);
      }
    };

    const sseUrl = "http://localhost:5000/api/v1/notifications/stream";
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      // Normal message
    };

    eventSource.addEventListener("new_message", (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (data.tenantId) {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          if (data.conversationId) {
            queryClient.invalidateQueries({ queryKey: ["messages", data.conversationId] });
          }
        }
      } catch (e) {
        console.error("Failed to parse SSE new_message data", e);
      }
    });

    eventSource.addEventListener("human_escalation", (event: any) => {
      try {
        const data = JSON.parse(event.data);
        
        // Play the alert sound
        playBeep();

        const title = `Intervention Requise : ${data.patientName}`;
        const detail = data.reason;
        const link = `/conversations?conversationId=${data.conversationId}`;
        
        // Add to global state for the bell dropdown
        addNotification({
          title,
          detail,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          link
        });

        // Show the toast notification
        toast.error(
          <div className="flex flex-col gap-2 w-full">
            <span className="font-semibold text-base">🔴 Intervention Requise</span>
            <span>Le patient <b>{data.patientName}</b> nécessite une assistance humaine.</span>
            <span className="text-sm text-gray-500">Raison : {data.reason}</span>
            <Link 
              to={link}
              className="mt-2 text-sm bg-red-100 text-red-700 py-1.5 px-3 rounded-md text-center font-medium hover:bg-red-200 transition-colors"
              onClick={() => toast.dismiss()}
            >
              Voir la conversation
            </Link>
          </div>,
          { duration: 15000 } // Keep it visible for 15s
        );
      } catch (e) {
        console.error("Failed to parse SSE data", e);
      }
    });

    eventSource.onerror = (err) => {
      console.error("SSE connection error", err);
    };

    return () => {
      eventSource.close();
    };
  }, [addNotification]);

  return null;
}
