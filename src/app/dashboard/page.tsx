"use client";

import { useState } from "react";
import { CalendarView } from "@/components/CalendarView";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"GLOBAL" | "MY">("GLOBAL");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1.5 rounded-lg w-max shadow-inner">
        <button
          onClick={() => setActiveTab("GLOBAL")}
          className={`px-6 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
            activeTab === "GLOBAL" 
              ? "bg-white text-kai-blue shadow-sm" 
              : "text-slate-500 hover:text-kai-blue"
          }`}
        >
          Jadwal Keseluruhan
        </button>
        <button
          onClick={() => setActiveTab("MY")}
          className={`px-6 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
            activeTab === "MY" 
              ? "bg-white text-kai-blue shadow-sm" 
              : "text-slate-500 hover:text-kai-blue"
          }`}
        >
          Jadwal Saya
        </button>
      </div>

      {/* Calendar View Component */}
      <CalendarView currentView={activeTab} />
    </div>
  );
}
