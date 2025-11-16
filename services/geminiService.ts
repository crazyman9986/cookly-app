
import { GoogleGenAI, Type } from '@google/genai';
import { Recipe, DietaryFilter, Ingredient } from '../types';

// Fix: Per coding guidelines, the API key must be accessed via process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- START: Smart Image Generation Queue ---
const RATE_LIMIT_DELAY = 2000; // 2 seconds between image requests to be polite to the image service.

type QueuedImageRequest = {
  prompt: string;
  resolve: (value: string) => void;
  reject: (reason?: any) => void;
};

const imageGenerationQueue: QueuedImageRequest[] = [];
let isProcessingQueue = false;

const processImageQueue = async () => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (imageGenerationQueue.length > 0) {
    const request = imageGenerationQueue.shift();
    if (request) {
      try {
        const imageUrl = await internalGenerateRecipeImage(request.prompt);
        request.resolve(imageUrl);
      } catch (error) {
        console.error(`Queue: Failed to generate image for prompt "${request.prompt}"`, error);
        request.reject(error);
      } finally {
        // Wait AFTER a request is completed to ensure a delay between them.
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }
  }

  isProcessingQueue = false;
};

/**
 * The new public-facing function to request an image.
 * It adds the request to a queue and returns a promise that will resolve when the image is ready.
 * @param prompt The prompt for the image generation AI.
 * @returns A promise that resolves with the base64 image data URL.
 */
export const generateRecipeImage = (prompt: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    imageGenerationQueue.push({ prompt, resolve, reject });
    processImageQueue(); // Kick off processing if it's not already running.
  });
};

/**
 * The internal function that now constructs a URL for the Unsplash Source API.
 * This removes the dependency on generative AI for images and avoids CORS issues
 * by letting the <img> tag handle the image fetching directly.
 * @param prompt The prompt used to generate keywords for the image search.
 * @returns A promise that resolves with a URL to an image from Unsplash.
 */
const internalGenerateRecipeImage = (prompt: string): Promise<string> => {
    try {
        // Sanitize the prompt to be used as keywords in a URL for Unsplash.
        const keywords = prompt
            .toLowerCase()
            // Remove common generative AI/photo terms
            .replace(/photorealistic|food photography|close-up shot|dynamic shot of|a plate of|a bowl of|delicious|a dish of/g, '')
            // Remove common stop words
            .replace(/\b(and|with|on|of|a|the|in|for)\b/g, '')
            // Remove special characters, keep letters, numbers, spaces
            .replace(/[^a-z0-9\s]/g, '')
            .trim()
            // Replace spaces with commas for the query
            .replace(/\s+/g, ',')
            // Take the first few keywords to keep the query relevant
            .split(',').filter(Boolean).slice(0, 4).join(',');

        // Fallback keywords if prompt becomes empty after sanitization
        const finalKeywords = keywords || 'food,cooking,recipe';

        const encodedKeywords = encodeURIComponent(finalKeywords);
        
        // Add a cache-busting parameter to ensure a fresh image is requested every time.
        // This prevents browsers or networks from caching a failed or incorrect response.
        const cacheBuster = `&sig=${Math.random()}`;
        
        const unsplashUrl = `https://source.unsplash.com/800x450/?${encodedKeywords}${cacheBuster}`;

        return Promise.resolve(unsplashUrl);

    } catch (error) {
        console.error("Failed to construct Unsplash URL:", error);
        // Fallback to a generic placeholder if string processing fails, to avoid breaking the UI.
        const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWFkZWRlIiAvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIzMCIgZmlsbD0iI2FhYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
        return Promise.resolve(placeholder);
    }
};
// --- END: Smart Image Generation Queue ---


