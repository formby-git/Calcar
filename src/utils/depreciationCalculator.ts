import type { Car } from './carService';

// Brand categories based on UK market research
const SLOWER_DEPRECIATION_BRANDS = ['Porsche', 'Toyota', 'Honda', 'Land Rover'];
const FASTER_DEPRECIATION_BRANDS = ['DS', 'Polestar', 'Mitsubishi', 'Renault', 'Fiat'];

/**
 * Calculate the residual value of a car after a given number of years.
 * Returns the estimated resale value as a decimal multiplier (e.g., 0.6 = 60% of original value).
 * 
 * Uses variable depreciation based on age, fuel type, and brand.
 * Takes into account the car's current age - older cars have already passed
 * the steep early depreciation years.
 */
export function calculateResidualFactor(car: Car, ownershipYears: number): number {
    let residual = 1.0;

    // Calculate car's current age
    const currentYear = new Date().getFullYear();
    const carAge = currentYear - car.yearOfManufacture;

    // For each year of ownership, apply the rate based on the car's age at that point
    for (let i = 0; i < ownershipYears; i++) {
        const ageAtThisPoint = carAge + i; // Car's age during this ownership year

        // Base depreciation rate varies by car's actual age
        let yearlyRate: number;
        if (ageAtThisPoint === 0) {
            yearlyRate = 0.25; // 25% first year of car's life
        } else if (ageAtThisPoint === 1) {
            yearlyRate = 0.15; // 15% second year of car's life
        } else {
            yearlyRate = 0.10; // 10% thereafter
        }

        // Fuel type adjustments
        yearlyRate += getFuelTypeAdjustment(car.fuelType);

        // Brand adjustments
        yearlyRate += getBrandAdjustment(car.make);

        // Ensure rate stays within reasonable bounds (5% to 40%)
        yearlyRate = Math.max(0.05, Math.min(0.40, yearlyRate));

        residual *= (1 - yearlyRate);
    }

    return Math.max(0.05, residual); // Minimum 5% residual value
}

/**
 * Get fuel type depreciation adjustment
 */
function getFuelTypeAdjustment(fuelType: string): number {
    const normalised = fuelType.toLowerCase();

    if (normalised === 'electric') {
        return 0.05; // +5% faster depreciation
    } else if (normalised === 'diesel') {
        return 0.03; // +3% faster depreciation
    } else if (normalised === 'hybrid') {
        return -0.02; // -2% slower depreciation
    }

    return 0; // Petrol = standard
}

/**
 * Get brand depreciation adjustment
 */
function getBrandAdjustment(make: string): number {
    if (SLOWER_DEPRECIATION_BRANDS.includes(make)) {
        return -0.03; // -3% slower depreciation
    } else if (FASTER_DEPRECIATION_BRANDS.includes(make)) {
        return 0.03; // +3% faster depreciation
    }

    return 0; // Standard brands
}

/**
 * Calculate depreciation amount (purchase price - resale value)
 */
export function calculateDepreciation(
    purchasePrice: number,
    car: Car,
    years: number
): number {
    const residualFactor = calculateResidualFactor(car, years);
    const resaleValue = purchasePrice * residualFactor;
    return Math.max(0, purchasePrice - resaleValue);
}

/**
 * Calculate estimated resale value
 */
export function calculateResaleValue(
    purchasePrice: number,
    car: Car,
    years: number
): number {
    const residualFactor = calculateResidualFactor(car, years);
    return Math.round(purchasePrice * residualFactor);
}

/**
 * Modifier information for UI display
 */
export interface DepreciationModifier {
    type: 'fuel' | 'brand';
    label: string;
    isPositive: boolean; // true = holds value better, false = depreciates faster
}

/**
 * Get active modifiers for a car (for Pro model badges)
 */
export function getActiveModifiers(car: Car): DepreciationModifier[] {
    const modifiers: DepreciationModifier[] = [];

    // Check fuel type
    const fuelType = car.fuelType.toLowerCase();
    if (fuelType === 'electric') {
        modifiers.push({
            type: 'fuel',
            label: 'Electric vehicles depreciate faster due to rapid tech changes',
            isPositive: false
        });
    } else if (fuelType === 'diesel') {
        modifiers.push({
            type: 'fuel',
            label: 'Diesel vehicles depreciate faster due to emission concerns',
            isPositive: false
        });
    } else if (fuelType === 'hybrid') {
        modifiers.push({
            type: 'fuel',
            label: 'Hybrids hold value better than average',
            isPositive: true
        });
    }

    // Check brand
    if (SLOWER_DEPRECIATION_BRANDS.includes(car.make)) {
        modifiers.push({
            type: 'brand',
            label: `${car.make} vehicles hold value better than average`,
            isPositive: true
        });
    } else if (FASTER_DEPRECIATION_BRANDS.includes(car.make)) {
        modifiers.push({
            type: 'brand',
            label: `${car.make} vehicles depreciate faster than average`,
            isPositive: false
        });
    }

    return modifiers;
}
