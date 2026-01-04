/**
 * Analyse whether depreciation curve SHAPES differ by model
 * 
 * Question: Do all cars follow "steep year 1, then flatten" similarly,
 * or do different models/fuel types have different shapes?
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, '../src/data/all_car_adverts.csv');

const normalize = (str: string) => str?.trim().toLowerCase() || '';

interface Record {
    make: string;
    model: string;
    fuel: string;
    year: number;
    price: number;
}

async function loadData(): Promise<Record[]> {
    const records: Record[] = [];

    const parser = fs
        .createReadStream(CSV_PATH)
        .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }));

    for await (const record of parser) {
        const make = normalize(record.make);
        const model = normalize(record.model);
        const fuel = normalize(record.feul_type);
        const year = parseInt(record.year, 10);
        const price = parseFloat(record.car_price);

        if (!make || !model || !fuel || isNaN(year) || isNaN(price)) continue;
        if (price < 1000 || price > 200000) continue;
        if (year < 2017 || year > 2022) continue;

        records.push({ make, model, fuel, year, price });
    }

    return records;
}

interface YearlyRate {
    year0to1: number | null;
    year1to2: number | null;
    year2to3: number | null;
    year3to4: number | null;
    year4to5: number | null;
}

function calculateYearlyRates(records: Record[], keyFn: (r: Record) => string): Map<string, YearlyRate> {
    // Group by key and year
    const groups = new Map<string, Map<number, { total: number; count: number }>>();

    for (const r of records) {
        const key = keyFn(r);
        if (!groups.has(key)) groups.set(key, new Map());
        const yearMap = groups.get(key)!;
        const yearData = yearMap.get(r.year) || { total: 0, count: 0 };
        yearData.total += r.price;
        yearData.count++;
        yearMap.set(r.year, yearData);
    }

    const results = new Map<string, YearlyRate>();

    for (const [key, yearMap] of groups) {
        // Calculate average price per year
        const yearAvgs = new Map<number, number>();
        for (const [year, { total, count }] of yearMap) {
            if (count >= 10) { // Need minimum samples
                yearAvgs.set(year, total / count);
            }
        }

        // Calculate year-over-year depreciation rates
        const getRate = (fromYear: number, toYear: number): number | null => {
            const fromPrice = yearAvgs.get(toYear); // "new" price
            const toPrice = yearAvgs.get(fromYear); // "aged" price
            if (!fromPrice || !toPrice) return null;
            const retention = toPrice / fromPrice;
            if (retention <= 0 || retention > 1.2) return null;
            return 1 - retention;
        };

        // 2022 is our "new" baseline
        results.set(key, {
            year0to1: getRate(2021, 2022),
            year1to2: getRate(2020, 2021),
            year2to3: getRate(2019, 2020),
            year3to4: getRate(2018, 2019),
            year4to5: getRate(2017, 2018),
        });
    }

    return results;
}

async function main() {
    console.log('Loading data...');
    const records = await loadData();
    console.log(`Loaded ${records.length} records\n`);

    // Calculate for different segments
    const byFuel = calculateYearlyRates(records, r => r.fuel);
    const byMake = calculateYearlyRates(records, r => r.make);
    const byMakeModel = calculateYearlyRates(records, r => `${r.make}|${r.model}`);

    console.log('========================================');
    console.log('DEPRECIATION CURVE SHAPES BY FUEL TYPE');
    console.log('========================================\n');

    console.log('Fuel Type'.padEnd(25) + 'Y0→1'.padStart(8) + 'Y1→2'.padStart(8) + 'Y2→3'.padStart(8) + 'Y3→4'.padStart(8) + 'Y4→5'.padStart(8));
    console.log('-'.repeat(65));

    for (const [fuel, rates] of byFuel) {
        if (!rates.year0to1 || !rates.year1to2) continue;
        console.log(
            fuel.padEnd(25) +
            (rates.year0to1 ? `${(rates.year0to1 * 100).toFixed(1)}%` : '-').padStart(8) +
            (rates.year1to2 ? `${(rates.year1to2 * 100).toFixed(1)}%` : '-').padStart(8) +
            (rates.year2to3 ? `${(rates.year2to3 * 100).toFixed(1)}%` : '-').padStart(8) +
            (rates.year3to4 ? `${(rates.year3to4 * 100).toFixed(1)}%` : '-').padStart(8) +
            (rates.year4to5 ? `${(rates.year4to5 * 100).toFixed(1)}%` : '-').padStart(8)
        );
    }

    // Calculate shape metrics (ratio of year1 rate to later years)
    console.log('\n========================================');
    console.log('CURVE SHAPE ANALYSIS');
    console.log('========================================\n');

    console.log('Does year 1 depreciation dominate? (Year1 / Year3 ratio)\n');

    const shapeRatios: { key: string; ratio: number; y1: number; y3: number }[] = [];

    for (const [fuel, rates] of byFuel) {
        if (rates.year0to1 && rates.year2to3 && rates.year2to3 > 0.01) {
            shapeRatios.push({
                key: fuel,
                ratio: rates.year0to1 / rates.year2to3,
                y1: rates.year0to1,
                y3: rates.year2to3
            });
        }
    }

    shapeRatios.sort((a, b) => b.ratio - a.ratio);

    console.log('Fuel Type'.padEnd(25) + 'Y1 Rate'.padStart(10) + 'Y3 Rate'.padStart(10) + 'Ratio'.padStart(10) + 'Shape'.padStart(15));
    console.log('-'.repeat(70));

    for (const { key, ratio, y1, y3 } of shapeRatios) {
        const shape = ratio > 2.5 ? 'STEEP→FLAT' : ratio > 1.5 ? 'MODERATE' : 'LINEAR';
        console.log(
            key.padEnd(25) +
            `${(y1 * 100).toFixed(1)}%`.padStart(10) +
            `${(y3 * 100).toFixed(1)}%`.padStart(10) +
            ratio.toFixed(2).padStart(10) +
            shape.padStart(15)
        );
    }

    // Now check variance across MAKES
    console.log('\n========================================');
    console.log('SHAPE VARIANCE BY MAKE (petrol only)');
    console.log('========================================\n');

    const petrolRecords = records.filter(r => r.fuel === 'petrol');
    const byMakePetrol = calculateYearlyRates(petrolRecords, r => r.make);

    const makeShapes: { make: string; ratio: number; y1: number }[] = [];

    for (const [make, rates] of byMakePetrol) {
        if (rates.year0to1 && rates.year2to3 && rates.year2to3 > 0.01) {
            makeShapes.push({
                make,
                ratio: rates.year0to1 / rates.year2to3,
                y1: rates.year0to1
            });
        }
    }

    makeShapes.sort((a, b) => b.ratio - a.ratio);

    console.log('Make'.padEnd(20) + 'Y1 Rate'.padStart(10) + 'Y1/Y3 Ratio'.padStart(15) + 'Shape'.padStart(15));
    console.log('-'.repeat(60));

    for (const { make, ratio, y1 } of makeShapes) {
        const shape = ratio > 2.5 ? 'STEEP→FLAT' : ratio > 1.5 ? 'MODERATE' : 'LINEAR';
        console.log(
            make.padEnd(20) +
            `${(y1 * 100).toFixed(1)}%`.padStart(10) +
            ratio.toFixed(2).padStart(15) +
            shape.padStart(15)
        );
    }

    // Statistical summary
    const ratios = makeShapes.map(m => m.ratio);
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const variance = ratios.reduce((acc, r) => acc + Math.pow(r - avgRatio, 2), 0) / ratios.length;
    const stdDev = Math.sqrt(variance);

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================\n');

    console.log(`Average Y1/Y3 ratio across makes: ${avgRatio.toFixed(2)}`);
    console.log(`Standard deviation: ${stdDev.toFixed(2)}`);
    console.log(`Coefficient of variation: ${((stdDev / avgRatio) * 100).toFixed(1)}%`);

    console.log('\nINTERPRETATION:');
    if (stdDev / avgRatio < 0.3) {
        console.log('  → Low variance: A UNIVERSAL multiplier would work well.');
        console.log('  → Recommended: Use hardcoded 1.5x → 1.2x → 1.0x → 0.7x');
    } else {
        console.log('  → High variance: Model-specific curves ADD VALUE.');
        console.log('  → Recommended: Store per-model year curves');
    }
}

main().catch(console.error);
