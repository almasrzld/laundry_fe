export function isCustomerRole(roleCode?: string | null, roleName?: string | null): boolean {
  if (!roleCode && !roleName) return false;
  const cleanCode = (roleCode || '').toLowerCase().trim();
  const cleanName = (roleName || '').toLowerCase().trim();

  if (cleanCode === 'customer' || cleanCode === 'pelanggan') return true;
  if (cleanName.includes('pelanggan') || cleanName.includes('customer')) return true;

  return false;
}
