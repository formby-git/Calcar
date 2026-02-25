import csv

target_make = "ford"
target_fuel = "petrol"
target_years = ["2002", "2003", "2004", "2009", "2010", "2011", "2012"]

results = {year: [] for year in target_years}

with open("/Users/formby/Documents/Calcar/src/data/all_car_adverts.csv", mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if (row['make'].lower() == target_make and 
            row['feul_type'].lower() == target_fuel and 
            row['year'] in target_years):
            
            # Identify performance or import models that might skew the curve
            model_name = row['model'].upper()
            title = row.get('car_title', '').upper()
            variant = row.get('variant', '').upper()
            
            is_outlier_type = any(x in model_name or x in title or x in variant
                               for x in ['RS', 'ST', 'COSWORTH', 'MUSTANG', 'F150', 'ECONOLINE', 'GT'])
            
            results[row['year']].append({
                'price': float(row['car_price']),
                'model': row['model'],
                'is_outlier_type': is_outlier_type
            })

for year in target_years:
    data = results[year]
    if data:
        prices = [r['price'] for r in data]
        avg = sum(prices) / len(prices)
        
        outliers = [r for r in data if r['is_outlier_type']]
        normal = [r for r in data if not r['is_outlier_type']]
        
        avg_normal = sum(r['price'] for r in normal) / len(normal) if normal else 0
        avg_outlier = sum(r['price'] for r in outliers) / len(outliers) if outliers else 0
        
        print(f"Year {year} (Age {2022 - int(year)}): Avg=£{avg:.0f} | Normal(n={len(normal)})=£{avg_normal:.0f} | Outliers(n={len(outliers)})=£{avg_outlier:.0f}")
