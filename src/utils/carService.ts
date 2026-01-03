import carsData from '../data/cars.json';

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
}

export const getCarByRegistration = async (registration: string): Promise<Car | null> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const formattedReg = registration.replace(/\s/g, '').toUpperCase();
    const car = carsData.find(c => c.registration.replace(/\s/g, '').toUpperCase() === formattedReg);

    return car || null;
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

