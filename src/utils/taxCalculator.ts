import type { Car } from './carService';

/**
 * UK VED (Vehicle Excise Duty) Calculator
 * Implements accurate rules (2024/2025 + future Budget 2025 changes) including:
 * - CO₂-based first-year rates (for new vehicles)
 * - Standard flat rate (for subsequent years)
 * - Expensive car supplement (£40k/£50k threshold depending on fuel/year)
 * - Registration era logic (pre-2017 vs post-2017)
 */

// First-year rates for cars registered on/after April 2025
// Based on official GOV.UK rates
const FIRST_YEAR_RATES_PETROL: [number, number][] = [
    [0, 10],      // 0 g/km
    [50, 110],    // 1-50 g/km
    [75, 130],    // 51-75 g/km
    [90, 270],    // 76-90 g/km
    [100, 350],   // 91-100 g/km
    [110, 390],   // 101-110 g/km
    [130, 440],   // 111-130 g/km
    [150, 540],   // 131-150 g/km
    [170, 1360],  // 151-170 g/km
    [190, 2190],  // 171-190 g/km
    [225, 3300],  // 191-225 g/km
    [255, 4680],  // 226-255 g/km
    [Infinity, 5490], // 255+ g/km
];

// Diesel cars (non-RDE2) pay higher first-year rates
const FIRST_YEAR_RATES_DIESEL: [number, number][] = [
    [0, 10],
    [50, 130],
    [75, 270],
    [90, 350],
    [100, 390],
    [110, 440],
    [130, 540],
    [150, 1360],
    [170, 2190],
    [190, 3300],
    [225, 4680],
    [255, 5490],
    [Infinity, 5490],
];

// Pre-2017 cars use different CO₂ bands (2024/25 rates)
const PRE_2017_RATES: [number, number][] = [
    [100, 0],
    [110, 20],
    [120, 35],
    [130, 160],
    [140, 175],
    [150, 200],
    [165, 255],
    [175, 290],
    [185, 330],
    [200, 360],
    [225, 400],
    [255, 600],
    [Infinity, 660],
];

// Constants
const STANDARD_RATE = 195;              // Annual rate for post-2017 cars (year 2+)
const EXPENSIVE_CAR_SUPPLEMENT = 425;   // Extra annual charge
const EXPENSIVE_CAR_THRESHOLD = 40000;  // Standard list price threshold
const EXPENSIVE_EV_THRESHOLD = 50000;   // New EV threshold (from April 2025)

/**
 * Get the rate from a banded table based on CO₂ emissions
 */
function getRateFromTable(co2: number, table: [number, number][]): number {
    for (const [threshold, rate] of table) {
        if (co2 <= threshold) return rate;
    }
    return table[table.length - 1][1];
}

/**
 * Calculate first-year VED rate based on emissions and fuel type
 */
export function getFirstYearRate(car: Car): number {
    const fuel = car.fuelType.toUpperCase();
    const co2 = car.co2Emissions;

    // Electric vehicles: £10 first year (from April 2025)
    if (fuel === 'ELECTRIC') {
        return 10;
    }

    // Diesel (non-RDE2 assumed) gets higher rates
    if (fuel === 'DIESEL') {
        return getRateFromTable(co2, FIRST_YEAR_RATES_DIESEL);
    }

    // Petrol, Hybrid, and other fuels
    return getRateFromTable(co2, FIRST_YEAR_RATES_PETROL);
}

/**
 * Calculate standard annual VED rate (year 2+)
 */
export function getStandardRate(car: Car): number {
    const year = car.yearOfManufacture;
    const co2 = car.co2Emissions;

    // Pre-April 2017 cars use CO₂ bands even for subsequent years
    if (year < 2017) {
        return getRateFromTable(co2, PRE_2017_RATES);
    }

    // Post-2017 cars: flat £195 standard rate (including EVs from April 2025)
    return STANDARD_RATE;
}

/**
 * Calculate expensive car supplement for a given vehicle age (NOT ownership year)
 * Returns £425 if applicable for that specific year of the vehicle's life
 */
export function getExpensiveCarSupplement(car: Car, vehicleAge: number): number {
    // Supplement applies from vehicle year 2 to year 6 (5 years total)
    if (vehicleAge < 2 || vehicleAge > 6) {
        return 0;
    }

    const fuel = car.fuelType.toUpperCase();

    // Determine the threshold based on Fuel and Registration Year
    // EVs registered on/after 2025 get the £50k threshold
    let threshold = EXPENSIVE_CAR_THRESHOLD;

    if (fuel === 'ELECTRIC' && car.yearOfManufacture >= 2025) {
        threshold = EXPENSIVE_EV_THRESHOLD;
    }

    // Check if car exceeds calculated threshold
    if (car.originalListPrice > threshold) {
        return EXPENSIVE_CAR_SUPPLEMENT;
    }

    return 0;
}

/**
 * Calculate total VED for a given ownership period
 * @param car - The car object
 * @param ownershipYears - Total years of ownership
 * @returns Total VED for the ownership period
 */
export function calculateTotalVED(car: Car, ownershipYears: number): number {
    const currentYear = new Date().getFullYear(); // Assume calculation is happening 'now'

    let totalVED = 0;

    // Determine the vehicle's age at the start of ownership
    // If manufactured in 2021 and it's now 2025, it's starting its 5th year (approx)
    // 2021 (Year 1), 2022 (2), 2023 (3), 2024 (4), 2025 (Year 5)
    const vehicleAgeAtPurchase = Math.max(1, (currentYear - car.yearOfManufacture) + 1);

    for (let i = 0; i < ownershipYears; i++) {
        const currentVehicleAge = vehicleAgeAtPurchase + i;
        let annualVED: number;

        if (currentVehicleAge === 1) {
            // Brand new car (Year 1 of life)
            annualVED = getFirstYearRate(car);
        } else {
            // Subsequent years
            annualVED = getStandardRate(car);
        }

        // Add expensive car supplement if applicable for this specific vehicle age
        annualVED += getExpensiveCarSupplement(car, currentVehicleAge);

        totalVED += annualVED;
    }

    return totalVED;
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use calculateTotalVED
 */
export function calculateAnnualTax(car: Car): number {
    return calculateTotalVED(car, 1);
}
