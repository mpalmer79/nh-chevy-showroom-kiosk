/**
 * Quiz Questions Configuration
 * Centralized quiz question definitions for the GuidedQuiz component
 */

export interface QuizOption {
  value: string;
  label: string;
  icon: string;
  desc: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  subtitle: string;
  options: QuizOption[];
  multiSelect?: boolean;
  maxSelections?: number;
  triggerHelpModal?: string;
}

export interface LeaseRecommendation {
  recommendation: 'lease' | 'finance';
  mileageDescription: string;
  message: string;
}

export interface LeaseFinanceOption {
  title: string;
  icon: string;
  pros: string[];
  cons: string[];
  bestFor: string;
}

export interface LeaseFinanceComparison {
  lease: LeaseFinanceOption;
  finance: LeaseFinanceOption;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'primaryUse',
    question: 'What will you primarily use this vehicle for?',
    subtitle: 'Select the option that best describes your needs',
    options: [
      { value: 'commute', label: 'Daily Commute', icon: '\u{1F3E2}', desc: 'Getting to work & running errands' },
      { value: 'family', label: 'Family Hauling', icon: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}', desc: 'Kids, groceries, road trips' },
      { value: 'work', label: 'Work & Towing', icon: '\u{1F527}', desc: 'Job sites, hauling, towing trailers' },
      { value: 'weekend', label: 'Weekend Fun', icon: '\u{1F3D4}\uFE0F', desc: 'Adventures, outdoor activities' },
      { value: 'all', label: 'All of the Above', icon: '\u2728', desc: 'I need a versatile vehicle' },
    ],
  },
  {
    id: 'passengers',
    question: 'How many passengers do you typically carry?',
    subtitle: 'This helps us recommend the right size',
    options: [
      { value: '1', label: 'Just Me', icon: '\u{1F464}', desc: 'Solo driver most of the time' },
      { value: '2-4', label: '2-4 People', icon: '\u{1F465}', desc: 'Partner, friends, or small family' },
      { value: '5+', label: '5+ People', icon: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}', desc: 'Large family or groups' },
      { value: '3rdRow', label: 'Need 3rd Row', icon: '\u{1F690}', desc: 'Maximum seating capacity' },
    ],
  },
  {
    id: 'mileage',
    question: 'How many miles do you drive per year?',
    subtitle: 'This affects whether leasing is right for you',
    options: [
      { value: 'under10k', label: 'Under 10,000', icon: '\u{1F3E0}', desc: 'Light driving, mostly local' },
      { value: '10-15k', label: '10,000 - 15,000', icon: '\u{1F697}', desc: 'Average daily commuter' },
      { value: '15-20k', label: '15,000 - 20,000', icon: '\u{1F6E3}\uFE0F', desc: 'Regular highway miles' },
      { value: 'over20k', label: 'Over 20,000', icon: '\u2708\uFE0F', desc: 'Road warrior, lots of travel' },
    ],
  },
  {
    id: 'tradeIn',
    question: 'Do you have a vehicle to trade in?',
    subtitle: 'A trade-in can reduce your payments',
    options: [
      { value: 'yes', label: 'Yes', icon: '\u2705', desc: 'I have a vehicle to trade' },
      { value: 'no', label: 'No', icon: '\u2796', desc: 'No trade-in' },
      { value: 'unsure', label: 'Not Sure of Value', icon: '\u2753', desc: "I'd like to get an appraisal" },
    ],
  },
  {
    id: 'paymentType',
    question: 'Are you looking to lease or finance?',
    subtitle: 'Choose what works best for your situation',
    triggerHelpModal: 'unsure',
    options: [
      { value: 'lease', label: 'Lease', icon: '\u{1F4C5}', desc: 'Lower payments, new car every 2-3 years' },
      { value: 'finance', label: 'Finance', icon: '\u{1F3E6}', desc: 'Build equity, own it forever' },
      { value: 'unsure', label: 'Help Me Decide', icon: '\u{1F914}', desc: 'Show me the comparison' },
    ],
  },
  {
    id: 'monthlyPayment',
    question: "What's your ideal monthly payment?",
    subtitle: "We'll find vehicles that fit your budget",
    options: [
      { value: 'under400', label: 'Under $400', icon: '\u{1F4B5}', desc: 'Economy-focused' },
      { value: '400-600', label: '$400 - $600', icon: '\u{1F4B0}', desc: 'Most popular range' },
      { value: '600-800', label: '$600 - $800', icon: '\u{1F48E}', desc: 'Premium options' },
      { value: 'over800', label: '$800+', icon: '\u{1F451}', desc: 'Luxury & performance' },
      { value: 'showAll', label: 'Show Me Options', icon: '\u{1F4CA}', desc: "I'm flexible on price" },
    ],
  },
  {
    id: 'downPayment',
    question: 'How much can you put down today?',
    subtitle: 'More down = lower monthly payments',
    options: [
      { value: '0', label: '$0 Down', icon: '0\uFE0F\u20E3', desc: 'Minimal upfront cost' },
      { value: '1-3k', label: '$1,000 - $3,000', icon: '\u{1F4B5}', desc: 'Standard down payment' },
      { value: '3-5k', label: '$3,000 - $5,000', icon: '\u{1F4B0}', desc: 'Reduce monthly payment' },
      { value: '5k+', label: '$5,000+', icon: '\u{1F48E}', desc: 'Maximize payment reduction' },
    ],
  },
  {
    id: 'features',
    question: 'What features matter most to you?',
    subtitle: 'Select up to 3 priorities',
    multiSelect: true,
    maxSelections: 3,
    options: [
      { value: 'safety', label: 'Safety Tech', icon: '\u{1F6E1}\uFE0F', desc: 'Collision alerts, lane assist' },
      { value: 'towing', label: 'Towing Capacity', icon: '\u{1F69B}', desc: 'Haul trailers & boats' },
      { value: 'fuel', label: 'Fuel Efficiency', icon: '\u26FD', desc: 'Save at the pump' },
      { value: 'audio', label: 'Premium Audio', icon: '\u{1F50A}', desc: 'Bose, upgraded speakers' },
      { value: 'leather', label: 'Leather Seats', icon: '\u{1FA91}', desc: 'Premium interior' },
      { value: 'carplay', label: 'Apple CarPlay', icon: '\u{1F4F1}', desc: 'Smartphone integration' },
    ],
  },
  {
    id: 'timeline',
    question: 'When are you looking to purchase?',
    subtitle: 'This helps us prioritize your inquiry',
    options: [
      { value: 'today', label: 'Today', icon: '\u{1F525}', desc: 'Ready to make a deal' },
      { value: 'thisWeek', label: 'This Week', icon: '\u{1F4C5}', desc: 'Actively shopping' },
      { value: 'thisMonth', label: 'This Month', icon: '\u{1F5D3}\uFE0F', desc: 'Still comparing options' },
      { value: 'researching', label: 'Just Researching', icon: '\u{1F50D}', desc: 'Exploring possibilities' },
    ],
  },
  {
    id: 'rebates',
    question: 'Would you like us to check available rebates & incentives?',
    subtitle: 'We can find special offers that apply to you',
    options: [
      { value: 'yes', label: 'Yes, Maximize Savings', icon: '\u2705', desc: 'Check all applicable rebates' },
      { value: 'no', label: 'Just Show Price', icon: '\u{1F4B2}', desc: 'Show standard pricing' },
    ],
  },
];

