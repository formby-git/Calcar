import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define types
interface MarketStat {
    count: number;
    totalPrice: number;
    avgPrice: number;
}

interface MarketData {
    [make: string]: {
        [model: string]: {
            [fuelStart: string]: {
                [year: string]: MarketStat;
            };
        };
    };
}

const INPUT_PATH = path.join(__dirname, '../src/data/all_car_adverts.csv');
const OUTPUT_PATH = path.join(__dirname, '../src/data/market_stats.json');

// Normalization helpers
const normalize = (str: string) => str?.trim().toLowerCase() || '';

// typo in CSV header: 'feul_type'
const processData = async () => {
    console.log('Starting data processing...');
    
    const stats: MarketData = {};
    let processedCount = 0;

    const parser = fs
        .createReadStream(INPUT_PATH)
        .pipe(parse({
            columns: true,
            skip_empty_lines: true,
            trim: true
        }));

    for await (const record of parser) {
        const make = normalize(record.make);
        const model = normalize(record.model);
        const fuel = normalize(record.feul_type); // Note the typo in CSV header
        const year = parseInt(record.year, 10);
        const price = parseFloat(record.car_price);

        if (!make || !model || !fuel || isNaN(year) || isNaN(price)) {
            continue;
        }

        // Initialize structure
        if (!stats[make]) stats[make] = {};
        if (!stats[make][model]) stats[make][model] = {};
        if (!stats[make][model][fuel]) stats[make][model][fuel] = {};
        
        const yearKey = year.toString();
        if (!stats[make][model][fuel][yearKey]) {
            stats[make][model][fuel][yearKey] = {
                count: 0,
                totalPrice: 0,
                avgPrice: 0
            };
        }

        // Update stats
        const entry = stats[make][model][fuel][yearKey];
        entry.count++;
        entry.totalPrice += price;
        
        processedCount++;
        if (processedCount % 50000 === 0) {
            console.log(`Processed ${processedCount} records...`);
        }
    }

    // Calculate averages (Optional: remove raw totals to save space)
    console.log('Calculating averages...');
    for (const make in stats) {
        for (const model in stats[make]) {
            for (const fuel in stats[make][model]) {
                for (const year in stats[make][model][fuel]) {
                    const entry = stats[make][model][fuel][year];
                    entry.avgPrice = Math.round(entry.totalPrice / entry.count);
                    // Minimal cleanup to reduce JSON size
                    // @ts-ignore
                    delete entry.totalPrice; 
                }
            }
        }
    }

    console.log(`Writing output to ${OUTPUT_PATH}...`);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(stats, null, 0)); // Compact JSON
    console.log('Done!');
};

processData().catch(console.error);
