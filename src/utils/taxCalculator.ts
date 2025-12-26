import type { Car } from './carService';

/**
 * UK VED (Vehicle Excise Duty) Calculator
 * Implements accurate 2024/2025 UK tax rules including:
 * - CO₂-based first-year rates (for new vehicles)
 * - Standard flat rate (for subsequent years)
 * - Expensive car supplement (£40k+ list price)
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
const EXPENSIVE_CAR_SUPPLEMENT = 425;   // Extra annual charge for £40k+ cars (years 2-6)
const EXPENSIVE_CAR_THRESHOLD = 40000;  // List price threshold
const SUPPLEMENT_YEARS = 5;             // Years the supplement applies

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
    const fuel = car.fuelType.toUpperCase();
    const co2 = car.co2Emissions;

    // Pre-April 2017 cars use CO₂ bands even for subsequent years
    if (year < 2017) {
        return getRateFromTable(co2, PRE_2017_RATES);
    }

    // Post-2017 cars: flat £195 standard rate (including EVs from April 2025)
    return STANDARD_RATE;
}

/**
 * Calculate expensive car supplement for a given year of ownership
 * Returns £425 for years 2-6 if original list price > £40,000
 */
export function getExpensiveCarSupplement(car: Car, yearOfOwnership: number): number {
    // Supplement applies from year 2 to year 6 (5 years total)
    if (yearOfOwnership < 2 || yearOfOwnership > 6) {
        return 0;
    }

    // Check if car exceeds expensive threshold
    if (car.originalListPrice > EXPENSIVE_CAR_THRESHOLD) {
        return EXPENSIVE_CAR_SUPPLEMENT;
    }

    return 0;
}

/**
 * Calculate total VED for a given ownership period
 * @param car - The car object
 * @param ownershipYears - Total years of ownership
 * @param isNewPurchase - If true, applies first-year rates; if false, uses standard rates throughout
 * @returns Total VED for the ownership period
 */
export function calculateTotalVED(car: Car, ownershipYears: number, isNewPurchase: boolean = false): number {
    let totalVED = 0;

    for (let year = 1; year <= ownershipYears; year++) {
        let annualVED: number;

        if (year === 1 && isNewPurchase) {
            // First year of a new car gets first-year rate
            annualVED = getFirstYearRate(car);
        } else {
            // Subsequent years or used cars get standard rate
            annualVED = getStandardRate(car);
        }

        // Add expensive car supplement if applicable
        annualVED += getExpensiveCarSupplement(car, year);

        totalVED += annualVED;
    }

    return totalVED;
}

/**
 * Legacy function for backwards compatibility
 * Returns annual tax (standard rate only, no first-year calculation)
 * @deprecated Use calculateTotalVED for accurate multi-year calculations
 */
export function calculateAnnualTax(car: Car): number {
    const standardRate = getStandardRate(car);
    const supplement = getExpensiveCarSupplement(car, 2); // Assume year 2 for supplement check
    return standardRate + supplement;
}
