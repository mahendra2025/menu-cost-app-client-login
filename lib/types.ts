export type PlanStatus = 'ACTIVE' | 'EXPIRED';
export type UserRole = 'ADMIN' | 'CLIENT';

export type ClientUser = {
  id: string;
  userId: string;
  password: string;
  businessName: string;
  ownerName: string;
  phone: string;
  city: string;
  planName: 'PRO_999';
  status: PlanStatus;
  expiryDate: string;
  createdAt: string;
};

export type Session = {
  role: UserRole;
  tenantId: string;
  userId: string;
  businessName: string;
  status: PlanStatus;
};

export type EventDetails = {
  clientName: string;
  eventName: string;
  eventDate: string;
  functionType: string;
  city: string;
  venue: string;
  pax: number;
  uploadFileName: string;
  rawMenuText: string;
};

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  costPerPlate: number;
  portionQuantity?: number;
  portionUnit?: string;
  portionManuallyEdited?: boolean;
  portionMode?: 'AUTO' | 'CUSTOM';
  portionPercent?: number;
  serviceId?: string;
  dayLabel?: string;
  mealLabel?: string;
  servicePax?: number;
  costSource?: 'catalog' | 'catalog_recipe' | 'ai_recipe' | 'manual';
};

export type ExtraCost = {
  staff: number;
  transport: number;
  gasFuel: number;
  disposable: number;
  other: number;
};

export type DisposableCostItem = {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
};

export type ManpowerRow = {
  id: string;
  role: string;
  quantity: number;
  rate: number;
  serviceId?: string;
  dayLabel?: string;
  mealLabel?: string;
  servicePax?: number;
};

export type BusinessProfile = {
  businessName: string;
  ownerName: string;
  phone: string;
  city: string;
  logoText: string;
};

export type WorkState = {
  costingId: string;
  event: EventDetails;
  menu: MenuItem[];
  manpower: ManpowerRow[];
  extras: ExtraCost;
  disposableItems: DisposableCostItem[];
  sellingPricePerPlate: number;
  profile: BusinessProfile;
  updatedAt: string;
};
