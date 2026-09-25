import { create } from "zustand";
import { SystemUser, Role, Permission } from "../types";
import { apiFetch } from "../lib/api";

export type UserManagementTab = "active" | "inactive" | "roles" | "permissions";

export interface UserManagementState {
  currentTab: UserManagementTab;
  setTab: (tab: UserManagementTab) => void;

  // Search & Filters
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  roleFilter: string;
  setRoleFilter: (role: string) => void;

  // Data
  activeUsers: SystemUser[];
  inactiveUsers: SystemUser[];
  roles: Role[];
  permissions: Permission[];
  permissionMatrix: Record<string, string[]>; // role_id -> permission_id[]

  // Status
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;

  // Modals
  isUserModalOpen: boolean;
  editingUser: SystemUser | null;
  openUserModal: (user?: SystemUser | null) => void;
  closeUserModal: () => void;

  isRoleModalOpen: boolean;
  editingRole: Role | null;
  openRoleModal: (role?: Role | null) => void;
  closeRoleModal: () => void;

  // Actions
  fetchActiveUsers: () => Promise<void>;
  fetchInactiveUsers: () => Promise<void>;
  fetchRoles: () => Promise<void>;
  fetchPermissionMatrix: () => Promise<void>;

  saveUser: (userData: Partial<SystemUser>) => Promise<boolean>;
  softDeleteUser: (userId: string) => Promise<boolean>;
  restoreUser: (userId: string) => Promise<boolean>;

  saveRole: (roleData: Partial<Role>) => Promise<boolean>;
  softDeleteRole: (roleId: string) => Promise<boolean>;

  toggleMatrixPermission: (roleId: string, permissionId: string) => void;
  saveRolePermissions: (roleId: string) => Promise<boolean>;
}

