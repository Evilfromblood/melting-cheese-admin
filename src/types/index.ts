export type DietaryType = 'veg' | 'non-veg';

export type CategoryType = 
  | 'Pizza'
  | 'Burgers'
  | 'Snacks'
  | 'Chicken Wings & Strips'
  | 'Mocktails';

export type FoodBadge = 'bestseller' | 'chef-special' | 'spicy';

export interface MenuItem {
  id: string;
  name: string;
  category: CategoryType | string;
  dietary: DietaryType;
  base_price: number;
  customizable: boolean;
  description: string;
  is_available: boolean;
  image?: string;
  badge?: FoodBadge | null;
}

export interface OrderItemCustomization {
  crust?: string;
  extraCheese?: boolean;
}

export interface OrderItemSummary {
  name: string;
  category?: string;
  dietary?: DietaryType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customization?: OrderItemCustomization;
}

export type PaymentMethod = 'UPI' | 'COD';
export type PaymentStatus = 'PENDING' | 'PAID';
export type OrderStatus = 'NEW' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  gps_link?: string | null;
  items: OrderItemSummary[];
  subtotal: number;
  discount: number;
  free_item?: string | null;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  created_at: string;
}

export interface DaySummary {
  todayOrdersCount: number;
  todayRevenue: number;
  pendingUpiOrdersCount: number;
  pendingUpiAmount: number;
}
