"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface QuickLink {
  href?: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
}

interface DashboardProps {
  userName?: string;
  logoSrc?: string;
  quickLinks: QuickLink[];
  showWelcomeInfo?: boolean;
  className?: string;
}

export default function Dashboard({
  userName = "Faculty",
  logoSrc = "/image.png",
  quickLinks,
  showWelcomeInfo = true,
  className = "",
}: DashboardProps) {
  return (
    <div className={cn("flex-1 p-6 md:p-10 bg-background min-h-screen", className)}>
      <div className="max-w-6xl mx-auto">
        {/* Welcome Section */}
        <div className="bg-card rounded-2xl shadow-lg p-6 md:p-10 mb-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
                Welcome back,
              </h1>
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">{userName}</h2>
              <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mt-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-base">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-indigo-500 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
              <div className="relative w-24 h-24 md:w-32 md:h-32 bg-white p-2 rounded-lg shadow-xl group-hover:scale-105 transition duration-300">
                <Image src={logoSrc} alt="Logo" fill className="object-contain rounded-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Section */}
        <div className="mt-8">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickLinks.map((link, i) => {
              const cardClass = `group bg-white/90 dark:bg-slate-900/80 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-primary/10 hover:border-primary/30 animate-fade-in-up${link.disabled ? ' opacity-60 cursor-not-allowed' : ''}`;
              const inner = (
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors group-hover:rotate-6 transform duration-300">
                    {link.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {link.loading ? 'Generating PDF…' : link.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                </div>
              );
              return link.onClick ? (
                <button
                  key={i}
                  onClick={link.disabled ? undefined : link.onClick}
                  disabled={link.disabled}
                  className={`w-full text-left ${cardClass}`}
                  style={{ animationDelay: `${100 + i * 100}ms` }}
                >
                  {inner}
                </button>
              ) : (
                <a
                  key={link.href ?? i}
                  href={link.href}
                  className={cardClass}
                  style={{ animationDelay: `${100 + i * 100}ms` }}
                >
                  {inner}
                </a>
              );
            })}
          </div>
        </div>

        {/* Welcome Info Section (optional) */}
        {showWelcomeInfo && (
          <div className="mt-10 animate-slide-up">
            <div className="bg-card rounded-xl shadow-lg overflow-hidden">
              <div className="relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-indigo-500 to-primary"></div>
                <div className="p-8 pt-10">
                  <div className="text-center max-w-4xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
                      Welcome to the Faculty Performance Evaluation System
                    </h2>
                    <div className="space-y-4">
                      <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                        This platform is designed to streamline and enhance the process of faculty performance evaluation, making it easier for you to showcase your academic achievements and professional growth.
                      </p>
                      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div className="p-4 rounded-lg bg-primary/10">
                          <h3 className="text-lg font-semibold text-primary mb-2">Track Progress</h3>
                          <p className="text-muted-foreground">Monitor your academic and research activities throughout the year</p>
                        </div>
                        <div className="p-4 rounded-lg bg-indigo-100 dark:bg-indigo-900/20">
                          <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-2">Document Achievements</h3>
                          <p className="text-muted-foreground">Record and showcase your professional accomplishments</p>
                        </div>
                        <div className="p-4 rounded-lg bg-primary/10">
                          <h3 className="text-lg font-semibold text-primary mb-2">Grow Together</h3>
                          <p className="text-muted-foreground">Contribute to the institution's academic excellence</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; opacity: 0; }
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; opacity: 0; }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
