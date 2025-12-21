import type { DVLAMockData } from './dvlaMock';

/**
 * Simplified VED (Road Tax) Calculator.
 * NOTE: This is a rough approximation for prototype purposes.
 * UK VED rules are complex and depend on registration year, fuel type, and list price.
 */
export function calculateAnnualTax(car: DVLAMockData): number {
    const fuel = car.fuelType.toUpperCase();
    const co2 = car.co2Emissions;

    if (fuel === 'ELECTRIC') {
        return 0;
    }

    // Simplified logic for Petrol/Diesel
    if (fuel === 'PETROL' || fuel === 'DIESEL') {
        if (co2 <= 0) return 0;
        if (co2 <= 100) return 20; // Historic bands
        if (co2 <= 150) return 190; // Standard rate approximation
        if (co2 <= 170) return 290;
        if (co2 <= 225) return 600;
        return 700; // High emissions
    }

    // Hybrids/Alternative
    return 180;
}
