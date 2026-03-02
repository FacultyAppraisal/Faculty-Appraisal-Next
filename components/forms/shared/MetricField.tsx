import { cn } from "@/lib/utils";
import React from "react";

export interface MetricData {
    value: number;
    proof: string;
    verified?: number | string;
}

interface MetricFieldProps {
    label: string;
    hint?: string;
    name: string;
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    proofValue: string;
    onProofChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    verifiedScore?: string | number;
    placeholder?: string;
    proofPlaceholder?: string;
    disabled?: boolean;
    isVerificationMode?: boolean;
}

export default function MetricField({
    label,
    hint,
    name,
    value,
    onChange,
    proofValue,
    onProofChange,
    verifiedScore,
    placeholder = "Enter count",
    proofPlaceholder = "Proof Document Link (Google Drive)",
    disabled = false,
    isVerificationMode = false,
}: MetricFieldProps) {
    return (
        <div className="py-4 border-b border-border last:border-0 hover:bg-slate-50/50 transition-colors duration-200 px-2 rounded-xl">
            {/* Column headers (shown once per row for clarity) */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Label and Hint */}
                <div className="flex-1 min-w-0">
                    <label className="text-base font-extrabold text-slate-900 block uppercase tracking-tight">
                        {label}
                    </label>
                    {hint && <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5 opacity-80">{hint}</p>}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:w-3/4 xl:w-2/3">
                    {/* Numeric Value Input (Claimed) */}
                    <div className="w-full sm:w-28 shrink-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">Claimed</p>
                        <input
                            type="number"
                            name={name}
                            min={0}
                            disabled={disabled || isVerificationMode}
                            onKeyDown={(e) => e.key === "-" && e.preventDefault()}
                            onWheel={(e) => e.currentTarget.blur()}
                            value={value === 0 ? "" : value}
                            onChange={onChange}
                            placeholder={placeholder}
                            className={cn(
                                "w-full rounded-xl border-2 px-3 py-2 text-base text-right font-black transition-all duration-200",
                                isVerificationMode
                                    ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                    : "bg-blue-50 border-blue-100/50 text-indigo-900 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600"
                            )}
                        />
                    </div>

                    {/* Proof Document Link Input */}
                    <div className="flex-1 w-full min-w-0">
                        <div className="flex items-center justify-between mb-1.5 px-0.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Proof Document</p>
                            {proofValue && (
                                <a
                                    href={proofValue}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
                                >
                                    Open Link <ExternalLink size={10} />
                                </a>
                            )}
                        </div>
                        <input
                            type="url"
                            value={proofValue}
                            onChange={onProofChange}
                            disabled={disabled || isVerificationMode}
                            placeholder={proofPlaceholder}
                            className={cn(
                                "w-full rounded-xl border-2 px-3 py-2 text-base font-bold transition-all duration-200 truncate",
                                isVerificationMode
                                    ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                                    : "bg-white border-slate-200 text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600"
                            )}
                        />
                    </div>

                    {/* Verified Score */}
                    {(isVerificationMode || (verifiedScore !== undefined && verifiedScore !== 0)) && (
                        <div className="w-full sm:w-32 shrink-0 animate-in fade-in slide-in-from-right-2 duration-300">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 px-0.5 flex items-center gap-1">
                                <CheckCircle2 size={10} /> Verified Marks
                            </p>
                            <input
                                type="number"
                                min={0}
                                disabled={disabled}
                                readOnly={!isVerificationMode}
                                onWheel={(e) => e.currentTarget.blur()}
                                value={verifiedScore === 0 ? "" : verifiedScore}
                                onChange={onChange} // In verification mode, the same onChange can handle it or we use a custom one
                                placeholder="Marks"
                                className={cn(
                                    "w-full rounded-xl border-2 px-3 py-2 text-base text-center font-black transition-all duration-200",
                                    isVerificationMode
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-600/10 focus:border-emerald-600"
                                        : "bg-emerald-50/50 border-emerald-100 text-emerald-600 cursor-not-allowed"
                                )}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { CheckCircle2, ExternalLink } from "lucide-react";
