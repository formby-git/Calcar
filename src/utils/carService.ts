import carsData from '../data/cars.json';

import { fetchVehicleDetails } from './dvla';

export interface Car {
    registration: string;
    make: string;
    model: string;
    yearOfManufacture: number;
    fuelType: string;
    co2Emissions: number;
    colour: string;
    basicPrice: number;
    originalListPrice: number;
    variant?: string;
    title?: string;
}

/**
 * Fetches vehicle details by registration plate.
 * It first searches the local static database (`cars.json`). 
 * If not found, it falls back to querying the official DVLA API.
 * 
 * @param {string} registration - The UK vehicle registration plate.
 * @param {string} [apiKey] - Optional DVLA API Key. If not provided, it attempts to read from the environment.
 * @returns {Promise<Car | null>} A Promise resolving to the Car object, or null if the vehicle is not found in either source.
 */
export const getCarByRegistration = async (registration: string, apiKey?: string): Promise<Car | null> => {
    const formattedReg = registration.replace(/\s/g, '').toUpperCase();

    // 1. Try local data first
    const car = carsData.find(c => c.registration.replace(/\s/g, '').toUpperCase() === formattedReg);
    if (car) return car;

    // 2. Fallback to DVLA API
    console.log(`Car ${formattedReg} not found locally, fetching from DVLA...`);
    const dvlaCar = await fetchVehicleDetails(formattedReg, apiKey);

    return dvlaCar;
};

export const getAllCars = async (): Promise<Car[]> => {
    return carsData;
}

export const getRandomCar = async (): Promise<Car> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    const randomIndex = Math.floor(Math.random() * carsData.length);
    return carsData[randomIndex];
};