export const useUserManagementStore = create<UserManagementState>(
  (set, get) => ({
    currentTab: "active",
    setTab: (tab) => {
      set({ currentTab: tab, error: null, successMessage: null });
      if (tab === "active") get().fetchActiveUsers();
      else if (tab === "inactive") get().fetchInactiveUsers();
      else if (tab === "roles") get().fetchRoles();
      else if (tab === "permissions") get().fetchPermissionMatrix();
    },

    searchQuery: "",
    setSearchQuery: (q) => set({ searchQuery: q }),
    roleFilter: "all",
    setRoleFilter: (role) => set({ roleFilter: role }),

    activeUsers: [],
    inactiveUsers: [],
    roles: [],
    permissions: [],
    permissionMatrix: {},

    isLoading: false,
    error: null,
    successMessage: null,

    isUserModalOpen: false,
    editingUser: null,
    openUserModal: (user = null) =>
      set({ isUserModalOpen: true, editingUser: user }),
    closeUserModal: () => set({ isUserModalOpen: false, editingUser: null }),

    isRoleModalOpen: false,
    editingRole: null,
    openRoleModal: (role = null) =>
      set({ isRoleModalOpen: true, editingRole: role }),
    closeRoleModal: () => set({ isRoleModalOpen: false, editingRole: null }),

    // User Actions
    fetchActiveUsers: async () => {
      set({ isLoading: true, error: null });
      try {
        const q = get().searchQuery
          ? `&search=${encodeURIComponent(get().searchQuery)}`
          : "";
        const r =
          get().roleFilter !== "all"
            ? `&role=${encodeURIComponent(get().roleFilter)}`
            : "";
        const data = await apiFetch<SystemUser[]>(
          `/system/users?tab=active${q}${r}`,
        );
        set({ activeUsers: data, isLoading: false });
      } catch (err: any) {
        set({
          error: err.message || "Gagal mengambil data user aktif",
          isLoading: false,
        });
      }
    },

    fetchInactiveUsers: async () => {
      set({ isLoading: true, error: null });
      try {
        const q = get().searchQuery
          ? `&search=${encodeURIComponent(get().searchQuery)}`
          : "";
        const r =
          get().roleFilter !== "all"
            ? `&role=${encodeURIComponent(get().roleFilter)}`
            : "";
        const data = await apiFetch<SystemUser[]>(
          `/system/users?tab=inactive${q}${r}`,
        );
        set({ inactiveUsers: data, isLoading: false });
      } catch (err: any) {
        set({
          error: err.message || "Gagal mengambil data user keluar",
          isLoading: false,
        });
      }
    },

    fetchRoles: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await apiFetch<Role[]>("/system/roles");
        set({ roles: data, isLoading: false });
      } catch (err: any) {
        set({
          error: err.message || "Gagal mengambil data roles",
          isLoading: false,
        });
      }
    },

    fetchPermissionMatrix: async () => {
      set({ isLoading: true, error: null });
      try {
        const res = await apiFetch<{
          roles: Role[];
          permissions: Permission[];
          matrix: Record<string, string[]>;
        }>("/system/matrix");
        set({
          roles: res.roles,
          permissions: res.permissions,
          permissionMatrix: res.matrix,
          isLoading: false,
        });
      } catch (err: any) {
        set({
          error: err.message || "Gagal mengambil matriks hak akses",
          isLoading: false,
        });
      }
    },

    saveUser: async (userData) => {
      set({ isLoading: true, error: null, successMessage: null });
      try {
        if (userData.id) {
          await apiFetch(`/system/users/${userData.id}`, {
            method: "PUT",
            body: JSON.stringify(userData),
          });
          set({ successMessage: "Data pengguna berhasil diperbarui" });
        } else {
          await apiFetch("/system/users", {
            method: "POST",
            body: JSON.stringify(userData),
          });
          set({ successMessage: "Pengguna baru berhasil ditambahkan" });
        }
        get().closeUserModal();
        await get().fetchActiveUsers();
        return true;
      } catch (err: any) {
        set({
          error: err.message || "Gagal menyimpan data pengguna",
          isLoading: false,
        });
        return false;
      }
    },

    softDeleteUser: async (userId) => {
      set({ isLoading: true, error: null, successMessage: null });
      try {
        await apiFetch(`/system/users/${userId}`, { method: "DELETE" });
        set({
          successMessage: "Pengguna berhasil dinonaktifkan (User Keluar)",
        });
        await get().fetchActiveUsers();
        return true;
      } catch (err: any) {
        set({
          error: err.message || "Gagal menonaktifkan pengguna",
          isLoading: false,
        });
        return false;
      }
    },

    restoreUser: async (userId) => {
      set({ isLoading: true, error: null, successMessage: null });
      try {
        await apiFetch(`/system/users/${userId}/restore`, { method: "POST" });
        set({
          successMessage: "Pengguna berhasil dipulihkan kembali ke User Aktif",
        });
        await get().fetchInactiveUsers();
        return true;
      } catch (err: any) {
        set({
          error: err.message || "Gagal memulihkan pengguna",
          isLoading: false,
        });
        return false;
      }
    },

    saveRole: async (roleData) => {
      set({ isLoading: true, error: null, successMessage: null });
      try {
        if (roleData.id && get().editingRole) {
          await apiFetch(`/system/roles/${roleData.id}`, {
            method: "PUT",
            body: JSON.stringify(roleData),
          });
          set({ successMessage: "Data role berhasil diperbarui" });
        } else {
          await apiFetch("/system/roles", {
            method: "POST",
            body: JSON.stringify(roleData),
          });
          set({ successMessage: "Role baru berhasil ditambahkan" });
        }
        get().closeRoleModal();
        await get().fetchRoles();
        return true;
      } catch (err: any) {
        set({
          error: err.message || "Gagal menyimpan data role",
          isLoading: false,
        });
        return false;
      }
    },

    softDeleteRole: async (roleId) => {
      set({ isLoading: true, error: null, successMessage: null });
      try {
        await apiFetch(`/system/roles/${roleId}`, { method: "DELETE" });
        set({ successMessage: "Role berhasil dihapus" });
        await get().fetchRoles();
        return true;
      } catch (err: any) {
        set({ error: err.message || "Gagal menghapus role", isLoading: false });
        return false;
      }
    },

    toggleMatrixPermission: (roleId, permissionId) => {
      const currentList = get().permissionMatrix[roleId] || [];
      const exists = currentList.includes(permissionId);
      const updatedList = exists
        ? currentList.filter((id) => id !== permissionId)
        : [...currentList, permissionId];

      set({
        permissionMatrix: {
          ...get().permissionMatrix,
          [roleId]: updatedList,
        },
      });
    },

    saveRolePermissions: async (roleId) => {
      set({ isLoading: true, error: null, successMessage: null });
      try {
        const permissionIds = get().permissionMatrix[roleId] || [];
        await apiFetch(`/system/roles/${roleId}/permissions`, {
          method: "PUT",
          body: JSON.stringify({ permission_ids: permissionIds }),
        });
        set({
          successMessage: "Hak akses role berhasil disimpan ke database",
          isLoading: false,
        });
        return true;
      } catch (err: any) {
        set({
          error: err.message || "Gagal menyimpan hak akses role",
          isLoading: false,
        });
        return false;
      }
    },
  }),
);
