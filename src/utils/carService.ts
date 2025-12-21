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
