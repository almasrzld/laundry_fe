export interface SystemUser {
  id: string;
  user_code?: string;
  name: string;
  email: string;
  phone: string;
  role_code: string;
  role_name?: string;
  status: string;
  member_tier?: string;
  laundry_pay_balance?: number;
  reward_points?: number;
  created_at?: string;
  creator?: number | string;
  updated_at?: string;
  update_pic?: number | string;
  deleted_at?: string | null;
  delete_pic?: number | string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  user_count?: number;
  created_at?: string;
  creator?: number | string;
  updated_at?: string;
  update_pic?: number | string;
  deleted_at?: string | null;
  delete_pic?: number | string;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  module: string;
  created_at?: string;
  creator?: number | string;
  updated_at?: string;
  update_pic?: number | string;
  deleted_at?: string | null;
  delete_pic?: number | string;
}

export interface Menu {
  id: string;
  key?: string | null;
  title: string;
  name?: string;
  name_menus?: string;
  path: string;
  nama_akses?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  parent_title?: string | null;
  order_index: number;
  is_active: boolean | number;
  is_sidebar: boolean | number;
  submenus?: Menu[];
  allowed_roles?: string[];
  created_at?: string;
  creator?: number | string;
  updated_at?: string;
  update_pic?: number | string;
  deleted_at?: string | null;
  delete_pic?: number | string;
}

export interface Order {
  id: string;
  id_orders?: number | string;
  invoice_no: string;
  user_id?: string;
  users_id?: number | string;
  service_name: string;
  service_type: string;
  order_date: string;
  estimated_completion_date: string;
  status: string;
  order_statuses_id?: number | string | null;
  status_id?: string | null;
  status_name?: string | null;
  status_code?: string | null;
  status_color_hex?: string | null;
  status_badge_variant?: string | null;
  status_step_order?: number | null;
  order_status?: OrderStatusItem | null;
  quantity: number;
  unit: string;
  price_per_unit: number;
  delivery_fee: number;
  discount: number;
  pickup_address: string;
  delivery_address: string;
  courier_name?: string;
  courier_phone?: string;
  notes?: string;
  timeline?: OrderTimelineStep[];
}

export interface OrderTimelineStep {
  id?: string;
  id_order_timelines?: number | string;
  order_id?: string;
  orders_id?: number | string;
  order_statuses_id?: number | string | null;
  status_id?: string | null;
  title: string;
  description: string;
  time: string;
  is_completed: boolean;
  is_current: boolean;
  step_order?: number;
}

export interface ServiceItem {
  id: string;
  id_services?: number | string;
  name: string;
  name_services?: string;
  description: string;
  price: number;
  units_id?: number | string;
  unit_id?: string;
  unit: string;
  unit_name?: string;
  unit_symbol?: string;
  service_categories_id?: number | string;
  service_category_id?: string;
  category_id?: string;
  category: string;
  category_name?: string;
  icons_id?: number | string | null;
  icon_id?: string | null;
  icon_code: string;
  icon_name?: string;
  duration: string;
  is_popular: boolean | number;
  badge_color_hex: number;
}

export interface Promo {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  discount_amount: number;
  min_order_amount: number;
  icon_code: string;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface IconItem {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string | null;
  is_active: boolean | number;
  created_at?: string;
  creator?: number | string;
  updated_at?: string;
  update_pic?: number | string;
  deleted_at?: string | null;
  delete_pic?: number | string;
}

export interface UnitItem {
  id: string;
  name: string;
  code: string;
  symbol?: string | null;
  description?: string | null;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceCategoryItem {
  id: string;
  name: string;
  code: string;
  icon_code?: string | null;
  badge_color?: string | null;
  description?: string | null;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface PerfumeItem {
  id: string;
  name: string;
  code: string;
  scent_type?: string | null;
  description?: string | null;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface ShelfTypeItem {
  id: string;
  raw_id?: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface StorageShelfItem {
  id: string;
  name: string;
  code: string;
  capacity?: number | null;
  location_notes?: string | null;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentMethodItem {
  id: string;
  name: string;
  code: string;
  type: string;
  account_number?: string | null;
  account_name?: string | null;
  qr_image_url?: string | null;
  description?: string | null;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface OrderStatusItem {
  id: string;
  name: string;
  code: string;
  step_order: number;
  color_hex?: string | null;
  badge_variant?: string | null;
  description?: string | null;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}



