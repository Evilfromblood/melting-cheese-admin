import { Order, OrderStatus } from '@/types';

/**
 * Normalizes an Indian phone number to 91XXXXXXXXXX format for WhatsApp wa.me links
 */
export function normalizeIndianPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  // Strip all non-digit characters
  const digits = rawPhone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  // Fallback: prefix with 91 if not present
  return digits.startsWith('91') ? digits : `91${digits}`;
}

/**
 * Maps system OrderStatus to friendly polite status descriptions
 */
export function getFriendlyStatusText(status: OrderStatus): string {
  switch (status) {
    case 'NEW':
      return 'Accepted & in Kitchen Queue 👨‍🍳';
    case 'PREPARING':
      return 'Being Freshly Prepared in our Kitchen 🍕🔥';
    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery with our Rider 🛵💨';
    case 'DELIVERED':
      return 'Delivered! Enjoy your meal 🧀😋';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return String(status).replace(/_/g, ' ');
  }
}

/**
 * Builds the WhatsApp Business status update URL for direct customer notification
 * Template: "Hi <Name>, your Melting Cheese order #<number> is now <STATUS>! Thank you for ordering direct."
 */
export function buildCustomerWhatsAppUrl(order: Order): string {
  const phone = normalizeIndianPhone(order.customer_phone);
  const customerName = order.customer_name?.trim() || 'Valued Customer';
  const orderNumber = order.order_number || order.id.slice(0, 5);
  const statusText = getFriendlyStatusText(order.order_status);

  const message =
`Hi ${customerName}, your Melting Cheese order #${orderNumber} is now ${statusText}! Thank you for ordering direct.

📍 Melting Cheese • 14, Sant Ravidas Nagar, Bhadohi
📞 +91 80904 85140`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
