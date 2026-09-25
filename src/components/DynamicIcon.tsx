'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
  name?: string | null;
  className?: string;
  size?: number;
}

// Map of common legacy / alternate icon slugs to Lucide PascalCase names
const ICON_ALIAS_MAP: Record<string, string> = {
  home: 'Home',
  dashboard: 'LayoutDashboard',
  'layout-dashboard': 'LayoutDashboard',
  tachometer: 'Gauge',
  'tachometer-alt': 'Gauge',
  gauge: 'Gauge',
  user: 'User',
  users: 'Users',
  'user-cog': 'UserCog',
  'user-check': 'UserCheck',
  'user-plus': 'UserPlus',
  'user-minus': 'UserMinus',
  'user-x': 'UserX',
  'user-circle': 'UserCircle2',
  'user-shield': 'ShieldCheck',
  online: 'Radio',
  'user-online': 'Radio',
  cog: 'Settings',
  cogs: 'Settings',
  gear: 'Settings',
  gears: 'Settings',
  settings: 'Settings',
  shield: 'Shield',
  'shield-alt': 'ShieldCheck',
  'shield-check': 'ShieldCheck',
  shirt: 'Shirt',
  tshirt: 'Shirt',
  truck: 'Truck',
  supplier: 'Truck',
  database: 'Database',
  db: 'Database',
  'db-list': 'Database',
  server: 'Server',
  hdd: 'HardDrive',
  'hard-drive': 'HardDrive',
  cpu: 'Cpu',
  terminal: 'Terminal',
  activity: 'Activity',
  'log-activity': 'Activity',
  history: 'History',
  tool: 'Wrench',
  tools: 'Wrench',
  wrench: 'Wrench',
  version: 'GitBranch',
  versioning: 'GitBranch',
  'versioning-apps': 'GitBranch',
  'code-branch': 'GitBranch',
  'code-fork': 'GitFork',
  code: 'Code',
  box: 'Package',
  boxes: 'Boxes',
  package: 'Package',
  cart: 'ShoppingCart',
  'shopping-cart': 'ShoppingCart',
  pembelian: 'ShoppingCart',
  'shopping-bag': 'ShoppingBag',
  store: 'Store',
  receipt: 'Receipt',
  ticket: 'Ticket',
  'ticket-alt': 'Ticket',
  promo: 'Ticket',
  voucher: 'Tag',
  tag: 'Tag',
  tags: 'Tags',
  percent: 'Percent',
  discount: 'Percent',
  money: 'Banknote',
  'money-bill': 'Banknote',
  dollar: 'DollarSign',
  'credit-card': 'CreditCard',
  wallet: 'Wallet',
  bars: 'Menu',
  menu: 'Menu',
  list: 'List',
  'list-alt': 'ListOrdered',
  'menu-list': 'ListTree',
  folder: 'Folder',
  'folder-open': 'FolderOpen',
  file: 'FileText',
  'file-text': 'FileText',
  'file-alt': 'FileText',
  bell: 'Bell',
  question: 'HelpCircle',
  'question-circle': 'HelpCircle',
  chart: 'BarChart3',
  'chart-bar': 'BarChart3',
  'chart-line': 'LineChart',
  'bar-chart': 'BarChart3',
  'line-chart': 'LineChart',
  sparkles: 'Sparkles',
  lock: 'Lock',
  key: 'Key',
  unlock: 'Unlock',
  layers: 'Layers',
  sliders: 'Sliders',
  'sliders-h': 'Sliders',
  save: 'Save',
  'floppy-o': 'Save',
  edit: 'Edit3',
  'edit-3': 'Edit3',
  pencil: 'Pencil',
  trash: 'Trash2',
  'trash-2': 'Trash2',
  'trash-alt': 'Trash2',
  plus: 'Plus',
  'plus-circle': 'PlusCircle',
  check: 'Check',
  'check-circle': 'CheckCircle2',
  times: 'X',
  close: 'X',
  x: 'X',
  eye: 'Eye',
  'eye-slash': 'EyeOff',
  'sign-out': 'LogOut',
  'sign-out-alt': 'LogOut',
  logout: 'LogOut',
  'sign-in': 'LogIn',
  'sign-in-alt': 'LogIn',
  login: 'LogIn',
  calendar: 'Calendar',
  clock: 'Clock',
  phone: 'Phone',
  mail: 'Mail',
  search: 'Search',
  refresh: 'RefreshCw',
  'rotate-ccw': 'RotateCcw',
};

function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase());
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({
  name,
  className = 'w-5 h-5',
  size = 20,
}) => {
  let cleanName = (name || '').trim();
  if (!cleanName) {
    return null;
  }

  // Clean FA prefixes e.g. "fas fa-home", "fa fa-database", "fa-shopping-cart"
  cleanName = cleanName
    .replace(/^(fas|far|fab|fad|fal|fa)\s+fa-/, '')
    .replace(/^fa-/, '')
    .toLowerCase();

  // 1. Check direct alias mapping
  const mappedName = ICON_ALIAS_MAP[cleanName];

  // 2. Resolve to Lucide Icon component
  let IconComponent = mappedName ? (LucideIcons as any)[mappedName] : null;

  // 3. Try PascalCase conversion (e.g. "shopping-cart" -> "ShoppingCart")
  if (!IconComponent) {
    const pascalName = toPascalCase(cleanName);
    IconComponent = (LucideIcons as any)[pascalName];
  }

  // 4. Try raw original name lookup
  if (!IconComponent && name) {
    IconComponent = (LucideIcons as any)[name];
  }

  // 5. Fallback if still not found: return default Sparkles/Layers or null
  if (!IconComponent) {
    return null;
  }

  return <IconComponent className={className} size={size} />;
};

