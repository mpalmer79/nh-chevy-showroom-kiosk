// Generate year options (current year + 1 down to 20 years ago)
const currentYear = new Date().getFullYear();
export const YEAR_OPTIONS = Array.from({ length: 21 }, (_, i) => (currentYear + 1 - i).toString());

// Common makes for dropdown - comprehensive list including newer brands
export const COMMON_MAKES = [
  'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'Buick', 
  'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge', 'Ferrari', 'Fiat', 'Ford', 
  'Genesis', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jaguar', 'Jeep', 'Kia', 
  'Lamborghini', 'Land Rover', 'Lexus', 'Lincoln', 'Lucid', 'Maserati', 'Mazda', 
  'McLaren', 'Mercedes-Benz', 'Mini', 'Mitsubishi', 'Nissan', 'Polestar', 
  'Porsche', 'Ram', 'Rivian', 'Rolls-Royce', 'Subaru', 'Tesla', 'Toyota', 
  'Volkswagen', 'Volvo', 'Other'
];

// Model name to image mapping
export const MODEL_IMAGES: Record<string, string> = {
  // Trucks
  'Silverado 1500': '/images/models/1500.jpg',
  'Silverado 2500HD': '/images/models/2500.jpg',
  'Silverado 3500HD': '/images/models/3500.jpg',
  'Colorado': '/images/models/Colorado.jpg',
  // SUVs & Crossovers
  'Trax': '/images/models/trax.webp',
  'Trailblazer': '/images/models/trailblazer.avif',
  'Equinox': '/images/models/equinox.avif',
  'Equinox EV': '/images/models/equinox-ev.webp',
  'Blazer': '/images/models/blazer.webp',
  'Blazer EV': '/images/models/blazer-ev.webp',
  'Traverse': '/images/models/traverse.avif',
  'Tahoe': '/images/models/tahoe.png',
  'Suburban': '/images/models/suburban.avif',
  // Sports Cars
  'Corvette': '/images/models/corvette.webp',
  'Camaro': '/images/models/camaro.webp',
  // Electric
  'Bolt EV': '/images/models/bolt-ev.webp',
  'Bolt EUV': '/images/models/bolt-euv.webp',
  'Silverado EV': '/images/models/silverado-ev.webp',
};

// Cab configuration images - keyed by "ModelName-CabType"
export const CAB_IMAGES: Record<string, string> = {
  // Silverado 1500
  'Silverado 1500-Regular Cab': '/images/cabs/1500regcab.jpg',
  'Silverado 1500-Double Cab': '/images/cabs/1500doublecab.jpg',
  'Silverado 1500-Crew Cab': '/images/cabs/1500crewcab.jpg',
  // Silverado 2500HD
  'Silverado 2500HD-Regular Cab': '/images/cabs/2500regcab.jpg',
  'Silverado 2500HD-Double Cab': '/images/cabs/2500doublecab.jpg',
  'Silverado 2500HD-Crew Cab': '/images/cabs/2500crewcab.jpg',
  // Silverado 3500HD
  'Silverado 3500HD-Regular Cab': '/images/cabs/3500regcab.jpg',
  'Silverado 3500HD-Double Cab': '/images/cabs/3500doublecab.jpg',
  'Silverado 3500HD-Crew Cab': '/images/cabs/3500crewcab.jpg',
  // Colorado
  'Colorado-Extended Cab': '/images/cabs/coloradoextcab.jpg',
  'Colorado-Crew Cab': '/images/cabs/coloradocrewcab.jpg',
};

// Helper to convert model name to URL-safe slug
export const toSlug = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

// Helper to convert URL slug back to model name
export const fromSlug = (slug: string, modelNames: string[]): string | undefined => {
  return modelNames.find(name => toSlug(name) === slug);
};