const recipeSchema = {
    type: Type.OBJECT,
    properties: {
        recipes: {
            type: Type.ARRAY,
            description: "A list of recipe suggestions",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Recipe title" },
                    description: { type: Type.STRING, description: "Short recipe description" },
                    difficulty: { type: Type.STRING, description: "Difficulty: Easy, Medium, or Hard" },
                    cuisine: { type: Type.STRING, description: "The primary cuisine type of the recipe.", nullable: true },
                    restrictions: {
                        type: Type.ARRAY,
                        description: "A list of dietary restriction keys applicable to the recipe.",
                        items: {
                            type: Type.STRING,
                            enum: Object.values(DietaryFilter)
                        }
                    },
                    prepTime: { type: Type.INTEGER, description: "Prep time in minutes" },
                    activeCookingTime: { type: Type.INTEGER, description: "Active cooking time in minutes" },
                    calories: { type: Type.INTEGER, description: "Calories per serving" },
                    nutrition: {
                        type: Type.OBJECT,
                        description: "Nutritional information per serving.",
                        properties: {
                            protein: { type: Type.INTEGER, description: "Protein in grams" },
                            fat: { type: Type.INTEGER, description: "Fat in grams" },
                            carbohydrates: { type: Type.INTEGER, description: "Carbohydrates in grams" }
                        },
                        required: ["protein", "fat", "carbohydrates"]
                    },
                    ingredients: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "Ingredient name" },
                                amount: { type: Type.STRING, description: "Quantity and unit for the ingredient, e.g., '2 cups', '100g'." },
                                isAvailable: { type: Type.BOOLEAN, description: "Is this ingredient available in the fridge?" }
                            },
                            required: ["name", "amount", "isAvailable"]
                        }
                    },
                    steps: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING, description: "A single cooking step instruction." },
                                imagePrompt: { type: Type.STRING, description: "A prompt for generating an image for this step. Can be null.", nullable: true },
                                imageUrl: { type: Type.STRING, description: "URL of an existing image for the step, if available.", nullable: true }
                            },
                            required: ["text"]
                        }
                    },
                    imagePrompt: { type: Type.STRING, description: "A detailed prompt for generating a food photography image." },
                    imageUrl: { type: Type.STRING, description: "URL of an existing image for the recipe, if available.", nullable: true }
                },
                required: ["name", "description", "difficulty", "prepTime", "calories", "nutrition", "ingredients", "steps", "imagePrompt"]
            }
        }
    },
    required: ["recipes"]
};


export const validateIngredients = async (ingredients: string[], language: string): Promise<{ isValid: boolean; invalidItems: string[] }> => {
  const prompt = `
    You are a food ingredient validation expert. Given the following list of items: [${ingredients.join(', ')}].
    Identify which of these are not plausible food ingredients for cooking a meal.
    Consider typos, but flag things that are clearly not food (e.g., "chair", "asdfghjk", numbers) or are nonsensical.
    Respond in the language "${language}".
    Return your response as a single JSON object with the structure: {"isValid": boolean, "invalidItems": ["item1", "item2", ...]}.
    If all items are valid, "isValid" should be true and "invalidItems" should be an empty array.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN, description: 'Whether the entire list consists of plausible ingredients.' },
          invalidItems: {
            type: Type.ARRAY,
            description: 'A list of items that are not considered valid food ingredients.',
            items: { type: Type.STRING }
          }
        },
        required: ['isValid', 'invalidItems']
      }
    }
  });

  const jsonText = response.text.trim();
  return JSON.parse(jsonText);
};

export const validateImageContent = async (base64ImageData: string, language: string): Promise<{ isFood: boolean; reason: string }> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64ImageData,
    },
  };

  const prompt = `
    Analyze this image. Does it contain one or more clearly identifiable food ingredients suitable for creating a recipe? 
    Ignore non-food items, blurry images, images that are too dark, or images containing only humans or animals without food.
    Respond in the language "${language}".
    Return your response as a single JSON object with the structure: {"isFood": boolean, "reason": "A brief explanation in ${language} if it's not food, or an empty string if it is food."}.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, { text: prompt }] },
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                isFood: { type: Type.BOOLEAN, description: 'Whether the image contains identifiable food ingredients.' },
                reason: { type: Type.STRING, description: 'The reason why the image is not suitable, or an empty string.' }
            },
            required: ["isFood", "reason"]
        }
    }
  });

  const jsonText = response.text.trim();
  const result = JSON.parse(jsonText);
  return result;
};


