/**
 * Generate depreciation curves at make+fuel level
 * 
 * Simplified approach after finding model-level data is corrupted by
 * generation changes (e.g., Yaris vs Yaris Cross sharing model name)
 * 
 * Levels:
 * 1. make|fuel (most specific)
 * 2. make
 * 3. fuel
 * 4. global
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, '../src/data/all_car_adverts.csv');
const OUTPUT_PATH = path.join(__dirname, '../src/data/depreciation_curves.json');

const MIN_DATA_POINTS = 50; // Higher threshold for better reliability
const normalize = (str: string) => str?.trim().toLowerCase() || '';

interface CarRecord {
    make: string;
    fuelType: string;
    year: number;
    price: number;
}

interface AggregatedData {
    yearPrices: Map<number, { total: number; count: number }>;
    totalCount: number;
}

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
        const fuel = normalize(record.feul_type);
        const year = parseInt(record.year, 10);
        const price = parseFloat(record.car_price);

        if (!make || !fuel || isNaN(year) || isNaN(price)) continue;
        if (price < 1000 || price > 300000) continue;
        if (year < 2017 || year > 2022) continue;

        records.push({ make, fuelType: fuel, year, price });
    }

    return records;
}

function aggregateByYear(records: CarRecord[], keyFn: (r: CarRecord) => string): Map<string, AggregatedData> {
    const aggregated = new Map<string, AggregatedData>();

    for (const r of records) {
        const key = keyFn(r);

        if (!aggregated.has(key)) {
            aggregated.set(key, { yearPrices: new Map(), totalCount: 0 });
        }

        const data = aggregated.get(key)!;
        const yearData = data.yearPrices.get(r.year) || { total: 0, count: 0 };
        yearData.total += r.price;
        yearData.count++;
        data.yearPrices.set(r.year, yearData);
        data.totalCount++;
    }

    return aggregated;
}

function calculateDepreciationRate(data: AggregatedData): number | null {
    const yearAvgs: [number, number][] = [];

    for (const [year, { total, count }] of data.yearPrices) {
        if (count >= 20) {
            yearAvgs.push([year, total / count]);
        }
    }

    if (yearAvgs.length < 3) return null;

    yearAvgs.sort((a, b) => a[0] - b[0]);

    const newestYear = yearAvgs[yearAvgs.length - 1][0];
    const newestPrice = yearAvgs[yearAvgs.length - 1][1];

    let totalRate = 0;
    let rateCount = 0;

    for (const [year, avgPrice] of yearAvgs) {
        const age = newestYear - year;
        if (age > 0 && age <= 5) {
            const retention = avgPrice / newestPrice;
            // Sanity check: reject if retention suggests >40% or <0% annual depreciation
            if (retention > 0.2 && retention < 1.1) {
                const annualRate = 1 - Math.pow(retention, 1 / age);
                if (annualRate > 0.02 && annualRate < 0.40) {
                    totalRate += annualRate;
                    rateCount++;
                }
            }
        }
    }

    return rateCount > 0 ? totalRate / rateCount : null;
}

async function main() {
    console.log('Loading data from CSV...');
    const records = await loadData();
    console.log(`Loaded ${records.length} valid records`);

    const curves: { [key: string]: { rate: number; dataPoints: number } } = {};

    // Level 1: make|fuel
    console.log('\nCalculating make|fuel curves...');
    const level1 = aggregateByYear(records, r => `${r.make}|${r.fuelType}`);
    for (const [key, data] of level1) {
        if (data.totalCount >= MIN_DATA_POINTS) {
            const rate = calculateDepreciationRate(data);
            if (rate !== null) {
                curves[key] = { rate: Math.round(rate * 1000) / 1000, dataPoints: data.totalCount };
            }
        }
    }
    console.log(`  Generated ${Object.keys(curves).length} curves`);

    // Level 2: make only
    console.log('Calculating make curves...');
    const level2 = aggregateByYear(records, r => r.make);
    let level2Count = 0;
    for (const [key, data] of level2) {
        if (data.totalCount >= MIN_DATA_POINTS) {
            const rate = calculateDepreciationRate(data);
            if (rate !== null) {
                curves[key] = { rate: Math.round(rate * 1000) / 1000, dataPoints: data.totalCount };
                level2Count++;
            }
        }
    }
    console.log(`  Generated ${level2Count} curves`);

    // Level 3: fuel type only
    console.log('Calculating fuel type curves...');
    const level3 = aggregateByYear(records, r => r.fuelType);
    let level3Count = 0;
    for (const [key, data] of level3) {
        if (data.totalCount >= MIN_DATA_POINTS) {
            const rate = calculateDepreciationRate(data);
            if (rate !== null) {
                curves[key] = { rate: Math.round(rate * 1000) / 1000, dataPoints: data.totalCount };
                level3Count++;
            }
        }
    }
    console.log(`  Generated ${level3Count} curves`);

    // Level 4: global
    console.log('Calculating global curve...');
    const globalData: AggregatedData = { yearPrices: new Map(), totalCount: 0 };
    for (const r of records) {
        const yearData = globalData.yearPrices.get(r.year) || { total: 0, count: 0 };
        yearData.total += r.price;
        yearData.count++;
        globalData.yearPrices.set(r.year, yearData);
        globalData.totalCount++;
    }
    const globalRate = calculateDepreciationRate(globalData);
    if (globalRate !== null) {
        curves['global'] = { rate: Math.round(globalRate * 1000) / 1000, dataPoints: globalData.totalCount };
    }
    console.log(`  Global rate: ${(globalRate! * 100).toFixed(1)}%/year`);

    // Write output
    const output = {
        curves,
        generatedAt: new Date().toISOString().split('T')[0],
        minDataPoints: MIN_DATA_POINTS,
        totalCurves: Object.keys(curves).length,
        note: 'Curves at make|fuel level only. Model-specific curves excluded due to generation change data quality issues.'
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(`\nWrote ${Object.keys(curves).length} curves to ${OUTPUT_PATH}`);

    // Show some examples
    console.log('\nSample curves:');
    const samples = ['bmw|petrol', 'toyota|petrol hybrid', 'tesla|electric', 'petrol', 'diesel'];
    for (const s of samples) {
        if (curves[s]) {
            console.log(`  ${s}: ${(curves[s].rate * 100).toFixed(1)}%/year (n=${curves[s].dataPoints})`);
        }
    }
}

main().catch(console.error);
