"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { UserX, Search, RotateCcw } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { Badge } from "@/components/Badge";
import { formatDate, formatPhoneNumber } from "@/lib/utils";
import { formatPicCode, generateUserCode } from "@/lib/userCode";
import { SystemUser } from "@/types";
import { ConfirmDialog, ConfirmVariant } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import {
  useInactiveUsersQuery,
  useRestoreUserMutation,
  useSystemRolesQuery,
} from "@/hooks/useUserManagementQuery";

export const InactiveUsersTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);

  const { data: inactiveUsers = [], isLoading: isLoadingInactive } = useInactiveUsersQuery();
  const { data: roles = [] } = useSystemRolesQuery();
  const restoreUserMutation = useRestoreUserMutation();

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: ConfirmVariant;
    confirmText?: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "update",
    onConfirm: async () => {},
  });

  const handleTriggerRestore = (u: SystemUser) => {
    setConfirmDialog({
      isOpen: true,
      title: "Pulihkan Pengguna (Restore User)",
      description: `Apakah Anda yakin ingin memulihkan akun "${u.name}" (${u.email})? Status akun akan kembali aktif.`,
      variant: "update",
      confirmText: "Ya, Pulihkan Akun",
      onConfirm: async () => {
        try {
          await restoreUserMutation.mutateAsync(u.id);
          toast.success(`Akun pengguna "${u.name}" berhasil dipulihkan ke status aktif!`);
        } catch (err: any) {
          toast.error(err.message || "Gagal memulihkan pengguna");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const filteredInactiveUsers = useMemo(() => {
    return inactiveUsers.filter((u) => {
      const q = debouncedSearch.toLowerCase().trim();
      return (
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q))
      );
    });
  }, [inactiveUsers, debouncedSearch]);

  const inactiveUserColumns = useMemo<ColumnDef<SystemUser>[]>(
    () => [
      {
        accessorKey: "deleted_at",
        header: "Tanggal Keluar",
        cell: ({ row }) => (
          <span className="text-rose-700 font-medium whitespace-nowrap">
            {formatDate(row.original.deleted_at || row.original.updated_at)}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Nama Eks User",
        cell: ({ row }) => {
          const u = row.original;
          const index = row.index;
          return (
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0">
                {u.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <span>{u.name}</span>
                <span
                  className="block text-[11px] text-slate-500 font-mono font-medium tracking-tight"
                  title={`ID Database: ${u.id}`}
                >
                  {generateUserCode(u, roles, inactiveUsers)}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email / Phone",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="text-slate-600">
              <div>{u.email}</div>
              <div className="text-[11px] text-slate-400">
                {formatPhoneNumber(u.phone) || u.phone}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "role_code",
        header: "Role Sebelumnya",
        cell: ({ row }) => (
          <Badge variant="neutral">
            {row.original.role_name || row.original.role_code}
          </Badge>
        ),
      },
      {
        accessorKey: "delete_pic",
        header: "PIC Penghapus",
        cell: ({ row }) => (
          <span className="text-slate-600 font-mono">
            {formatPicCode(row.original.delete_pic)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi Pemulihan</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <button
              onClick={() => handleTriggerRestore(row.original)}
              title="Pulihkan Pengguna Ini"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Pulihkan</span>
            </button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [roles, inactiveUsers]
  );

  return (
    <div className="space-y-4 pt-2">
      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <UserX size={16} className="text-amber-600 shrink-0" />
          <span>
            Tab ini menampilkan staf atau pengguna yang telah dinonaktifkan. Data tetap tersimpan di database dan dapat dipulihkan kapan saja.
          </span>
        </div>
      </div>

      {/* Search Bar User Keluar with Debounce */}
      <div className="relative w-full">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari user keluar berdasarkan nama, email..."
          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-sky-500 focus:bg-white"
        />
      </div>

      {/* TanStack Table: User Keluar */}
      <DataTable
        columns={inactiveUserColumns}
        data={filteredInactiveUsers}
        isLoading={isLoadingInactive}
        emptyMessage="Belum ada riwayat pengguna keluar."
        pageSize={10}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        isLoading={restoreUserMutation.isPending}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
