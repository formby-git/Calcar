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
const MIN_MODIFIER_SAMPLES = 100; // Require more data to define a strong modifier

const SPECIAL_VARIANT_KEYWORDS = [
    'AMG', 'RS', 'M3', 'M4', 'M5', 'GT', 'COSWORTH', 'S3', 'S4', 'S5',
    'MUSTANG', 'F150', 'ECONOLINE', 'M SPORT', 'R TYPE', 'TYPE R', 'GTI',
    'CUPRA', 'ABARTH', 'VXR', 'ST', 'JOHN COOPER WORKS', 'JCW', 'QUADRIFOGLIO'
];

const normalize = (str: string) => str?.trim().toLowerCase() || '';

interface CarRecord {
    make: string;
    fuelType: string;
    year: number;
    price: number;
    isSpecialVariant: boolean;
}

interface AggregatedData {
    yearPrices: Map<number, { total: number; count: number }>;
    totalCount: number;
}

function checkIsSpecialVariant(make: string, model: string, variant: string, title: string): boolean {
    const combined = `${make} ${model} ${variant} ${title}`.toUpperCase();
    return SPECIAL_VARIANT_KEYWORDS.some(keyword => {
        // Require word boundaries for short keywords like RS or ST to avoid false positives (e.g., 'CARS', 'ASTRA')
        if (keyword.length <= 2) {
            const regex = new RegExp(`\\b${keyword}\\b`);
            return regex.test(combined);
        }
        return combined.includes(keyword);
    });
}

async function loadData(): Promise<CarRecord[]> {
    const records: CarRecord[] = [];
    let specialCount = 0;

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

        const isSpecialVariant = checkIsSpecialVariant(record.make, record.model, record.variant, record.car_title);
        if (isSpecialVariant) specialCount++;

        records.push({ make, fuelType: fuel, year, price, isSpecialVariant });
    }

    console.log(`Identified ${specialCount} Special Variant records out of ${records.length} total.`);
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

    // Split into standard and special datasets
    const standardRecords = records.filter(r => !r.isSpecialVariant);
    const specialRecords = records.filter(r => r.isSpecialVariant);

    console.log(`\nBase curves will use ${standardRecords.length} Standard records.`);

    const curves: { [key: string]: { rate: number; dataPoints: number } } = {};
    const specialModifiers: { [make: string]: number, global: number } = { global: 1.0 }; // Default multiplier is 1 (no change)

    // Level 1: make|fuel (Standard Only)
    console.log('Calculating STANDARD make|fuel curves...');
    const level1 = aggregateByYear(standardRecords, r => `${r.make}|${r.fuelType}`);
    for (const [key, data] of level1) {
        if (data.totalCount >= MIN_DATA_POINTS) {
            const rate = calculateDepreciationRate(data);
            if (rate !== null) {
                curves[key] = { rate: Math.round(rate * 1000) / 1000, dataPoints: data.totalCount };
            }
        }
    }
    console.log(`  Generated ${Object.keys(curves).length} curves`);

    // Level 2: make only (Standard Only)
    console.log('Calculating STANDARD make curves...');
    const level2 = aggregateByYear(standardRecords, r => r.make);
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

    // Level 3: fuel type only (Standard Only)
    console.log('Calculating STANDARD fuel type curves...');
    const level3 = aggregateByYear(standardRecords, r => r.fuelType);
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

    // Level 4: global (Standard Only)
    console.log('Calculating STANDARD global curve...');
    const globalData: AggregatedData = { yearPrices: new Map(), totalCount: 0 };
    for (const r of standardRecords) {
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

    // Calculate Special Variant Modifiers
    console.log('\nCalculating Special Variant Modifiers...');

    // Group special records by make
    const specialByMake = aggregateByYear(specialRecords, r => r.make);

    let globalSpecialRate = 0;
    let globalSpecialCount = 0;

    for (const [make, specialData] of specialByMake) {
        if (specialData.totalCount >= MIN_MODIFIER_SAMPLES) {
            const specialRate = calculateDepreciationRate(specialData);
            const standardRate = curves[make]?.rate; // Compare against the smoothed standard make curve

            if (specialRate !== null && standardRate) {
                // E.g., special rate = 0.15, standard = 0.20 -> modifier = 0.75
                const modifier = specialRate / standardRate;

                // Sanity check multiplier (cars don't appreciate by 50% year on year magically, nor lose 2x value)
                if (modifier >= 0.5 && modifier <= 1.5) {
                    specialModifiers[make] = Math.round(modifier * 100) / 100;
                    globalSpecialRate += specialRate;
                    globalSpecialCount++;
                    console.log(`  ${make}: Special Rate ${(specialRate * 100).toFixed(1)}% vs Standard ${(standardRate * 100).toFixed(1)}% (Modifier: ${specialModifiers[make]}x)`);
                }
            }
        }
    }

    // Determine Global Special Variant fallback modifier
    if (globalSpecialCount > 0 && globalRate) {
        const avgSpecialRate = globalSpecialRate / globalSpecialCount;
        const globalModifier = avgSpecialRate / globalRate;
        specialModifiers['global'] = Math.round(globalModifier * 100) / 100;
        console.log(`  Fallback Global Special Modifier: ${specialModifiers['global']}x`);
    }


    // Write output
    const output = {
        curves,
        specialModifiers,
        generatedAt: new Date().toISOString().split('T')[0],
        minDataPoints: MIN_DATA_POINTS,
        totalCurves: Object.keys(curves).length,
        note: 'Standard curves exclude Special Variants (RS, AMG, etc) to prevent erratic bumps on older models. Special Variants apply the corresponding multiplier to the standard base rate.'
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(`\nWrote ${Object.keys(curves).length} curves and ${Object.keys(specialModifiers).length} modifiers to ${OUTPUT_PATH}`);
}

main().catch(console.error);