export const analyzeFridge = async (base64ImageData: string): Promise<string[]> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64ImageData,
    },
  };

  const textPart = {
    text: `Analyze the contents of this refrigerator image and identify all the edible food items. Focus on primary ingredients. Ignore condiments in jars if their labels aren't clear, unless they are prominent. Provide the output as a JSON object with a single key "ingredients", which should be an array of strings. For example: {"ingredients": ["eggs", "milk", "lettuce", "chicken breast"]}.`,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                ingredients: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING, description: "An identified ingredient" }
                }
            },
            required: ["ingredients"]
        }
    }
  });

  const jsonText = response.text.trim();
  const result = JSON.parse(jsonText);
  return result.ingredients || [];
};

export const getRecipes = async (ingredients: string[], filters: DietaryFilter[], cuisines: string[], language: string): Promise<Recipe[]> => {
  const filterDisplayMap: Record<DietaryFilter, string> = {
    [DietaryFilter.VEGETARIAN]: 'Vegetarian',
    [DietaryFilter.VEGAN]: 'Vegan',
    [DietaryFilter.GLUTEN_FREE]: 'Gluten-Free',
    [DietaryFilter.KETO]: 'Keto',
    [DietaryFilter.LOW_CARB]: 'Low-Carb',
    [DietaryFilter.DAIRY_FREE]: 'Dairy-Free',
    [DietaryFilter.NUT_FREE]: 'Nut-Free',
    [DietaryFilter.PALEO]: 'Paleo',
    [DietaryFilter.PESCATARIAN]: 'Pescatarian',
  };
  const englishFilters = filters.map(f => filterDisplayMap[f]);

  const filterPrompt = englishFilters.length > 0
    ? `The user has specified the following dietary restrictions: ${englishFilters.join(', ')}. Please ensure all suggested recipes adhere to these.`
    : '';
  
  const cuisinePrompt = cuisines.length > 0
    ? `The user is also looking for recipes from the following cuisines: "${cuisines.join(', ')}". Please prioritize these types of recipes if possible.`
    : '';
  
  const languageAndQualityPrompt = `
    A critical instruction: you must respond entirely in the language specified by the language code: "${language}".
    This applies to all user-facing text, including "name", "description", "cuisine", the "name" of each ingredient, and the "text" for each step.
    The translation must be of professional quality, adhering strictly to correct grammar, spelling, and natural phrasing that a native speaker would use. Every detail must be translated accurately.

    There is one critical exception: The values for all fields named "imagePrompt" MUST be in English. This is a technical requirement for a separate image generation system. Do not translate the "imagePrompt" fields.
  `;

  const prompt = `
    You are a creative culinary assistant. Based on the following available ingredients: [${ingredients.join(', ')}]. Please suggest up to 4 recipes.
    ${filterPrompt}
    ${cuisinePrompt}
    ${languageAndQualityPrompt}

    For each recipe, provide a detailed JSON object with the following structure:
    - "name": The recipe's title. (MUST be in ${language})
    - "description": A short, enticing description (max 20 words). (MUST be in ${language})
    - "difficulty": A rating of "Easy", "Medium", or "Hard".
    - "cuisine": The primary cuisine type (e.g., "Italian", "Mexican"). If not strongly associated with a cuisine, this can be null. (MUST be in ${language})
    - "restrictions": An array of applicable dietary restriction keys from this list: [${Object.values(DietaryFilter).join(', ')}]. If none apply, provide an empty array.
    - "prepTime": Estimated preparation time in minutes (as a number).
    - "activeCookingTime": Estimated active cooking time in minutes (as a number). This is time spent actively cooking (e.g. stirring, frying) and is separate from passive time like baking or marinating.
    - "calories": Estimated calorie count per serving (as a number).
    - "nutrition": An object with "protein" (in grams), "fat" (in grams), and "carbohydrates" (in grams) per serving.
    - "ingredients": An array of objects, each with "name" (string, MUST be in ${language}), "amount" (string, e.g. "2 cups" or "100g", MUST be in ${language}), and "isAvailable" (boolean, true if it's in the provided ingredient list, case-insensitive).
    - "steps": An array of objects, where each object represents a single step and has "text" (the instruction, MUST be in ${language}) and "imagePrompt" (a concise, dynamic prompt for an image generation AI showing the action in this step. This prompt MUST be in English.). For simple, non-visual steps like 'Preheat oven' or 'Serve immediately', "imagePrompt" should be null.
    - "imagePrompt": A detailed, captivating prompt for a photorealistic food photography image of the final dish. This prompt MUST be in English.

    Return your response as a single JSON object with a key "recipes" containing an array of these recipe objects. Ensure the ingredient names in the "ingredients" array are clean and simple (e.g., "2 cups flour" should be "flour").
    `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema
    }
  });

  const jsonText = response.text.trim();
  const result = JSON.parse(jsonText);
  return result.recipes || [];
};

