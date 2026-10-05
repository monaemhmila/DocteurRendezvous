import React, { useState } from "react";
import { useAdmin } from "@/contexts/admin-context";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const AdminPinModal = () => {
  const { showPinModal, setShowPinModal, unlockAdmin } = useAdmin();
  const [pin, setPin] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    unlockAdmin(pin);
    setPin("");
  };

  return (
    <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
      <DialogContent className="sm:max-w-[300px] p-6 hide-close-button border-none bg-background shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-4">
          <input
            autoFocus
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full text-center tracking-[1em] font-mono text-2xl p-2 bg-transparent border-b-2 border-primary/20 focus:border-primary outline-none transition-colors"
            placeholder="****"
          />
        </form>
      </DialogContent>
    </Dialog>
  );
};
