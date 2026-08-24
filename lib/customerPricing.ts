import { customerPricingConfig, type CustomerPricingConfig } from './customerPricingConfig';
import { serviceStaffRecommendation } from './serviceStaffing';
import type { ServiceStyle } from './types';

export type CustomerPricingDish = {
  dishId: string;
  name: string;
  category: string;
  internalFoodCost: number;
};

export type CustomerEstimate = {
  menuItems: Array<{
    dishId: string;
    name: string;
    category: string;
    customerPricePerPlate: number;
    totalForGuests: number;
  }>;
  foodPricePerPlate: number;
  servicePricePerPlate: number;
  finalPricePerPlate: number;
  estimatedEventTotal: number;
};

export function calculateCustomerEstimate({
  pax,
  selectedDishes,
  serviceStyle,
  config = customerPricingConfig,
}: {
  pax: number;
  selectedDishes: CustomerPricingDish[];
  serviceStyle: ServiceStyle;
  config?: CustomerPricingConfig;
}): CustomerEstimate {
  const guests = Math.max(1, Math.round(Number(pax) || 1));
  const menuItems = selectedDishes.map((dish) => {
    const cost = Math.max(0, Number(dish.internalFoodCost) || 0);
    const markedUp = cost * (1 + config.foodMarkupPercent / 100);
    const customerPricePerPlate = Math.ceil(Math.max(markedUp, cost + config.minimumPerPlateMargin));
    return {
      dishId: dish.dishId,
      name: dish.name,
      category: dish.category,
      customerPricePerPlate,
      totalForGuests: customerPricePerPlate * guests,
    };
  });
  const foodPricePerPlate = menuItems.reduce((sum, item) => sum + item.customerPricePerPlate, 0);
  const manpower = serviceStaffRecommendation(serviceStyle, guests).reduce(
    (sum, row) => sum + row.quantity * (config.manpowerRates[row.rateRole] || 0),
    0,
  );
  const serviceBase = manpower + config.transportBase + config.gasFuelBase +
    config.equipmentSetupBase + config.crockeryPerGuest[serviceStyle] * guests;
  const servicePricePerPlate = Math.ceil(
    (serviceBase * (1 + config.serviceMarkupPercent / 100)) / guests,
  );
  const finalPricePerPlate = Math.ceil(
    (foodPricePerPlate + servicePricePerPlate) * (1 + config.contingencyPercent / 100),
  );

  return {
    menuItems,
    foodPricePerPlate,
    servicePricePerPlate,
    finalPricePerPlate,
    estimatedEventTotal: finalPricePerPlate * guests,
  };
}
