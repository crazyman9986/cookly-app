
export interface Ingredient {
  name: string;
  amount: string;
  isAvailable: boolean;
}

export interface Nutrition {
  protein: number;
  fat: number;
  carbohydrates: number;
}

export interface InstructionStep {
  text: string;
  imagePrompt?: string | null;
  imageUrl?: string;
}

export interface Recipe {
  name: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prepTime: number;
  activeCookingTime?: number;
  calories: number;
  nutrition?: Nutrition;
  ingredients: Ingredient[];
  steps: InstructionStep[];
  imagePrompt: string;
  imageUrl?: string;
  cuisine?: string;
  restrictions?: DietaryFilter[];
}

export enum DietaryFilter {
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  GLUTEN_FREE = 'GLUTEN_FREE',
  KETO = 'KETO',
  LOW_CARB = 'LOW_CARB',
  DAIRY_FREE = 'DAIRY_FREE',
  NUT_FREE = 'NUT_FREE',
  PALEO = 'PALEO',
  PESCATARIAN = 'PESCATARIAN',
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  completed: boolean;
}