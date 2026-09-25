"use client";

import React, { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Save,
  Loader2,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { Badge } from "@/components/Badge";
import {
  cn,
  formatRupiah,
  formatDate,
  formatPhoneNumber,
  stripCountryCode,
} from "@/lib/utils";
import { generateUserCode } from "@/lib/userCode";
import { SystemUser } from "@/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, ConfirmVariant } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { createUserFormSchema, UserFormSchema } from "@/schemas/user.schema";
import {
  useActiveUsersQuery,
  useSystemRolesQuery,
  useSaveUserMutation,
  useDeleteUserMutation,
} from "@/hooks/useUserManagementQuery";

export const ActiveUsersTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [roleFilter, setRoleFilter] = useState("all");
  const [showUserPassword, setShowUserPassword] = useState(false);

  const { data: activeUsers = [], isLoading: isLoadingActive } =
    useActiveUsersQuery();
  const { data: roles = [] } = useSystemRolesQuery();

  const saveUserMutation = useSaveUserMutation();
  const deleteUserMutation = useDeleteUserMutation();

  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  const userValidationSchema = useMemo(
    () => createUserFormSchema(activeUsers, editingUser?.id),
    [activeUsers, editingUser],
  );

  const userForm = useForm<UserFormSchema>({
    resolver: zodResolver(userValidationSchema) as any,
    mode: "onSubmit",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role_code: "customer",
      status: "active",
      password: "",
    },
  });

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
    variant: "delete",
    onConfirm: async () => {},
  });

  const onSubmitUser = async (data: UserFormSchema) => {
    const isEdit = !!editingUser;
    const editingId = editingUser?.id ? String(editingUser.id) : null;
    const otherUsers = activeUsers.filter((u) => String(u.id) !== editingId);

    let hasCustomError = false;

    // Check Email Uniqueness
    if (data.email?.trim()) {
      const dupEmail = otherUsers.find(
        (u) =>
          u.email &&
          u.email.trim().toLowerCase() === data.email.trim().toLowerCase(),
      );
      if (dupEmail) {
        userForm.setError("email", { message: "Email sudah terdaftar" });
        toast.error("Email sudah terdaftar");
        hasCustomError = true;
      }
    }

    // Check Phone Uniqueness
    if (data.phone?.trim()) {
      const normInput = stripCountryCode(data.phone);
      if (normInput) {
        const dupPhone = otherUsers.find(
          (u) => u.phone && stripCountryCode(u.phone) === normInput,
        );
        if (dupPhone) {
          userForm.setError("phone", { message: "Nomor HP sudah terdaftar" });
          if (!hasCustomError) toast.error("Nomor HP sudah terdaftar");
          hasCustomError = true;
        }
      }
    }

    if (hasCustomError) return;

    try {
      await saveUserMutation.mutateAsync({
        userData: data,
        editingId: editingUser?.id,
      });
      toast.success(
        editingUser
          ? `Data pengguna "${data.name}" berhasil diperbarui!`
          : `Pengguna baru "${data.name}" berhasil ditambahkan!`,
      );
      setEditingUser(null);
      userForm.reset({
        name: "",
        email: "",
        phone: "",
        role_code: "customer",
        status: "active",
        password: "",
      });
    } catch (err: any) {
      const errMsg = err.message || "Gagal menyimpan data pengguna";
      const lower = errMsg.toLowerCase();
      if (lower.includes("email")) {
        userForm.setError("email", { message: errMsg });
      } else if (
        lower.includes("phone") ||
        lower.includes("nomor") ||
        lower.includes("telepon") ||
        lower.includes("hp")
      ) {
        userForm.setError("phone", { message: errMsg });
      }
      toast.error(errMsg);
    }
  };

  const handleEditUser = (u: SystemUser) => {
    setEditingUser(u);
    userForm.reset({
      name: u.name,
      email: u.email,
      phone: formatPhoneNumber(u.phone) || u.phone,
      role_code: u.role_code || "customer",
      status: (u.status as any) || "active",
      password: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    userForm.reset({
      name: "",
      email: "",
      phone: "",
      role_code: "customer",
      status: "active",
      password: "",
    });
  };

  const handleTriggerSoftDelete = (u: SystemUser) => {
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Nonaktifkan Pengguna",
      description: `Apakah Anda yakin ingin menonaktifkan pengguna "${u.name}" (${u.email})? Akun akan dipindahkan ke tab User Keluar.`,
      variant: "delete",
      confirmText: "Ya, Nonaktifkan",
      onConfirm: async () => {
        try {
          await deleteUserMutation.mutateAsync(u.id);
          toast.success(
            `Pengguna "${u.name}" berhasil dinonaktifkan (User Keluar).`,
          );
        } catch (err: any) {
          toast.error(err.message || "Gagal menonaktifkan pengguna");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const filteredActiveUsers = useMemo(() => {
    return activeUsers.filter((u) => {
      const matchesRole = roleFilter === "all" || u.role_code === roleFilter;
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q));
      return matchesRole && matchesSearch;
    });
  }, [activeUsers, roleFilter, debouncedSearch]);

  const activeUserColumns = useMemo<ColumnDef<SystemUser>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: "Tanggal Terdaftar",
        cell: ({ row }) => (
          <span className="text-slate-600 font-medium whitespace-nowrap">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Nama User",
        cell: ({ row }) => {
          const u = row.original;
          const index = row.index;
          return (
            <div className="flex items-center gap-2.5 font-bold text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-300 text-sky-800 font-bold flex items-center justify-center text-xs shrink-0">
                {u.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <span>{u.name}</span>
                <span
                  className="block text-[11px] text-slate-500 font-mono font-medium tracking-tight"
                  title={`ID Database: ${u.id}`}
                >
                  {generateUserCode(u, roles, activeUsers)}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Kontak (Email / Phone)",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="text-slate-700">
              <div>{u.email}</div>
              <div className="text-[11px] text-slate-500">
                {formatPhoneNumber(u.phone) || u.phone}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "role_code",
        header: "Role & Status",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="primary">{u.role_name || u.role_code}</Badge>
              <Badge variant="success">Aktif</Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "laundry_pay_balance",
        header: "Saldo LaundryPay",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="font-bold text-slate-900">
              {formatRupiah(u.laundry_pay_balance || 0)}
              <span className="block text-[10px] text-amber-600 font-semibold">
                ★ {u.reward_points || 0} Poin
              </span>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => handleEditUser(u)}
                title="Edit Pengguna"
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
              >
                <Edit3 size={15} />
              </button>
              <button
                onClick={() => handleTriggerSoftDelete(u)}
                title="Nonaktifkan (User Keluar)"
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [roles, activeUsers],
  );

  return (
    <div className="space-y-4 pt-2">
      {/* Form Tambah/Edit User Langsung Ditampilkan di Atas */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-2xs">
        {editingUser && (
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 text-xs">
            <span className="font-semibold text-slate-700">
              Mode Edit:{" "}
              <strong className="text-blue-600">{editingUser.name}</strong>
            </span>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
            >
              Batalkan Edit
            </button>
          </div>
        )}
        <form
          onSubmit={userForm.handleSubmit(onSubmitUser)}
          className="space-y-4 text-xs"
        >
          <div
            className={cn(
              "grid grid-cols-1 sm:grid-cols-2 gap-3",
              editingUser
                ? "md:grid-cols-3 lg:grid-cols-6"
                : "md:grid-cols-3 lg:grid-cols-5",
            )}
          >
            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...userForm.register("name")}
                placeholder="Nama Lengkap"
                className={cn(
                  "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                  userForm.formState.errors.name
                    ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                    : "border-slate-300 focus:border-blue-500",
                )}
              />
              {userForm.formState.errors.name && (
                <p className="text-[10px] text-rose-500 font-medium mt-1">
                  {userForm.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                {...userForm.register("email")}
                placeholder="Email"
                className={cn(
                  "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                  userForm.formState.errors.email
                    ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                    : "border-slate-300 focus:border-blue-500",
                )}
              />
              {userForm.formState.errors.email && (
                <p className="text-[10px] text-rose-500 font-medium mt-1">
                  {userForm.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* No Telepon */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                No. HP / WA <span className="text-rose-500">*</span>
              </label>
              <Controller
                control={userForm.control}
                name="phone"
                render={({ field }) => (
                  <div
                    className={cn(
                      "flex items-center w-full bg-white border rounded-md overflow-hidden transition-colors h-[34px]",
                      userForm.formState.errors.phone
                        ? "border-rose-400 focus-within:border-rose-500 bg-rose-50/30"
                        : "border-slate-300 focus-within:border-blue-500",
                    )}
                  >
                    <span className="pl-3 pr-1 text-xs text-slate-800 font-normal select-none shrink-0">
                      +62
                    </span>
                    <input
                      type="text"
                      value={stripCountryCode(field.value || "")}
                      onChange={(e) => {
                        const stripped = stripCountryCode(e.target.value);
                        field.onChange(stripped ? `+62 ${stripped}` : "");
                      }}
                      placeholder="812-xxxx-xxxx"
                      className="w-full bg-transparent pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                )}
              />
              {userForm.formState.errors.phone && (
                <p className="text-[10px] text-rose-500 font-medium mt-1">
                  {userForm.formState.errors.phone.message}
                </p>
              )}
            </div>

            {/* Password (Hanya tampil saat Edit User) */}
            {editingUser && (
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Password{" "}
                  <span className="text-slate-500 font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <input
                    type={showUserPassword ? "text" : "password"}
                    {...userForm.register("password")}
                    placeholder="Kosongkan jika tidak diubah"
                    className={cn(
                      "w-full bg-white border rounded-md pl-3 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                      userForm.formState.errors.password
                        ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                        : "border-slate-300 focus:border-blue-500",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={
                      showUserPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                  >
                    {showUserPassword ? (
                      <EyeOff size={14} />
                    ) : (
                      <Eye size={14} />
                    )}
                  </button>
                </div>
                {userForm.formState.errors.password && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {userForm.formState.errors.password.message}
                  </p>
                )}
              </div>
            )}

            {/* Role */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Role <span className="text-rose-500">*</span>
              </label>
              <Controller
                control={userForm.control}
                name="role_code"
                render={({ field }) => (
                  <Select
                    key={field.value || "empty"}
                    value={field.value || "customer"}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      clearable={Boolean(field.value)}
                      onClear={() => field.onChange("customer")}
                      className="w-full bg-white border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none"
                    >
                      <SelectValue
                        placeholder={
                          roles.length === 0
                            ? "Tidak ada pilihan data"
                            : "Pilih Role"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.length === 0 ? (
                        <div className="py-2.5 px-3 text-center text-xs text-slate-400 italic select-none">
                          Tidak ada pilihan data
                        </div>
                      ) : (
                        roles.map((r) => (
                          <SelectItem key={r.code} value={r.code}>
                            {r.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Status
              </label>
              <Controller
                control={userForm.control}
                name="status"
                render={({ field }) => (
                  <Select
                    key={field.value || "empty"}
                    value={field.value || "active"}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      clearable={Boolean(field.value)}
                      onClear={() => field.onChange("active")}
                      className="w-full bg-white border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none"
                    >
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Tombol Simpan */}
          <div className="pt-1 flex items-center gap-2">
            <Button
              type="submit"
              disabled={saveUserMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 h-[34px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {saveUserMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>{editingUser ? "Simpan Perubahan" : "Simpan"}</span>
                </>
              )}
            </Button>
            {editingUser && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelEdit}
                className="px-3 py-2 h-[34px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                Batal
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Search & Role Filter Bar with Debounce */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, atau no. telepon user..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-400 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            key={roleFilter}
            value={roleFilter}
            onValueChange={setRoleFilter}
          >
            <SelectTrigger
              clearable={roleFilter !== "all"}
              onClear={() => setRoleFilter("all")}
              className="w-[180px] h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-bold text-sky-700"
            >
              <div className="flex items-center gap-2 overflow-hidden truncate">
                <Filter size={14} className="text-slate-500 shrink-0" />
                <SelectValue placeholder="Semua Role" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Role</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.code} value={r.code}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TanStack Table: User Aktif */}
      <DataTable
        columns={activeUserColumns}
        data={filteredActiveUsers}
        isLoading={isLoadingActive}
        emptyMessage="Tidak ada pengguna aktif yang ditemukan."
        pageSize={10}
      />

      {/* Confirm Dialog (Hanya untuk nonaktifkan user) */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        isLoading={deleteUserMutation.isPending}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
