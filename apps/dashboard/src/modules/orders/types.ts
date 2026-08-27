export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface OrderLine {
  productItemId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export type ShipmentStatus = "En attente" | "Expédié" | "Annulé";
export type PaymentStatus = "En attente" | "Payé" | "Annulé";

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  lines: OrderLine[];
  shipping: number;
  discount: number;
  tax: number;
  shipmentStatus: ShipmentStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export function orderSubtotal(order: Pick<Order, "lines">): number {
  return order.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
}

export function orderTotal(order: Pick<Order, "lines" | "shipping" | "discount" | "tax">): number {
  return orderSubtotal(order) + order.shipping + order.tax - order.discount;
}
