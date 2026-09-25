"use client";

import React, { useState } from "react";
import { LayoutList, Sliders } from "lucide-react";
import {
  useMenuManagementStore,
  MenuManagementTab,
} from "@/store/useMenuManagementStore";
import { Tabs, TabItem } from "@/components/Tabs";
import { Menu } from "@/types";
import { useMenusQuery } from "@/hooks/useMenuQuery";
import { MenuListTab } from "./tabs/MenuListTab";
import { SidebarManagementTab } from "./tabs/SidebarManagementTab";

export const MenuManagementView: React.FC = () => {
  const { currentTab, setTab } = useMenuManagementStore();
  const { data: menus = [] } = useMenusQuery();

  const tabs: TabItem<MenuManagementTab>[] = [
    {
      id: "menus",
      label: "Daftar Menu",
      icon: <LayoutList size={16} />,
      badge: menus.length,
    },
    {
      id: "sidebar",
      label: "Sidebar Management",
      icon: <Sliders size={16} />,
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
            <span>Menu List</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Manajemen Menu & Sidebar
          </h1>
        </div>
      </div>

      {/* Tabs Bar & Content */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm">
        <Tabs tabs={tabs} activeTab={currentTab} onChange={setTab} />

        {currentTab === "menus" && <MenuListTab />}
        {currentTab === "sidebar" && <SidebarManagementTab />}
      </div>
    </div>
  );
};