export const getLeaseRecommendation = (mileageAnswer?: string): LeaseRecommendation => {
  const isLowMileage = mileageAnswer === 'under10k' || mileageAnswer === '10-15k';

  return {
    recommendation: isLowMileage ? 'lease' : 'finance',
    mileageDescription: isLowMileage ? 'under 15K miles/year' : 'over 15K miles/year',
    message: isLowMileage
      ? 'leasing could save you money with lower monthly payments!'
      : 'financing might be better to avoid mileage penalties.',
  };
};

export const LEASE_FINANCE_COMPARISON: LeaseFinanceComparison = {
  lease: {
    title: 'Lease',
    icon: '\u{1F4C5}',
    pros: [
      'Lower monthly payments',
      'New car every 2-3 years',
      'Always under warranty',
      'Lower sales tax',
    ],
    cons: [
      'Mileage limits apply',
      "Don't own the vehicle",
    ],
    bestFor: 'You drive under 15K miles/year and like having a new car regularly',
  },
  finance: {
    title: 'Finance',
    icon: '\u{1F3E6}',
    pros: [
      'Build equity over time',
      'No mileage restrictions',
      'Customize your vehicle',
      'Own it after payoff',
    ],
    cons: [
      'Higher monthly payments',
      'Maintenance costs later',
    ],
    bestFor: 'You drive a lot, want to keep it long-term, or plan to customize',
  },
};

export default QUIZ_QUESTIONS;
