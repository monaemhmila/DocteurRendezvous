import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "./auth-context";

interface AdminContextType {
  isAdminUnlocked: boolean;
  unlockAdmin: (code: string) => boolean;
  lockAdmin: () => void;
  showPinModal: boolean;
  setShowPinModal: (show: boolean) => void;
  doctorPhones: string[];
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const { isAuthenticated, isSuperAdmin } = useAuth();

  const { data: tenant } = useQuery<any>({
    queryKey: ["currentTenant"],
    queryFn: () => api.get("/tenants/current"),
    enabled: isAuthenticated && !isSuperAdmin,
  });

  const secretPin = tenant?.settings?.adminPin || "1234";
  const doctorPhones = tenant?.settings?.doctorPhones || [];

  // Restore state from sessionStorage (so it doesn't persist forever)
  useEffect(() => {
    const saved = sessionStorage.getItem("adminUnlocked");
    if (saved === "true") {
      setIsAdminUnlocked(true);
    }
  }, []);

  // Listen for Ctrl+Alt+M (or similar) to trigger the PIN modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Alt + M
      if (e.ctrlKey && e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        if (isAdminUnlocked) {
          lockAdmin();
          toast.success("Mode Médecin verrouillé");
        } else {
          setShowPinModal(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdminUnlocked]);

  const unlockAdmin = (code: string) => {
    if (code === secretPin) {
      setIsAdminUnlocked(true);
      sessionStorage.setItem("adminUnlocked", "true");
      setShowPinModal(false);
      toast.success("Mode Médecin déverrouillé");
      return true;
    }
    toast.error("Code incorrect");
    return false;
  };

  const lockAdmin = () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem("adminUnlocked");
  };

  return (
    <AdminContext.Provider value={{ isAdminUnlocked, unlockAdmin, lockAdmin, showPinModal, setShowPinModal, doctorPhones }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
