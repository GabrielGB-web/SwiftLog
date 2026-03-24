
export enum DeliveryStatus {
  PENDING = 'PENDENTE',
  IN_TRANSIT = 'EM TRÂNSITO',
  DELIVERED = 'ENTREGUE',
  FAILED = 'FALHA NA ENTREGA',
  REJECTED = 'DEVOLVIDO'
}

export interface Driver {
  id: string;
  name: string;
  password?: string; // Senha para acesso individual
  phone?: string;
  vehicle?: string;
}

export interface Load {
  id: string;
  name: string;
  driverId: string;
  driverName: string;
  pickupDate: string; // Data que pegaram na empresa
  departureDate: string; // Data que sai para entrega
  status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED';
  createdAt: string;
}

export interface Delivery {
  id: string;
  orderNumber: string;
  customerName: string;
  orderValue: number;
  city: string;
  address: string;
  driverName: string;
  status: DeliveryStatus;
  updatedAt: string;
  completedAt?: string;
  lat: number;
  lng: number;
  notes?: string;
  receiptPhoto?: string; // Base64 image
  loadId?: string;
}

export type UserRole = 'ADMIN' | 'MOTORISTA' | 'VENDEDOR';

export interface AppState {
  deliveries: Delivery[];
  drivers: Driver[];
  currentUserRole: UserRole | null;
  selectedDriver: string | null;
}
