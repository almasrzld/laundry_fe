"use client";

import React, { useState } from "react";
import { Activity, ShieldAlert, History, Layers } from "lucide-react";
import { Tabs, TabItem } from "@/components/Tabs";
import { ActivityLogTabContent } from "./tabs/ActivityLogTabContent";
import { useActivityLogsQuery } from "@/hooks/useActivityLogQuery";

export type ActivityLogTabType = "main" | "secondary";

export const ActivityLogView: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ActivityLogTabType>("main");

  // Query counts for badges
  const { data: mainData } = useActivityLogsQuery({
    type: "main",
    page: 1,
    limit: 1,
  });

  const { data: secondaryData } = useActivityLogsQuery({
    type: "secondary",
    page: 1,
    limit: 1,
  });

  const tabs: TabItem<ActivityLogTabType>[] = [
    {
      id: "main",
      label: "Main Log",
      icon: <Activity size={16} />,
      badge: mainData?.total !== undefined ? mainData.total : undefined,
    },
    {
      id: "secondary",
      label: "Secondary Log",
      icon: <Layers size={16} />,
      badge: secondaryData?.total !== undefined ? secondaryData.total : undefined,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
            <span>System Management</span>
            <span>/</span>
            <span>Audit & Monitoring</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1 flex items-center gap-2.5">
            <History className="text-sky-600" size={26} />
            <span>Log Activity</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Rekam jejak seluruh aktivitas pengguna (Web & Mobile) secara transparan dan terstruktur.
          </p>
        </div>
      </div>

      {/* Tabs & Content Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-5 shadow-sm">
        <Tabs tabs={tabs} activeTab={currentTab} onChange={setCurrentTab} />

        {currentTab === "main" && <ActivityLogTabContent type="main" />}
        {currentTab === "secondary" && <ActivityLogTabContent type="secondary" />}
      </div>
    </div>
  );
};
