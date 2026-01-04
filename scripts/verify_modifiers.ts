/**
 * Script to verify depreciation modifiers against market data
 * 
 * This analyses the market_stats.json to check if:
 * 1. Diesel cars depreciate faster than petrol
 * 2. Electric cars depreciate faster than petrol
 * 3. Hybrids hold value better than petrol
 * 4. Specific brands actually depreciate slower/faster
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../src/data/market_stats.json');

interface YearData {
    count: number;
    avgPrice: number;
}

interface FuelData {
    [year: string]: YearData;
}

interface ModelData {
    [fuel: string]: FuelData;
}

interface MakeData {
    [model: string]: ModelData;
}

interface MarketStats {
    [make: string]: MakeData;
}

// Brands from the calculator
const SLOWER_DEPRECIATION_BRANDS = ['porsche', 'toyota', 'honda', 'land rover'];
const FASTER_DEPRECIATION_BRANDS = ['ds', 'polestar', 'mitsubishi', 'renault', 'fiat'];

// Calculate depreciation rate for a model/fuel type
function calcDepreciationRates(fuelData: FuelData): { oneYear: number; threeYear: number; dataPoints: number } | null {
    const years = Object.keys(fuelData).map(Number).sort((a, b) => a - b);

    // Need at least data spanning multiple years
    // We'll calculate: how much % value lost from year N to year N+1, N+3
    // The data is 2022 asking prices for cars of various ages

    // For 2019 cars (3 years old in 2022) vs 2022 cars (new), we can see 3-year depreciation
    // For 2021 cars (1 year old) vs 2022 cars, we can see 1-year depreciation

    const year2022 = fuelData['2022'];
    const year2021 = fuelData['2021'];
    const year2019 = fuelData['2019'];

    if (!year2022 || !year2021 || !year2019) return null;
    if (year2022.count < 5 || year2021.count < 5 || year2019.count < 5) return null;

    // Calculate percentage retained
    const oneYearRetention = year2021.avgPrice / year2022.avgPrice;
    const threeYearRetention = year2019.avgPrice / year2022.avgPrice;

    // Annual depreciation rate (as a percentage lost per year)
    const oneYearDepRate = 1 - oneYearRetention;
    const threeYearAnnualRate = 1 - Math.pow(threeYearRetention, 1 / 3);

    return {
        oneYear: oneYearDepRate,
        threeYear: threeYearAnnualRate,
        dataPoints: year2022.count + year2021.count + year2019.count
    };
}

// Main analysis
const data: MarketStats = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

interface FuelStats {
    totalOneYear: number;
    totalThreeYear: number;
    count: number;
    totalDataPoints: number;
}

const fuelTypeStats: { [fuel: string]: FuelStats } = {};
const brandStats: { [make: string]: FuelStats } = {};

// Process each make/model/fuel combination
for (const make in data) {
    for (const model in data[make]) {
        for (const fuel in data[make][model]) {
            const rates = calcDepreciationRates(data[make][model][fuel]);
            if (!rates) continue;

            // Skip outliers (negative depreciation or >50% per year is likely data issue)
            if (rates.oneYear < 0 || rates.oneYear > 0.5) continue;
            if (rates.threeYear < 0 || rates.threeYear > 0.5) continue;

            // Fuel type stats
            if (!fuelTypeStats[fuel]) {
                fuelTypeStats[fuel] = { totalOneYear: 0, totalThreeYear: 0, count: 0, totalDataPoints: 0 };
            }
            // Weight by data points
            fuelTypeStats[fuel].totalOneYear += rates.oneYear * rates.dataPoints;
            fuelTypeStats[fuel].totalThreeYear += rates.threeYear * rates.dataPoints;
            fuelTypeStats[fuel].count++;
            fuelTypeStats[fuel].totalDataPoints += rates.dataPoints;

            // Brand stats (only for petrol to keep comparison fair)
            if (fuel === 'petrol') {
                if (!brandStats[make]) {
                    brandStats[make] = { totalOneYear: 0, totalThreeYear: 0, count: 0, totalDataPoints: 0 };
                }
                brandStats[make].totalOneYear += rates.oneYear * rates.dataPoints;
                brandStats[make].totalThreeYear += rates.threeYear * rates.dataPoints;
                brandStats[make].count++;
                brandStats[make].totalDataPoints += rates.dataPoints;
            }
        }
    }
}

console.log('\n========================================');
console.log('DEPRECIATION ANALYSIS - FUEL TYPES');
console.log('========================================\n');

console.log('Current modifiers in calculator:');
console.log('  - Electric: +5% faster depreciation');
console.log('  - Diesel:   +3% faster depreciation');
console.log('  - Hybrid:   -2% slower depreciation');
console.log('  - Petrol:   baseline (0%)\n');

// Calculate weighted averages for fuel types
const fuelResults: { fuel: string; oneYear: number; threeYear: number; models: number; listings: number }[] = [];

for (const fuel in fuelTypeStats) {
    const stats = fuelTypeStats[fuel];
    if (stats.totalDataPoints > 0) {
        fuelResults.push({
            fuel,
            oneYear: stats.totalOneYear / stats.totalDataPoints,
            threeYear: stats.totalThreeYear / stats.totalDataPoints,
            models: stats.count,
            listings: stats.totalDataPoints
        });
    }
}

// Sort by depreciation rate
fuelResults.sort((a, b) => a.threeYear - b.threeYear);

console.log('Actual depreciation rates from market data (sorted best to worst):');
console.log('Fuel Type'.padEnd(25) + 'Avg 3yr Rate'.padStart(15) + 'Models'.padStart(10) + 'Listings'.padStart(12));
console.log('-'.repeat(62));

const petrolRate = fuelResults.find(f => f.fuel === 'petrol')?.threeYear || 0;

for (const result of fuelResults) {
    const diff = result.threeYear - petrolRate;
    const diffStr = diff >= 0 ? `+${(diff * 100).toFixed(1)}%` : `${(diff * 100).toFixed(1)}%`;
    console.log(
        result.fuel.padEnd(25) +
        `${(result.threeYear * 100).toFixed(1)}%/yr`.padStart(15) +
        result.models.toString().padStart(10) +
        result.listings.toString().padStart(12) +
        ` (${diffStr} vs petrol)`
    );
}

console.log('\n========================================');
console.log('DEPRECIATION ANALYSIS - BRANDS');
console.log('========================================\n');

console.log('Current modifiers in calculator:');
console.log('  Slower depreciation: Porsche, Toyota, Honda, Land Rover');
console.log('  Faster depreciation: DS, Polestar, Mitsubishi, Renault, Fiat\n');

// Calculate brand results for petrol cars
const brandResults: { make: string; threeYear: number; models: number; listings: number; category: string }[] = [];

for (const make in brandStats) {
    const stats = brandStats[make];
    if (stats.totalDataPoints >= 50 && stats.count >= 3) { // Only include brands with enough data
        let category = 'neutral';
        if (SLOWER_DEPRECIATION_BRANDS.includes(make)) category = 'SLOWER';
        if (FASTER_DEPRECIATION_BRANDS.includes(make)) category = 'FASTER';

        brandResults.push({
            make,
            threeYear: stats.totalThreeYear / stats.totalDataPoints,
            models: stats.count,
            listings: stats.totalDataPoints,
            category
        });
    }
}

// Sort by depreciation rate  
brandResults.sort((a, b) => a.threeYear - b.threeYear);

// Calculate average
const avgBrandRate = brandResults.reduce((acc, b) => acc + b.threeYear, 0) / brandResults.length;

console.log('All brands sorted by depreciation rate (petrol cars only):');
console.log('Brand'.padEnd(20) + 'Avg 3yr Rate'.padStart(15) + 'Models'.padStart(10) + 'Listings'.padStart(12) + 'Category'.padStart(12));
console.log('-'.repeat(69));

for (const result of brandResults) {
    const diff = result.threeYear - avgBrandRate;
    const diffStr = diff >= 0 ? `+${(diff * 100).toFixed(1)}%` : `${(diff * 100).toFixed(1)}%`;
    const categoryMarker = result.category === 'SLOWER' ? '✓ SLOWER' :
        result.category === 'FASTER' ? '✗ FASTER' : '';
    console.log(
        result.make.padEnd(20) +
        `${(result.threeYear * 100).toFixed(1)}%/yr`.padStart(15) +
        result.models.toString().padStart(10) +
        result.listings.toString().padStart(12) +
        categoryMarker.padStart(12)
    );
}

console.log('\n========================================');
console.log('SUMMARY & RECOMMENDATIONS');
console.log('========================================\n');

// Check fuel types
const dieselResult = fuelResults.find(f => f.fuel === 'diesel');
const electricResult = fuelResults.find(f => f.fuel === 'electric');
const hybridResult = fuelResults.find(f => f.fuel.includes('hybrid'));
const petrolResult = fuelResults.find(f => f.fuel === 'petrol');

if (petrolResult && dieselResult) {
    const dieselDiff = (dieselResult.threeYear - petrolResult.threeYear) * 100;
    console.log(`DIESEL: Data shows ${dieselDiff >= 0 ? '+' : ''}${dieselDiff.toFixed(1)}% vs petrol. Calculator uses +3%`);
    if (dieselDiff > 0) {
        console.log('  ✓ SUPPORTED - Data confirms diesel depreciates faster');
    } else {
        console.log('  ✗ NOT SUPPORTED - Data suggests diesel may not depreciate faster');
    }
}

if (petrolResult && electricResult) {
    const electricDiff = (electricResult.threeYear - petrolResult.threeYear) * 100;
    console.log(`\nELECTRIC: Data shows ${electricDiff >= 0 ? '+' : ''}${electricDiff.toFixed(1)}% vs petrol. Calculator uses +5%`);
    if (electricDiff > 0) {
        console.log('  ✓ SUPPORTED - Data confirms electric depreciates faster');
    } else {
        console.log('  ✗ NOT SUPPORTED - Data suggests electric may not depreciate faster');
    }
}

if (petrolResult && hybridResult) {
    const hybridDiff = (hybridResult.threeYear - petrolResult.threeYear) * 100;
    console.log(`\nHYBRID: Data shows ${hybridDiff >= 0 ? '+' : ''}${hybridDiff.toFixed(1)}% vs petrol. Calculator uses -2%`);
    if (hybridDiff < 0) {
        console.log('  ✓ SUPPORTED - Data confirms hybrids hold value better');
    } else {
        console.log('  ✗ NOT SUPPORTED - Data suggests hybrids may not hold value better');
    }
}

// Check brands
console.log('\nBRAND MODIFIERS:');
for (const make of SLOWER_DEPRECIATION_BRANDS) {
    const result = brandResults.find(b => b.make === make);
    if (result) {
        const ranking = brandResults.indexOf(result) + 1;
        const diff = (result.threeYear - avgBrandRate) * 100;
        console.log(`  ${make.toUpperCase()}: Rank ${ranking}/${brandResults.length} (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% vs avg) ${ranking <= brandResults.length / 3 ? '✓' : '✗'}`);
    } else {
        console.log(`  ${make.toUpperCase()}: Insufficient data`);
    }
}

console.log('');
for (const make of FASTER_DEPRECIATION_BRANDS) {
    const result = brandResults.find(b => b.make === make);
    if (result) {
        const ranking = brandResults.indexOf(result) + 1;
        const diff = (result.threeYear - avgBrandRate) * 100;
        console.log(`  ${make.toUpperCase()}: Rank ${ranking}/${brandResults.length} (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% vs avg) ${ranking >= brandResults.length * 2 / 3 ? '✓' : '✗'}`);
    } else {
        console.log(`  ${make.toUpperCase()}: Insufficient data`);
    }
}
