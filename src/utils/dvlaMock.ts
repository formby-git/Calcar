export interface DVLAMockData {
  artEndDate: string;
  co2Emissions: number;
  colour: string;
  engineCapacity: number;
  fuelType: string;
  make: string;
  markedForExport: boolean;
  monthOfFirstRegistration: string;
  motStatus: string;
  registrationNumber: string;
  revenueWeight: number;
  taxDueDate: string;
  taxStatus: string;
  typeApproval: string;
  wheelplan: string;
  yearOfManufacture: number;
  euroStatus: string;
  realDrivingEmissions: string;
  dateOfLastV5CIssued: string;
}

export const MOCK_CAR: DVLAMockData = {
  artEndDate: "2025-02-28",
  co2Emissions: 135,
  colour: "BLUE",
  engineCapacity: 2494,
  fuelType: "PETROL",
  make: "ROVER",
  markedForExport: false,
  monthOfFirstRegistration: "2004-12",
  motStatus: "No details held by DVLA",
  registrationNumber: "ABC1234",
  revenueWeight: 1640,
  taxDueDate: "2007-01-01",
  taxStatus: "Untaxed",
  typeApproval: "N1",
  wheelplan: "NON STANDARD",
  yearOfManufacture: 2004,
  euroStatus: "EURO 6 AD",
  realDrivingEmissions: "1",
  dateOfLastV5CIssued: "2016-12-25"
};

export async function fetchMockCarDetails(registration: string): Promise<DVLAMockData | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  if (registration) {
    // In a real app we'd fetch from API. For now, return mock if any reg is given.
    return {
        ...MOCK_CAR,
        registrationNumber: registration.toUpperCase()
    };
  }
  return null;
}
