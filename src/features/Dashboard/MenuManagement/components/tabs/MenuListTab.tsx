"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Save,
  Loader2,
  GripVertical,
  CornerDownRight,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { Button } from "@/components/ui/button";
import { Menu } from "@/types";
import { cn } from "@/lib/utils";
import {
  useMenusQuery,
  useReorderMenuMutation,
} from "@/hooks/useMenuQuery";

export const MenuListTab: React.FC = () => {
  const { data: menus = [], isLoading: isMenusLoading } = useMenusQuery();
  const reorderMenuMutation = useReorderMenuMutation();

  // Hierarchy Tree State
  const [orderedMenus, setOrderedMenus] = useState<Menu[]>([]);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Drag & Drop State
  const [draggedRootId, setDraggedRootId] = useState<string | number | null>(null);
  const [dragOverRootId, setDragOverRootId] = useState<string | number | null>(null);
  const [draggedSub, setDraggedSub] = useState<{ parentId: string | number; subId: string | number } | null>(null);
  const [dragOverSubId, setDragOverSubId] = useState<string | number | null>(null);

  useEffect(() => {
    if (menus.length > 0) {
      setOrderedMenus(menus);
      setIsDirty(false);
      setExpandedParents({});
    }
  }, [menus]);

  const toggleExpand = (parentId: string | number) => {
    setExpandedParents((prev) => ({
      ...prev,
      [String(parentId)]: !prev[String(parentId)],
    }));
  };

  // Move Root Menu Up/Down
  const moveRootOrder = (menuId: string | number, direction: "up" | "down") => {
    const rootItems = orderedMenus.filter((m) => !m.parent_id);
    const currIndex = rootItems.findIndex((m) => String(m.id) === String(menuId));
    if (currIndex === -1) return;
    const targetIndex = direction === "up" ? currIndex - 1 : currIndex + 1;
    if (targetIndex < 0 || targetIndex >= rootItems.length) return;

    const newRootItems = [...rootItems];
    const [moved] = newRootItems.splice(currIndex, 1);
    newRootItems.splice(targetIndex, 0, moved);

    newRootItems.forEach((r, idx) => {
      r.order_index = idx + 1;
    });

    const result: Menu[] = [];
    newRootItems.forEach((root) => {
      result.push(root);
      const children = orderedMenus.filter((m) => String(m.parent_id) === String(root.id));
      result.push(...children);
    });

    setOrderedMenus(result);
    setIsDirty(true);
  };

  // Drop Root Menu via Drag and Drop
  const handleDropRoot = (sourceId: string | number, targetId: string | number) => {
    const rootItems = orderedMenus.filter((m) => !m.parent_id);
    const sourceIndex = rootItems.findIndex((m) => String(m.id) === String(sourceId));
    const targetIndex = rootItems.findIndex((m) => String(m.id) === String(targetId));
    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

    const newRootItems = [...rootItems];
    const [moved] = newRootItems.splice(sourceIndex, 1);
    newRootItems.splice(targetIndex, 0, moved);

    newRootItems.forEach((r, idx) => {
      r.order_index = idx + 1;
    });

    const result: Menu[] = [];
    newRootItems.forEach((root) => {
      result.push(root);
      const children = orderedMenus.filter((m) => String(m.parent_id) === String(root.id));
      result.push(...children);
    });

    setOrderedMenus(result);
    setIsDirty(true);
  };

  // Move Submenu Up/Down
  const moveSubOrder = (parentId: string | number, subId: string | number, direction: "up" | "down") => {
    const subItems = orderedMenus.filter((m) => String(m.parent_id) === String(parentId));
    const currIndex = subItems.findIndex((m) => String(m.id) === String(subId));
    if (currIndex === -1) return;
    const targetIndex = direction === "up" ? currIndex - 1 : currIndex + 1;
    if (targetIndex < 0 || targetIndex >= subItems.length) return;

    const newSubItems = [...subItems];
    const [moved] = newSubItems.splice(currIndex, 1);
    newSubItems.splice(targetIndex, 0, moved);

    newSubItems.forEach((s, idx) => {
      s.order_index = idx + 1;
    });

    const result: Menu[] = [];
    const rootItems = orderedMenus.filter((m) => !m.parent_id);
    rootItems.forEach((root) => {
      result.push(root);
      if (String(root.id) === String(parentId)) {
        result.push(...newSubItems);
      } else {
        const otherChildren = orderedMenus.filter((m) => String(m.parent_id) === String(root.id));
        result.push(...otherChildren);
      }
    });

    setOrderedMenus(result);
    setIsDirty(true);
  };

  // Drop Submenu via Drag and Drop
  const handleDropSub = (parentId: string | number, sourceSubId: string | number, targetSubId: string | number) => {
    const subItems = orderedMenus.filter((m) => String(m.parent_id) === String(parentId));
    const sourceIndex = subItems.findIndex((m) => String(m.id) === String(sourceSubId));
    const targetIndex = subItems.findIndex((m) => String(m.id) === String(targetSubId));
    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

    const newSubItems = [...subItems];
    const [moved] = newSubItems.splice(sourceIndex, 1);
    newSubItems.splice(targetIndex, 0, moved);

    newSubItems.forEach((s, idx) => {
      s.order_index = idx + 1;
    });

    const result: Menu[] = [];
    const rootItems = orderedMenus.filter((m) => !m.parent_id);
    rootItems.forEach((root) => {
      result.push(root);
      if (String(root.id) === String(parentId)) {
        result.push(...newSubItems);
      } else {
        const otherChildren = orderedMenus.filter((m) => String(m.parent_id) === String(root.id));
        result.push(...otherChildren);
      }
    });

    setOrderedMenus(result);
    setIsDirty(true);
  };

  // Save Order to Backend
  const handleSaveOrder = async () => {
    try {
      const itemsToSave = orderedMenus.map((m, idx) => ({
        id: String(m.id),
        order_index: idx + 1,
      }));

      await reorderMenuMutation.mutateAsync(itemsToSave);
      setIsDirty(false);
      toast.success("Urutan menu berhasil disimpan!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan urutan menu");
    }
  };

  // Reset Order
  const handleResetOrder = () => {
    setOrderedMenus(menus);
    setIsDirty(false);
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Interactive Hierarchy Tree Layout */}
      {isMenusLoading ? (
        <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 shadow-2xs">
          <Loader2 size={20} className="animate-spin text-sky-600 mx-auto mb-2" />
          <span className="text-xs font-medium">Memuat struktur menu...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {orderedMenus
            .filter((m) => !m.parent_id)
            .map((root, rootIdx, rootArr) => {
              const children = orderedMenus.filter(
                (c) => String(c.parent_id) === String(root.id)
              );
              const hasChildren = children.length > 0;
              const isExpanded = !!expandedParents[String(root.id)];
              const isFirst = rootIdx === 0;
              const isLast = rootIdx === rootArr.length - 1;
              const isRootDragging = draggedRootId === root.id;
              const isRootDragOver = dragOverRootId === root.id;

              return (
                <div
                  key={root.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", String(root.id));
                    e.dataTransfer.effectAllowed = "move";
                    setDraggedRootId(root.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (draggedRootId && draggedRootId !== root.id) {
                      setDragOverRootId(root.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverRootId === root.id) {
                      setDragOverRootId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedRootId && draggedRootId !== root.id) {
                      handleDropRoot(draggedRootId, root.id);
                    }
                    setDraggedRootId(null);
                    setDragOverRootId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedRootId(null);
                    setDragOverRootId(null);
                  }}
                  className={cn(
                    "rounded-2xl border shadow-xs overflow-hidden transition-all duration-150",
                    isRootDragging && "opacity-40 border-dashed border-sky-400 bg-sky-50/30 scale-[0.99]",
                    isRootDragOver && "ring-2 ring-sky-500 bg-sky-50/50 border-sky-400 shadow-md",
                    !isRootDragging && !isRootDragOver && "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  {/* Root Item Row */}
                  <div className="p-3.5 flex items-center justify-between gap-3 bg-white">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <GripVertical
                        size={16}
                        className="text-slate-400 cursor-grab active:cursor-grabbing shrink-0 hover:text-slate-600"
                      />
                      <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                        <DynamicIcon name={root.icon} size={16} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">{root.title}</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-600">
                          Order: {rootIdx + 1}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => moveRootOrder(root.id, "up")}
                          className="p-1 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Pindah ke Atas"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => moveRootOrder(root.id, "down")}
                          className="p-1 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Pindah ke Bawah"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>

                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(root.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                            isExpanded
                              ? "bg-teal-600 text-white shadow-xs"
                              : "bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700"
                          )}
                        >
                          <span>{children.length} Sub</span>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic px-2">No Sub</span>
                      )}
                    </div>
                  </div>

                  {/* Nested Submenus List */}
                  {hasChildren && isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/70 p-3.5 space-y-2.5">
                      {children.map((sub, subIdx) => {
                        const isFirstSub = subIdx === 0;
                        const isLastSub = subIdx === children.length - 1;
                        const isSubDragging = draggedSub?.subId === sub.id;
                        const isSubDragOver = dragOverSubId === sub.id;

                        return (
                          <div
                            key={sub.id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.setData("text/plain", String(sub.id));
                              e.dataTransfer.effectAllowed = "move";
                              setDraggedSub({ parentId: root.id, subId: sub.id });
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = "move";
                              if (draggedSub && draggedSub.parentId === root.id && draggedSub.subId !== sub.id) {
                                setDragOverSubId(sub.id);
                              }
                            }}
                            onDragLeave={(e) => {
                              e.stopPropagation();
                              if (dragOverSubId === sub.id) {
                                setDragOverSubId(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (draggedSub && draggedSub.parentId === root.id && draggedSub.subId !== sub.id) {
                                handleDropSub(root.id, draggedSub.subId, sub.id);
                              }
                              setDraggedSub(null);
                              setDragOverSubId(null);
                            }}
                            onDragEnd={(e) => {
                              e.stopPropagation();
                              setDraggedSub(null);
                              setDragOverSubId(null);
                            }}
                            className={cn(
                              "border rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs transition-all ml-4 sm:ml-6 duration-150",
                              isSubDragging && "opacity-40 border-dashed border-sky-400 bg-sky-50/40",
                              isSubDragOver && "ring-2 ring-sky-500 bg-sky-50 border-sky-400 shadow-sm",
                              !isSubDragging && !isSubDragOver && "bg-white border-slate-200 hover:border-sky-300"
                            )}
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <CornerDownRight size={14} className="text-sky-600 shrink-0" />
                              <GripVertical size={14} className="text-slate-300 cursor-grab active:cursor-grabbing shrink-0 hover:text-slate-500" />
                              {sub.icon && (
                                <div className="w-6 h-6 rounded-lg bg-sky-50 border border-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                                  <DynamicIcon name={sub.icon} size={13} />
                                </div>
                              )}
                              <span className="font-bold text-xs text-slate-800">{sub.title}</span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-600">
                                Order: {subIdx + 1}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={isFirstSub}
                                onClick={() => moveSubOrder(root.id, sub.id, "up")}
                                className="p-1 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title="Pindah ke Atas"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={isLastSub}
                                onClick={() => moveSubOrder(root.id, sub.id, "down")}
                                className="p-1 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title="Pindah ke Bawah"
                              >
                                <ArrowDown size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            type="button"
            onClick={handleSaveOrder}
            disabled={!isDirty || reorderMenuMutation.isPending}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {reorderMenuMutation.isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Simpan Urutan</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={handleResetOrder}
            disabled={!isDirty || reorderMenuMutation.isPending}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <X size={15} />
            <span>Reset</span>
          </Button>
        </div>

        <div>
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              <AlertTriangle size={14} className="animate-pulse" />
              <span>Ada perubahan urutan yang belum disimpan</span>
            </span>
          ) : (
            <span className="text-xs text-slate-400 font-medium">
              Semua urutan menu telah sinkron dengan server
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
