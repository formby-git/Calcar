import csv
import json

target_make = "audi"
target_model = "tt"
target_fuel = "petrol"
target_years = ["2005", "2006", "2007", "2008", "2009", "2010", "2011"]

results = {year: [] for year in target_years}

with open("/Users/formby/Documents/Calcar/src/data/all_car_adverts.csv", mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if (row['make'].lower() == target_make and 
            row['model'].lower() == target_model and 
            row['feul_type'].lower() == target_fuel and 
            row['year'] in target_years):
            
            # Check for high perf indicators
            is_high_perf = any(x in row.get('car_title', '').upper() or x in row.get('variant', '').upper() 
                               for x in [' RS', 'RS ', 'TTS', 'S3', 'S4' '3.2', 'V6'])
            
            results[row['year']].append({
                'price': float(row['car_price']),
                'variant': row.get('variant', 'N/A'),
                'title': row.get('car_title', 'N/A'),
                'miles': row.get('miles', 'N/A'),
                'high_perf': is_high_perf
            })

for year in target_years:
    data = results[year]
    if data:
        prices = [r['price'] for r in data]
        avg = sum(prices) / len(prices)
        high_perf_count = sum(1 for r in data if r['high_perf'])
        data.sort(key=lambda x: x['price'])
        print(f"Year {year}: Count={len(data)}, Avg={avg:.2f}, HighPerfCount={high_perf_count}")
        if high_perf_count > 0:
            print(f"  Avg High Perf: {sum(r['price'] for r in data if r['high_perf']) / high_perf_count:.2f}")
            print(f"  Avg Normal: {sum(r['price'] for r in data if not r['high_perf']) / (len(data) - high_perf_count):.2f}")
    else:
        print(f"Year {year}: No data")
