/**
 * Script to verify depreciation modifiers against market data
 * NORMALISED FOR MILEAGE
 * 
 * This analyses the raw CSV to account for mileage differences between brands/fuel types
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, '../src/data/all_car_adverts.csv');

interface CarRecord {
    make: string;
    model: string;
    fuelType: string;
    year: number;
    price: number;
    miles: number;
}

// Brands from the calculator
const SLOWER_DEPRECIATION_BRANDS = ['porsche', 'toyota', 'honda', 'land rover'];
const FASTER_DEPRECIATION_BRANDS = ['ds', 'polestar', 'mitsubishi', 'renault', 'fiat'];

const normalize = (str: string) => str?.trim().toLowerCase() || '';

async function loadData(): Promise<CarRecord[]> {
    const records: CarRecord[] = [];

    const parser = fs
        .createReadStream(CSV_PATH)
        .pipe(parse({
            columns: true,
            skip_empty_lines: true,
            trim: true
        }));

    for await (const record of parser) {
        const make = normalize(record.make);
        const model = normalize(record.model);
        const fuel = normalize(record.feul_type);
        const year = parseInt(record.year, 10);
        const price = parseFloat(record.car_price);
        const miles = parseInt(record.miles, 10);

        if (!make || !model || !fuel || isNaN(year) || isNaN(price) || isNaN(miles)) {
            continue;
        }

        // Filter to reasonable values
        if (price < 1000 || price > 500000) continue;
        if (miles < 0 || miles > 300000) continue;
        if (year < 2018 || year > 2022) continue; // Focus on recent cars

        records.push({ make, model, fuelType: fuel, year, price, miles });
    }

    return records;
}

// Estimate "new price" for a car based on 2022 model average
function getBasePrices(records: CarRecord[]): Map<string, number> {
    const basePrices = new Map<string, number>();
    const counts = new Map<string, { total: number; count: number }>();

    for (const r of records) {
        if (r.year === 2022 && r.miles < 5000) { // Near-new 2022 cars
            const key = `${r.make}|${r.model}|${r.fuelType}`;
            const existing = counts.get(key) || { total: 0, count: 0 };
            existing.total += r.price;
            existing.count++;
            counts.set(key, existing);
        }
    }

    for (const [key, { total, count }] of counts) {
        if (count >= 3) { // Need at least 3 data points
            basePrices.set(key, total / count);
        }
    }

    return basePrices;
}

interface DepreciationPoint {
    make: string;
    fuelType: string;
    ageYears: number;
    priceRetention: number; // price / base price
    mileage: number;
    pricePerMile: number; // depreciation per mile
}

async function main() {
    console.log('Loading data from CSV...');
    const records = await loadData();
    console.log(`Loaded ${records.length} valid records`);

    const basePrices = getBasePrices(records);
    console.log(`Found base prices for ${basePrices.size} make/model/fuel combinations`);

    // Calculate depreciation points
    const points: DepreciationPoint[] = [];

    for (const r of records) {
        const key = `${r.make}|${r.model}|${r.fuelType}`;
        const basePrice = basePrices.get(key);
        if (!basePrice) continue;

        const ageYears = 2022 - r.year;
        if (ageYears <= 0) continue;

        const retention = r.price / basePrice;
        if (retention > 1.2 || retention < 0.1) continue; // Filter outliers

        const depreciation = basePrice - r.price;
        const pricePerMile = r.miles > 1000 ? depreciation / r.miles : 0;

        points.push({
            make: r.make,
            fuelType: r.fuelType,
            ageYears,
            priceRetention: retention,
            mileage: r.miles,
            pricePerMile
        });
    }

    console.log(`\nAnalysing ${points.length} depreciation points...\n`);

    // Aggregate by fuel type
    interface FuelStats {
        totalRetention: number;
        totalMileage: number;
        totalPricePerMile: number;
        count: number;
    }

    const fuelStats: { [fuel: string]: FuelStats } = {};
    const brandStats: { [make: string]: FuelStats } = {};

    for (const p of points) {
        // Fuel stats
        if (!fuelStats[p.fuelType]) {
            fuelStats[p.fuelType] = { totalRetention: 0, totalMileage: 0, totalPricePerMile: 0, count: 0 };
        }
        fuelStats[p.fuelType].totalRetention += p.priceRetention;
        fuelStats[p.fuelType].totalMileage += p.mileage;
        fuelStats[p.fuelType].totalPricePerMile += p.pricePerMile;
        fuelStats[p.fuelType].count++;

        // Brand stats (petrol only for fair comparison)
        if (p.fuelType === 'petrol') {
            if (!brandStats[p.make]) {
                brandStats[p.make] = { totalRetention: 0, totalMileage: 0, totalPricePerMile: 0, count: 0 };
            }
            brandStats[p.make].totalRetention += p.priceRetention;
            brandStats[p.make].totalMileage += p.mileage;
            brandStats[p.make].totalPricePerMile += p.pricePerMile;
            brandStats[p.make].count++;
        }
    }

    console.log('========================================');
    console.log('FUEL TYPE ANALYSIS (with mileage)');
    console.log('========================================\n');

    interface FuelResult {
        fuel: string;
        avgRetention: number;
        avgMileage: number;
        avgPricePerMile: number;
        count: number;
    }

    const fuelResults: FuelResult[] = [];
    for (const fuel in fuelStats) {
        const s = fuelStats[fuel];
        if (s.count >= 50) {
            fuelResults.push({
                fuel,
                avgRetention: s.totalRetention / s.count,
                avgMileage: s.totalMileage / s.count,
                avgPricePerMile: s.totalPricePerMile / s.count,
                count: s.count
            });
        }
    }

    fuelResults.sort((a, b) => b.avgRetention - a.avgRetention);

    const petrolFuel = fuelResults.find(f => f.fuel === 'petrol');
    const petrolPPM = petrolFuel?.avgPricePerMile || 1;

    console.log('Fuel Type'.padEnd(25) + 'Retention'.padStart(12) + 'Avg Miles'.padStart(12) + '£/Mile Dep'.padStart(12) + 'Count'.padStart(10));
    console.log('-'.repeat(71));

    for (const r of fuelResults) {
        const ppmDiff = ((r.avgPricePerMile / petrolPPM) - 1) * 100;
        console.log(
            r.fuel.padEnd(25) +
            `${(r.avgRetention * 100).toFixed(1)}%`.padStart(12) +
            Math.round(r.avgMileage).toString().padStart(12) +
            `£${r.avgPricePerMile.toFixed(2)}`.padStart(12) +
            r.count.toString().padStart(10)
        );
    }

    console.log('\n========================================');
    console.log('BRAND ANALYSIS (petrol only, with mileage)');
    console.log('========================================\n');

    interface BrandResult {
        make: string;
        avgRetention: number;
        avgMileage: number;
        avgPricePerMile: number;
        count: number;
        category: string;
    }

    const brandResults: BrandResult[] = [];
    for (const make in brandStats) {
        const s = brandStats[make];
        if (s.count >= 30) {
            let category = '';
            if (SLOWER_DEPRECIATION_BRANDS.includes(make)) category = 'SLOWER';
            if (FASTER_DEPRECIATION_BRANDS.includes(make)) category = 'FASTER';

            brandResults.push({
                make,
                avgRetention: s.totalRetention / s.count,
                avgMileage: s.totalMileage / s.count,
                avgPricePerMile: s.totalPricePerMile / s.count,
                count: s.count,
                category
            });
        }
    }

    // Sort by price per mile (lower = better value retention per mile driven)
    brandResults.sort((a, b) => a.avgPricePerMile - b.avgPricePerMile);

    const avgPPM = brandResults.reduce((acc, b) => acc + b.avgPricePerMile, 0) / brandResults.length;

    console.log('Brand'.padEnd(18) + 'Retention'.padStart(12) + 'Avg Miles'.padStart(12) + '£/Mile'.padStart(10) + 'vs Avg'.padStart(10) + 'Count'.padStart(8) + 'Category'.padStart(12));
    console.log('-'.repeat(82));

    for (const r of brandResults) {
        const ppmDiff = ((r.avgPricePerMile / avgPPM) - 1) * 100;
        const categoryMarker = r.category === 'SLOWER' ? '✓ SLOWER' :
            r.category === 'FASTER' ? '✗ FASTER' : '';
        console.log(
            r.make.padEnd(18) +
            `${(r.avgRetention * 100).toFixed(1)}%`.padStart(12) +
            Math.round(r.avgMileage).toString().padStart(12) +
            `£${r.avgPricePerMile.toFixed(2)}`.padStart(10) +
            `${ppmDiff >= 0 ? '+' : ''}${ppmDiff.toFixed(0)}%`.padStart(10) +
            r.count.toString().padStart(8) +
            categoryMarker.padStart(12)
        );
    }

    console.log('\n========================================');
    console.log('MILEAGE COMPARISON');
    console.log('========================================\n');

    // Find Toyota specifically
    const toyota = brandResults.find(b => b.make === 'toyota');
    const petrolBrand = brandResults.find(b => b.make === 'volkswagen'); // typical baseline

    if (toyota && petrolBrand) {
        console.log('TOYOTA vs VOLKSWAGEN (typical baseline):');
        console.log(`  Toyota avg mileage: ${Math.round(toyota.avgMileage).toLocaleString()} miles`);
        console.log(`  VW avg mileage:     ${Math.round(petrolBrand.avgMileage).toLocaleString()} miles`);
        console.log(`  Difference:         ${Math.round(toyota.avgMileage - petrolBrand.avgMileage).toLocaleString()} miles (${((toyota.avgMileage / petrolBrand.avgMileage - 1) * 100).toFixed(0)}% more)`);
        console.log('');
        console.log(`  Toyota £/mile:      £${toyota.avgPricePerMile.toFixed(2)}`);
        console.log(`  VW £/mile:          £${petrolBrand.avgPricePerMile.toFixed(2)}`);
        console.log(`  Toyota is ${((toyota.avgPricePerMile / petrolBrand.avgPricePerMile - 1) * 100).toFixed(0)}% more/less expensive per mile`);
    }

    console.log('\n========================================');
    console.log('SUMMARY: MILEAGE-NORMALISED RANKINGS');
    console.log('========================================\n');

    console.log('Best value per mile driven (petrol):');
    for (let i = 0; i < Math.min(5, brandResults.length); i++) {
        const b = brandResults[i];
        console.log(`  ${i + 1}. ${b.make.toUpperCase()} — £${b.avgPricePerMile.toFixed(2)}/mile (avg ${Math.round(b.avgMileage).toLocaleString()} miles)`);
    }

    console.log('\nWorst value per mile driven (petrol):');
    for (let i = brandResults.length - 1; i >= Math.max(0, brandResults.length - 5); i--) {
        const b = brandResults[i];
        console.log(`  ${brandResults.length - i}. ${b.make.toUpperCase()} — £${b.avgPricePerMile.toFixed(2)}/mile (avg ${Math.round(b.avgMileage).toLocaleString()} miles)`);
    }
}

main().catch(console.error);
