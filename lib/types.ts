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

export type ServiceStyle =
  | 'BUFFET'
  | 'TABLE_SERVICE'
  | 'PACKED_MEAL'
  | 'LIVE_COUNTER';

export type ManpowerDepartment =
  | 'SERVICE'
  | 'COUNTER'
  | 'LIVE_COUNTER'
  | 'BREAD'
  | 'KITCHEN'
  | 'PREPARATION'
  | 'UTILITY'
  | 'LOGISTICS'
  | 'MANAGEMENT';

export type ManpowerInputs = {
  venueType?: 'INDOOR' | 'OUTDOOR';
  waterService?:
    | 'BOTTLE_COUNTER'
    | 'BOTTLE_TABLE'
    | 'GLASS_SERVICE'
    | 'TABLE_SERVICE';
  crockeryType?: 'DISPOSABLE' | 'STANDARD' | 'PREMIUM';
  serviceLevel?: 'STANDARD' | 'PREMIUM' | 'VIP';
};

export type CustomerSelectedDish = {
  id: string;
  name: string;
  category: string;
};

export type CustomerFunctionPlan = {
  id: string;
  name: string;
  date: string;
  pax: number;
  mealType: string;
  selectedDishes: CustomerSelectedDish[];
  serviceStyle: ServiceStyle | null;
};

export type CustomerPlan = {
  event: {
    eventType: string;
    eventName: string;
    eventDate: string;
    city: string;
    venue: string;
    pax: number;
    mealType: string;
  };
  selectedDishes: CustomerSelectedDish[];
  serviceStyle: ServiceStyle | null;
  functions: CustomerFunctionPlan[];
};

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  costPerPlate: number;
  portionQuantity?: number;
  portionUnit?: string;

  /*
   * Optional LPG override copied from Dish Master when available.
   * Event gas costing otherwise falls back to the category master.
   */
  gasKgPer100?: number;

  /*
   * Base serving used for proportional costing.
   * Example:
   * base = 1 piece @ ₹12
   * selected = 2 pieces
   * final serving cost = ₹24
   */
  portionBaseQuantity?: number;

  /*
   * Optional physical weight for piece-based food.
   * Example Gulab Jamun = 35 g / piece.
   */
  pieceWeightGrams?: number;

  portionManuallyEdited?: boolean;
  portionMode?: 'AUTO' | 'CUSTOM';
  portionPercent?: number;
  serviceId?: string;
  dayLabel?: string;
  mealLabel?: string;
  servicePax?: number;

  /*
   * Service format for manpower planning.
   * Defaults to BUFFET for older costings.
   */
  serviceStyle?: ServiceStyle;

  /*
   * Detection metadata is separate from
   * costing confidence.
   *
   * A dish may be detected with 100%
   * confidence but still use an estimated cost.
   */
  detectionSource?:
    | 'catalog'
    | 'ai'
    | 'rules'
    | 'consensus'
    | 'manual';

  detectionConfidence?: number;
  detectionReason?: string;

  costSource?:
    | 'catalog'
    | 'catalog_recipe'
    | 'ai_recipe'
    | 'category_estimate'
    | 'manual';

  coverageStatus?:
    | 'COSTED'
    | 'REVIEW'
    | 'NEW_DISH_PENDING'
    | 'REJECTED'
    | 'UNRESOLVED';

  costQualityStatus?:
    | 'READY'
    | 'REVIEW'
    | 'BLOCKED';

  costConfidence?: number;
  rateCoveragePercent?: number;
  coverageReason?: string;

  accuracyRisk?:
    | 'NEW_BASELINE'
    | 'STABLE'
    | 'WATCH'
    | 'HIGH';

  previousCostPerPlate?: number;
  costChangeAmount?: number;
  costChangePercent?: number;

  costBaselineSource?:
    | 'previous_tenant_recipe'
    | 'dish_master'
    | 'built_in_catalog'
    | 'none';

  accuracyReason?: string;

  costApprovalStatus?:
    | 'NOT_REQUIRED'
    | 'PENDING'
    | 'APPROVED';

  costApprovedAt?: string;
  costApprovalReason?: string;

  ingredientCostDrivers?: Array<{
    name: string;

    quantity: number;
    unit: string;

    rate: number;
    rateUnit: string;
    rateSource: string;

    batchCost: number;

    rawCostPerPlate: number;
    finalCostPerPlate: number;

    contributionPercent: number;

    previousCostPerPlate: number;
    changePerPlate: number;
    changePercent: number;

    direction:
      | 'UP'
      | 'DOWN'
      | 'FLAT'
      | 'NEW';
  }>;
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

export type ManpowerRateMode =
  | 'PER_MEAL'
  | 'PER_SHIFT'
  | 'PER_DAY';

export type ManpowerRow = {
  id: string;
  role: string;
  quantity: number;
  rate: number;

  /* Department from the master manpower index. */
  department?: ManpowerDepartment;

  /* Engine recommendation before any user override. */
  recommendedQuantity?: number;

  /* AUTO when generated by the engine, MANUAL after a quantity override. */
  calculationSource?: 'AUTO' | 'MANUAL';

  /* Human-readable explanation shown on the Team page. */
  calculationReason?: string;

  /* Preserve user quantity changes when the menu or page reloads. */
  manualOverride?: boolean;

  /* Optional menu workload value used for kitchen recommendations. */
  workloadScore?: number;

  /* User-created role added from the Team page. */
  customRole?: boolean;

  /*
   * Billing basis:
   * PER_MEAL  = charge every meal
   * PER_SHIFT = same team can cover meals in one shift
   * PER_DAY   = same team can cover all meals in the day
   */
  rateMode?: ManpowerRateMode;

  /*
   * Used only for PER_SHIFT.
   * Example: Morning / Afternoon / Evening.
   */
  shiftLabel?: string;

  /*
   * Optional dish-wise responsibility.
   * Example: Cook -> Paneer, Dal, Rice.
   */
  assignedDishIds?: string[];

  /*
   * Automatically generated specialist cooks
   * for one menu category station.
   */
  autoDishAssignment?: boolean;

  /*
   * Automatically generated helper for a
   * specialist kitchen station.
   */
  autoStationHelper?: boolean;

  /*
   * Station name used for automatic helpers.
   * Example: Chinese, Chaat, Bread / Tandoor.
   */
  stationLabel?: string;

  serviceId?: string;
  dayLabel?: string;
  mealLabel?: string;
  servicePax?: number;
};

export type EventGasOverride = {
  key: string;
  serviceKey?: string;
  serviceId?: string;
  dishId?: string;
  dishName: string;
  gasKgPer100: number;
  noGas?: boolean;
  updatedAt?: string;
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
  manpowerInputs?: ManpowerInputs;
  extras: ExtraCost;
  disposableItems: DisposableCostItem[];
  /**
   * Per-event LPG overrides. These affect only this costing and never
   * write back to Recipe / Dish Master.
   */
  gasEventOverrides?: EventGasOverride[];
  gasCostMaster?: {
    setting: { cylinderPrice: number; cylinderWeightKg: number };
    categoryRates: Array<{ categoryName: string; lpgKgPer100: number; basePax: number; active: boolean }>;
    dishOverrides: Array<{ name: string; gasKgPer100: number }>;
  };
  sellingPricePerPlate: number;
  profile: BusinessProfile;
  updatedAt: string;
};
