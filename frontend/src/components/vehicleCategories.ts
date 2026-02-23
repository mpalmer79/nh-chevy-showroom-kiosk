import { BaseCategories } from '../types';

// Base category definitions - models will be filtered by actual inventory
export const BASE_CATEGORIES: BaseCategories = {
  trucks: {
    name: 'Trucks',
    icon: '🚛',
    modelNames: ['Silverado 1500', 'Silverado 2500HD', 'Silverado 3500HD', 'Colorado', 'Silverado MD'],
    cabOptions: {
      'Silverado 1500': ['Regular Cab', 'Double Cab', 'Crew Cab'],
      'Silverado 2500HD': ['Regular Cab', 'Double Cab', 'Crew Cab'],
      'Silverado 3500HD': ['Regular Cab', 'Double Cab', 'Crew Cab'],
      'Colorado': ['Extended Cab', 'Crew Cab'],
    },
  },
  suvs: {
    name: 'SUVs & Crossovers',
    icon: '🚙',
    modelNames: ['Trax', 'Trailblazer', 'Equinox', 'Blazer', 'Traverse', 'Tahoe', 'Suburban'],
  },
  sports: {
    name: 'Sports Cars',
    icon: '🏎️',
    modelNames: ['Corvette', 'Camaro'],
  },
  sedans: {
    name: 'Sedans',
    icon: '🚗',
    modelNames: ['Malibu'],
  },
  electric: {
    name: 'Electric',
    icon: '⚡',
    modelNames: ['Bolt EV', 'Bolt EUV', 'Equinox EV', 'Blazer EV', 'Silverado EV'],
  },
};

// Helper to normalize model names for matching
export const normalizeModelName = (name: string): string => {
  return name.toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};

// Check if inventory model matches a category model
export const modelMatches = (inventoryModel: string, categoryModel: string): boolean => {
  const invNorm = normalizeModelName(inventoryModel);
  const catNorm = normalizeModelName(categoryModel);

  // Exact match
  if (invNorm === catNorm) return true;

  // Inventory model starts with category model (e.g., "Silverado 1500" matches "Silverado 1500 LT")
  if (invNorm.startsWith(catNorm)) return true;

  // Handle special cases
  if (catNorm === 'silverado 2500hd' && invNorm.includes('2500')) return true;
  if (catNorm === 'silverado 3500hd' && (invNorm.includes('3500') || invNorm.includes('3500hd cc'))) return true;
  if (catNorm === 'equinox ev' && invNorm === 'equinox ev') return true;
  if (catNorm === 'equinox' && invNorm === 'equinox' && !invNorm.includes('ev')) return true;
  if (catNorm === 'silverado ev' && invNorm === 'silverado ev') return true;

  return false;
};
