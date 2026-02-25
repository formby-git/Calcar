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

