import { api } from "./api";

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  archived: boolean;
  createdAt: string;
}

export interface SupplierInput {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export function fetchSuppliers(includeArchived = false): Promise<Supplier[]> {
  return api.get<Supplier[]>(`/suppliers${includeArchived ? "?includeArchived=true" : ""}`);
}

export function createSupplier(input: SupplierInput): Promise<Supplier> {
  return api.post<Supplier>("/suppliers", input);
}

export function updateSupplier(id: string, input: Partial<SupplierInput>): Promise<Supplier> {
  return api.patch<Supplier>(`/suppliers/${id}`, input);
}

export function setSupplierArchived(id: string, archived: boolean): Promise<Supplier> {
  return api.patch<Supplier>(`/suppliers/${id}/${archived ? "archive" : "unarchive"}`);
}
