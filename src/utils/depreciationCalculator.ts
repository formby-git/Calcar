import type { Car } from './carService';
import depreciationData from '../data/depreciation_curves.json';

/**
 * Curve data from the generated JSON
 */
interface CurveData {
    rate: number;
    dataPoints: number;
}

interface DepreciationCurves {
    curves: { [key: string]: CurveData };
    generatedAt: string;
    minDataPoints: number;
    totalCurves: number;
}

const curves = (depreciationData as DepreciationCurves).curves;

/**
 * Information about which curve was used for the calculation
 */
export interface CurveSource {
    level: 'make|fuel' | 'make' | 'fuel' | 'global';
    key: string;
    rate: number;
    dataPoints: number;
}

/**
 * Find the best available depreciation curve for a car
 * Uses hierarchical lookup at make+fuel level (model excluded due to data quality)
 */
export function findBestCurve(make: string, model: string, fuelType: string): CurveSource {
    const normMake = make.toLowerCase();
    const normFuel = fuelType.toLowerCase();

    // Lookup hierarchy (model excluded - generation changes corrupt model-level data)
    const candidates: { key: string; level: CurveSource['level'] }[] = [
        { key: `${normMake}|${normFuel}`, level: 'make|fuel' },
        { key: normMake, level: 'make' },
        { key: normFuel, level: 'fuel' },
        { key: 'global', level: 'global' },
    ];

    for (const { key, level } of candidates) {
        const curve = curves[key];
        if (curve) {
            return {
                level,
                key,
                rate: curve.rate,
                dataPoints: curve.dataPoints
            };
        }
    }

    // Absolute fallback (should never happen if global exists)
    return {
        level: 'global',
        key: 'fallback',
        rate: 0.15,
        dataPoints: 0
    };
}

/**
 * Calculate the residual value of a car after a given number of years.
 * Returns the estimated resale value as a decimal multiplier (e.g., 0.6 = 60% of original value).
 * 
 * Uses hierarchical curve lookup based on make, model, and fuel type.
 * Takes into account the car's current age - older cars have already passed
 * the steep early depreciation years.
 */
export function calculateResidualFactor(car: Car, ownershipYears: number): number {
    const curveSource = findBestCurve(car.make, car.model, car.fuelType);
    const baseRate = curveSource.rate;

    // Calculate car's current age
    const currentYear = new Date().getFullYear();
    const carAge = currentYear - car.yearOfManufacture;

    let residual = 1.0;

    // For each year of ownership, apply the rate based on the car's age at that point
    for (let i = 0; i < ownershipYears; i++) {
        const ageAtThisPoint = carAge + i;

        // Early years depreciate faster, later years slower
        // Scale the base rate based on age
        let yearlyRate: number;
        if (ageAtThisPoint === 0) {
            yearlyRate = baseRate * 1.5; // First year: 150% of base rate
        } else if (ageAtThisPoint === 1) {
            yearlyRate = baseRate * 1.2; // Second year: 120% of base rate
        } else if (ageAtThisPoint <= 3) {
            yearlyRate = baseRate; // Years 2-3: base rate
        } else {
            yearlyRate = baseRate * 0.7; // Years 4+: 70% of base rate
        }

        // Ensure rate stays within reasonable bounds (3% to 35%)
        yearlyRate = Math.max(0.03, Math.min(0.35, yearlyRate));

        residual *= (1 - yearlyRate);
    }

    return Math.max(0.05, residual); // Minimum 5% residual value
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
 * Get curve source info for UI display
 */
export function getCurveSource(car: Car): CurveSource {
    return findBestCurve(car.make, car.model, car.fuelType);
}

/**
 * Format curve source for human-readable display
 */
export function formatCurveSource(source: CurveSource): string {
    const parts = source.key.split('|');

    switch (source.level) {
        case 'make|fuel':
            return `${capitalise(parts[0])} (${parts[1]})`;
        case 'make':
            return `${capitalise(parts[0])} (all fuel types)`;
        case 'fuel':
            return `${capitalise(parts[0])} vehicles (average)`;
        case 'global':
            return 'UK market average';
    }
}

function capitalise(str: string): string {
    return str.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}
