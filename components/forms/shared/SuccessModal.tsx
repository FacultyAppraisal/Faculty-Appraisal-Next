"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
}

export default function SuccessModal({
    isOpen,
    onClose,
    title = "Success!",
    message,
}: SuccessModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
            <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border-2 border-indigo-100 transform animate-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center text-center gap-5">
                    <div className="h-20 w-20 rounded-full bg-indigo-50 flex items-center justify-center shadow-inner">
                        <CheckCircle2 className="h-12 w-12 text-indigo-600" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-indigo-900 uppercase tracking-widest">
                            {title}
                        </h3>
                        <p className="text-indigo-800 text-lg font-bold leading-relaxed opacity-90">
                            {message}
                        </p>
                    </div>
                    <Button 
                        onClick={onClose} 
                        className="mt-4 w-full h-12 text-lg font-black uppercase tracking-widest bg-indigo-700 hover:bg-indigo-800 text-white shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                        Okay
                    </Button>
                </div>
            </div>
        </div>
    );
}
