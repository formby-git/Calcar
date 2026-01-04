import json
import os

def normalize_key(key):
    return key.lower().strip()

def update_prices():
    cars_path = "/Users/formby/Documents/Calcar/src/data/cars.json"
    stats_path = "/Users/formby/Documents/Calcar/src/data/market_stats.json"

    with open(cars_path, 'r') as f:
        cars = json.load(f)
    
    with open(stats_path, 'r') as f:
        stats = json.load(f)

    updated_count = 0
    missing_count = 0

    for car in cars:
        make = normalize_key(car['make'])
        model = normalize_key(car['model'])
        fuel = normalize_key(car['fuelType'])
        
        # CURRENT YEAR is 2026 (System Time)
        # DATA YEAR is 2022
        CURRENT_YEAR = 2026
        DATA_YEAR = 2022
        
        car_year_int = int(car['yearOfManufacture'])
        current_age = CURRENT_YEAR - car_year_int
        
        # We want to find the price of a car that was 'current_age' years old in 2022
        target_lookup_year = DATA_YEAR - current_age
        
        # print(f"Car {make} {model} {year} (Age {current_age}) -> Lookup Year in 2022 Data: {target_lookup_year}")

        found_data = None
        
        # 1. Exact Match on Calculated Lookup Year
        if make in stats and model in stats[make] and fuel in stats[make][model]:
            model_data = stats[make][model][fuel]
            target_str = str(target_lookup_year)
            
            if target_str in model_data:
                found_data = model_data[target_str]
            else:
                # 2. Fallback: Closest Year to the TARGET lookup year
                avail_years = [int(y) for y in model_data.keys() if y.isdigit()]
                if avail_years:
                    closest_year = min(avail_years, key=lambda x: abs(x - target_lookup_year))
                    # print(f"Fallback for {make} {model} (Target {target_lookup_year}) -> Using {closest_year}")
                    found_data = model_data[str(closest_year)]
        
        if found_data:
            avg_price = found_data['avgPrice']
            
            # Update basicPrice
            new_price = int(round(avg_price / 100.0)) * 100
            
            # Since we are correcting a massive logic error, we expect updates.
            # Only update if different
            if new_price != car['basicPrice']:
                car['basicPrice'] = new_price
                updated_count += 1
            
            # Sanity check
            if car['basicPrice'] > car['originalListPrice']:
               pass

        else:
            missing_count += 1

    print(f"Updated {updated_count} cars.")
    print(f"Missing market data for {missing_count} cars.")

    with open(cars_path, 'w') as f:
        json.dump(cars, f, indent=4)

if __name__ == "__main__":
    update_prices()