export const translateRecipes = async (recipes: Recipe[], language: string): Promise<Recipe[]> => {
    if (!recipes || recipes.length === 0) {
      return [];
    }
  
    const prompt = `
      You are a professional translation service. Your task is to translate the user-facing text fields of the provided JSON object containing an array of recipes into the target language code: "${language}".
  
      **CRITICAL INSTRUCTIONS:**
      1.  **Translate ONLY the following fields:** 'name', 'description', 'cuisine', the 'name' of each ingredient in the 'ingredients' array, and the 'text' for each step in the 'steps' array.
      2.  **DO NOT translate or alter any other fields or their values.** Specifically, all fields named "imagePrompt" MUST remain in English. All booleans, numbers (like 'prepTime'), URLs ('imageUrl'), and arrays of keys (like 'restrictions') must be preserved exactly as they are in the input. The 'amount' field for ingredients should also not be translated.
      3.  **Return the FULL JSON object for each recipe, with the same structure, keys, and data types as the input.** The only change should be the translated text in the specified fields.
      4.  The translation must be of professional quality, grammatically correct, and use natural phrasing a native speaker would use.
      5.  **You MUST return the recipes in the exact same order as they were provided in the input.**
  
      Here is the JSON object to translate. It has a single key "recipes" which is an array of recipe objects:
      ${JSON.stringify({ recipes })}
    `;
  
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: recipeSchema
      }
    });
  
    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result.recipes || [];
};

export const translateTexts = async (texts: string[], language: string): Promise<string[]> => {
    if (!texts || texts.length === 0) {
      return [];
    }
    const prompt = `
      You are a professional translation service specializing in culinary terms. Translate the following list of food ingredients into the language with the code "${language}".
      Return the result as a single JSON object with a key "translations" which is an array of the translated strings.
      The order of the translated strings must correspond exactly to the order of the input strings. Do not add any extra commentary or explanation.
      Input list: ${JSON.stringify(texts)}
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translations: {
              type: Type.ARRAY,
              description: "An array of translated strings, in the same order as the input.",
              items: { type: Type.STRING }
            }
          },
          required: ["translations"]
        }
      }
    });
    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    // Fallback to original texts if translation fails to return an array of the same length
    if (Array.isArray(result.translations) && result.translations.length === texts.length) {
      return result.translations;
    }
    return texts;
};

export const getIngredientInfo = async (ingredientName: string, language: string): Promise<{ text: string; sources: any[] }> => {
  const prompt = `
    Provide a brief, helpful summary for the ingredient "${ingredientName}", suitable for a tooltip.
    Include its typical nutritional profile (e.g., key vitamins, minerals, macros) and 1-2 common substitutions.
    The response must be in the language with code "${language}".
    Keep the entire response concise and easy to read, under 50 words.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  // Filter for unique web sources to avoid duplicates
  const uniqueSources = new Map<string, { uri: string; title: string }>();
  groundingChunks.forEach(chunk => {
    if (chunk.web && chunk.web.uri) {
      // FIX: The type of chunk.web is not directly assignable. Create a new object
      // that matches the map's value type, providing a fallback for the optional title.
      uniqueSources.set(chunk.web.uri, { uri: chunk.web.uri, title: chunk.web.title || '' });
    }
  });

  return { text, sources: Array.from(uniqueSources.values()) };
};