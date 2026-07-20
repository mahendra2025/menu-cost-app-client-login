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
};

export type ExtraCost = {
  staff: number;
  transport: number;
  gasFuel: number;
  disposable: number;
  other: number;
};

export type BusinessProfile = {
  businessName: string;
  ownerName: string;
  phone: string;
  city: string;
  logoText: string;
};

export type WorkState = {
  event: EventDetails;
  menu: MenuItem[];
  extras: ExtraCost;
  sellingPricePerPlate: number;
  profile: BusinessProfile;
  updatedAt: string;
};
