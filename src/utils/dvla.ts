import type { Car } from './carService';

const DVLA_API_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';

interface DvlaResponse {
    registrationNumber: string;
    make: string;
    yearOfManufacture: number;
    fuelType: string;
    co2Emissions: number;
    colour: string;
    // DVLA API doesn't provide model directly in a clean way, usually just 'make' and technical details.
    // Sometimes it's not even present as a clean model name.
    // We will map what we can.
}

export async function fetchVehicleDetails(registration: string): Promise<Car | null> {
    const apiKey = import.meta.env.DVLA_API_KEY;

    if (!apiKey) {
        console.error("DVLA_API_KEY is not set.");
        return null;
    }

    try {
        const response = await fetch(DVLA_API_URL, {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                registrationNumber: registration
            })
        });

        if (response.status === 404) {
            return null; // Car not found
        }

        if (!response.ok) {
            console.error(`DVLA API Error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        // Map DVLA data to our Car interface
        // Note: DVLA does NOT provide price or explicit model families (e.g. "Golf"), 
        // often just returning the make or a generic description.
        // We will do our best to map it.

        return {
            registration: data.registrationNumber,
            make: data.make,
            model: "Unknown Model", // Placeholder as DVLA doesn't give a marketing model name usually
            yearOfManufacture: data.yearOfManufacture,
            fuelType: data.fuelType || "Unknown",
            co2Emissions: data.co2Emissions || 0,
            colour: data.colour || "Unknown",
            basicPrice: 0, // Not provided by DVLA
            originalListPrice: 0 // Not provided by DVLA
        };

    } catch (error) {
        console.error("Error fetching vehicle details:", error);
        return null;
    }
}
