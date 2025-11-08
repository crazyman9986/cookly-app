import React, { useState, useCallback, useEffect, useRef } from 'react';
import { analyzeFridge, getRecipes, generateRecipeImage, validateIngredients, translateRecipes, validateImageContent } from './services/geminiService';
import { Recipe, DietaryFilter, ShoppingListItem } from './types';
import ImageUploader from './components/ImageUploader';
import FilterSidebar from './components/FilterSidebar';
import RecipeCard from './components/RecipeCard';
import CookingModal from './components/CookingModal';
import FavoritesView from './components/FavoritesView';
import Header from './components/Header';
import { useLanguage } from './context/LanguageContext';
import ManualIngredientInput from './components/ManualIngredientInput';
import { XIcon } from './components/icons/XIcon';
import { WarningIcon } from './components/icons/WarningIcon';

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeFilters, setActiveFilters] = useState<DietaryFilter[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState<'validating' | 'ingredients' | 'recipes' | false>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [view, setView] = useState<'suggestions' | 'favorites'>('suggestions');
  const [notification, setNotification] = useState<string | null>(null);
  const { language, translations } = useLanguage();
  const prevLanguageRef = useRef(language);

  // Load favorites from localStorage on initial render
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem('favoriteRecipes');
      if (storedFavorites) {
        setFavoriteRecipes(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error("Could not load favorite recipes from localStorage", error);
    }
  }, []);

  // Handle incoming shared recipe links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recipeData = params.get('recipe');

    if (recipeData) {
        try {
            // Decode from base64 and then from URI component to handle UTF-8 characters
            const decodedString = decodeURIComponent(escape(atob(recipeData)));
            const recipe = JSON.parse(decodedString) as Recipe;
            setSelectedRecipe(recipe);

            // Clean the URL to prevent re-opening on refresh
            const url = new URL(window.location.href);
            url.searchParams.delete('recipe');
            window.history.replaceState({}, '', url.toString());
        } catch (error) {
            console.error('Failed to parse shared recipe:', error);
            setError('The shared recipe link is invalid or corrupted.');
        }
    }
  }, []); // Run only once on mount

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    try {
      // Create a version of favorites without large image data to avoid exceeding localStorage quota.
      const favoritesToStore = favoriteRecipes.map(recipe => {
        const { imageUrl, steps, ...restOfRecipe } = recipe;
        const cleanedSteps = steps.map(step => {
          const { imageUrl: stepImageUrl, ...restOfStep } = step;
          return restOfStep;
        });
        return { ...restOfRecipe, steps: cleanedSteps };
      });
      localStorage.setItem('favoriteRecipes', JSON.stringify(favoritesToStore));
    } catch (error) {
      console.error("Could not save favorite recipes to localStorage", error);
    }
  }, [favoriteRecipes]);

  // When switching to favorites view, generate missing main recipe images for the cards.
  useEffect(() => {
    if (view === 'favorites') {
      const recipesToUpdate = favoriteRecipes.filter(r => !r.imageUrl && r.imagePrompt);
      
      recipesToUpdate.forEach(recipe => {
        generateRecipeImage(recipe.imagePrompt)
          .then(imageUrl => {
            setFavoriteRecipes(prevFavorites => 
              prevFavorites.map(favRecipe => 
                favRecipe.name === recipe.name ? { ...favRecipe, imageUrl } : favRecipe
              )
            );
          })
          .catch(err => {
            console.error(`Failed to generate favorite image for "${recipe.name}":`, err);
          });
      });
    }
    // This effect should only run when the user navigates to the favorites view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);


  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      // Do not clear ingredients on new image upload, allow merging.
      // setIngredients([]); 
      setRecipes([]);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFetchRecipes = useCallback(async (currentIngredients: string[], currentFilters: DietaryFilter[], currentCuisines: string[]) => {
    if (currentIngredients.length === 0) {
        setRecipes([]);
        return;
    }
    
    setIsLoading('recipes');
    setError(null);
    setView('suggestions');

    try {
      const suggestedRecipes = await getRecipes(currentIngredients, currentFilters, currentCuisines, language);
      setRecipes(suggestedRecipes); // Display recipes with text first

      // Then, generate and update images in parallel
      suggestedRecipes.forEach(recipe => {
        if (!recipe.imagePrompt) return;
        
        generateRecipeImage(recipe.imagePrompt)
          .then(imageUrl => {
            setRecipes(prevRecipes => 
              prevRecipes.map(r => r.name === recipe.name ? { ...r, imageUrl } : r)
            );
          })
          .catch(err => {
            console.error(`Failed to generate image for "${recipe.name}":`, err);
          });
      });
    } catch (err) {
      console.error(err);
      setError(translations.errorFetch);
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  }, [language, translations]);

  const handleAnalyzeFridge = useCallback(async () => {
    if (!image) return;
    setIsLoading('validating');
    setError(null);
    setView('suggestions'); // Switch back to suggestions view on new analysis
    try {
      const base64Data = image.split(',')[1];
      
      // Validate image content first
      const validation = await validateImageContent(base64Data, language);
      if (!validation.isFood) {
        setError(validation.reason || translations.errorImageValidation);
        setIsLoading(false);
        return;
      }

      setIsLoading('ingredients');
      const foundIngredients = await analyzeFridge(base64Data);
      const allIngredients = Array.from(new Set([...ingredients, ...foundIngredients]));
      setIngredients(allIngredients);
      await handleFetchRecipes(allIngredients, activeFilters, selectedCuisines);
    } catch (err) {
      console.error(err);
      setError(translations.errorAnalyze);
      setIsLoading(false);
    }
  }, [image, ingredients, activeFilters, selectedCuisines, translations, handleFetchRecipes, language]);
  
  const performSearch = useCallback(async (cuisines: string[], dietary: DietaryFilter[]) => {
    if (ingredients.length === 0) return;
    
    setIsValidating(true);
    setError(null);
    setRecipes([]);

    try {
      const validationResult = await validateIngredients(ingredients, language);
      if (validationResult.isValid) {
        await handleFetchRecipes(ingredients, dietary, cuisines);
      } else {
        const errorMessage = `${translations.errorInvalidIngredients} ${validationResult.invalidItems.join(', ')}`;
        setError(errorMessage);
      }
    } catch (err) {
      console.error("Validation or fetch error:", err);
      setError(translations.errorFetch);
    } finally {
      setIsValidating(false);
    }
  }, [ingredients, language, handleFetchRecipes, translations]);

  const handleSearchClick = useCallback(() => {
    performSearch(selectedCuisines, activeFilters);
  }, [performSearch, selectedCuisines, activeFilters]);

  const handleManualAddIngredient = useCallback((ingredientName: string) => {
    const newIngredients = Array.from(new Set([...ingredients, ingredientName.trim()]));
    setIngredients(newIngredients);
    setRecipes([]); // Clear recipes, require explicit search
    setError(null); // Clear errors
  }, [ingredients]);

  const handleRemoveIngredient = useCallback((ingredientToRemove: string) => {
    const newIngredients = ingredients.filter((ing) => ing !== ingredientToRemove);
    setIngredients(newIngredients);
    setRecipes([]); // Clear recipes, require explicit search
    setError(null);
  }, [ingredients]);
  
  // Translates existing recipe content when the language changes.
  useEffect(() => {
    const languageChanged = prevLanguageRef.current !== language;
    if (!languageChanged) {
        return;
    }

    const performTranslations = async () => {
        try {
            const [translatedRecipes, translatedFavorites, translatedSelectedResult] = await Promise.all([
                recipes.length > 0 ? translateRecipes(recipes, language) : Promise.resolve(null),
                favoriteRecipes.length > 0 ? translateRecipes(favoriteRecipes, language) : Promise.resolve(null),
                selectedRecipe ? translateRecipes([selectedRecipe], language) : Promise.resolve(null)
            ]);

            if (translatedRecipes) {
                setRecipes(translatedRecipes);
            }
            if (translatedFavorites) {
                setFavoriteRecipes(translatedFavorites);
            }
            if (translatedSelectedResult && translatedSelectedResult.length > 0) {
                setSelectedRecipe(translatedSelectedResult[0]);
            }
        } catch (err) {
            console.error("Failed to translate recipes on language change:", err);
            setError(translations.errorFetch);
        }
    };

    performTranslations();
    prevLanguageRef.current = language;
  // The dependencies are correct as they are, to prevent stale closures.
  // The guard clause at the top prevents infinite loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, translations.errorFetch]);
  

  const handleFilterChange = useCallback((filter: DietaryFilter) => {
    const newFilters = activeFilters.includes(filter)
      ? activeFilters.filter((f) => f !== filter)
      : [...activeFilters, filter];
    setActiveFilters(newFilters);
    // Do not auto-fetch. User must click search.
    setRecipes([]);
  }, [activeFilters]);

  const handleCuisineToggle = useCallback((cuisine: string) => {
    const newCuisines = selectedCuisines.includes(cuisine)
      ? selectedCuisines.filter((c) => c !== cuisine)
      : [...selectedCuisines, cuisine];
    setSelectedCuisines(newCuisines);
    // Do not auto-fetch.
    setRecipes([]);
  }, [selectedCuisines]);
  
  const handleClearFilters = useCallback(() => {
    setActiveFilters([]);
    setSelectedCuisines([]);
    // Do not auto-fetch.
    setRecipes([]);
  }, []);

  const handleAddToShoppingList = useCallback((itemName: string) => {
    setShoppingList((prevList) => {
      const existingItem = prevList.find(
        (item) => item.name.toLowerCase() === itemName.toLowerCase()
      );
  
      if (!existingItem) {
        const newItem: ShoppingListItem = {
          id: `${Date.now()}-${itemName.replace(/\s/g, '-')}`,
          name: itemName,
          quantity: 1,
          completed: false,
        };
        return [...prevList, newItem];
      }
      return prevList;
    });
  }, []);

  const handleUpdateShoppingListItem = (updatedItem: ShoppingListItem) => {
    setShoppingList((prevList) =>
      prevList.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleRemoveShoppingListItem = (itemId: string) => {
    setShoppingList((prevList) => prevList.filter((item) => item.id !== itemId));
  };
  
  const handleUpdateRecipe = (updatedRecipe: Recipe) => {
    setRecipes(prevRecipes => 
      prevRecipes.map(r => (r.name === updatedRecipe.name ? updatedRecipe : r))
    );
    setSelectedRecipe(updatedRecipe);
    setFavoriteRecipes(prevFavorites =>
      prevFavorites.map(r => (r.name === updatedRecipe.name ? updatedRecipe : r))
    );
  };

  const handleToggleFavorite = (recipeToToggle: Recipe) => {
    setFavoriteRecipes(prevFavorites => {
      const isFavorited = prevFavorites.some(r => r.name === recipeToToggle.name);
      if (isFavorited) {
        return prevFavorites.filter(r => r.name !== recipeToToggle.name);
      } else {
        return [...prevFavorites, recipeToToggle];
      }
    });
  };
  
  const handleShareRecipe = useCallback(async (recipe: Recipe) => {
    // Create a copy of the recipe without image URLs to reduce size, as they can make the URL too long.
    const recipeToShare = {
      ...recipe,
      imageUrl: undefined,
      steps: recipe.steps.map(step => {
        const { imageUrl, ...rest } = step;
        return rest;
      })
    };
    const recipeString = JSON.stringify(recipeToShare);
    
    try {
        // Encode to URI components to handle UTF-8, then to base64
        const encodedRecipe = btoa(unescape(encodeURIComponent(recipeString)));
        // Construct a clean URL from origin and pathname to avoid issues with existing query params or invalid base URLs.
        const url = new URL(window.location.pathname, window.location.origin);
        url.searchParams.set('recipe', encodedRecipe);
        const shareUrl = url.toString();

        const shareData = {
            title: `${translations.shareTitlePrefix}${recipe.name}`,
            text: recipe.description,
            url: shareUrl,
        };

        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(shareUrl);
            setNotification(translations.copiedToClipboard);
            setTimeout(() => setNotification(null), 3000);
        }
    } catch (error) {
        console.error('Error creating share link:', error);
        setNotification(translations.shareError);
        setTimeout(() => setNotification(null), 3000);
    }
  }, [translations]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 font-sans relative">
      <Header />
      
      {notification && (
        <div className="fixed top-24 right-5 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg z-[100]">
            {notification}
        </div>
      )}

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4 xl:col-span-3 mb-8 lg:mb-0">
            <FilterSidebar
              shoppingList={shoppingList}
              onUpdateShoppingListItem={handleUpdateShoppingListItem}
              onRemoveShoppingListItem={handleRemoveShoppingListItem}
              onAddToShoppingList={handleAddToShoppingList}
              isLoading={isLoading === 'recipes'}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              selectedCuisines={selectedCuisines}
              onCuisineToggle={handleCuisineToggle}
              onClearFilters={handleClearFilters}
              view={view}
              setView={setView}
              favoriteCount={favoriteRecipes.length}
            />
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            {view === 'favorites' ? (
                <FavoritesView 
                    favoriteRecipes={favoriteRecipes}
                    onSelectRecipe={setSelectedRecipe}
                    onToggleFavorite={handleToggleFavorite}
                    onBrowseRecipes={() => setView('suggestions')}
                    onShareRecipe={handleShareRecipe}
                />
            ) : (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                    <ImageUploader
                        onImageUpload={handleImageUpload}
                        onAnalyze={handleAnalyzeFridge}
                        imagePreview={image}
                        isLoading={isLoading === 'ingredients' || isLoading === 'validating'}
                    />

                    <div className="my-6 text-center">
                        <div className="flex items-center justify-center my-4">
                          <div className="flex-grow border-t border-gray-300 dark:border-slate-600"></div>
                          <span className="flex-shrink mx-4 text-gray-500 dark:text-slate-400 text-sm font-medium">{translations.orAddManually}</span>
                          <div className="flex-grow border-t border-gray-300 dark:border-slate-600"></div>
                        </div>
                        <ManualIngredientInput onAdd={handleManualAddIngredient} />
                    </div>

                    {ingredients.length > 0 && (
                        <div className="mt-6 p-4 bg-indigo-50 dark:bg-slate-700/50 rounded-lg">
                            <h3 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-3">{translations.availableIngredients}:</h3>
                            <div className="flex flex-wrap gap-2">
                                {ingredients.map((ing, i) => (
                                    <div key={i} className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-600 text-indigo-700 dark:text-indigo-200 rounded-full text-sm font-medium border border-indigo-200 dark:border-slate-500 transition-all hover:shadow-sm">
                                        <span>{ing}</span>
                                        <button 
                                            onClick={() => handleRemoveIngredient(ing)} 
                                            className="text-indigo-400 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-white p-0.5 rounded-full hover:bg-indigo-100 dark:hover:bg-slate-500"
                                            aria-label={`Remove ${ing}`}
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-5 text-center">
                                <button
                                    onClick={handleSearchClick}
                                    disabled={isValidating || isLoading === 'recipes'}
                                    className="w-full max-w-md mx-auto bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
                                >
                                    {isValidating ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            {translations.validatingIngredientsButton}
                                        </>
                                    ) : translations.findRecipesWithIngredientsButton}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-500/50 text-red-800 dark:text-red-200 rounded-lg flex items-start gap-3">
                            <div className="flex-shrink-0 pt-0.5">
                                <WarningIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    <div className="mt-8">
                        {isLoading === 'recipes' && recipes.length === 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden animate-pulse">
                                <div className="aspect-video w-full bg-gray-300 dark:bg-slate-700"></div>
                                <div className="p-6">
                                    <div className="h-6 bg-gray-300 dark:bg-slate-600 rounded w-3/4 mb-4"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3 mb-4"></div>
                                    <div className="flex justify-between items-center">
                                        <div className="h-5 bg-gray-300 dark:bg-slate-600 rounded w-1/4"></div>
                                        <div className="h-5 bg-gray-300 dark:bg-slate-600 rounded w-1/4"></div>
                                        <div className="h-5 bg-gray-300 dark:bg-slate-600 rounded w-1/4"></div>
                                    </div>
                                </div>
                            </div>
                            ))}
                        </div>
                        ) : recipes.length > 0 ? (
                        <div>
                            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-slate-100">{translations.recipeSuggestions}</h2>
                            <div className="relative">
                            {isLoading === 'recipes' && (
                                <div className="absolute inset-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                                <svg className="animate-spin h-10 w-10 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {recipes.map((recipe, index) => (
                                <RecipeCard 
                                    key={index} 
                                    recipe={recipe} 
                                    onSelect={() => setSelectedRecipe(recipe)} 
                                    isFavorite={favoriteRecipes.some(r => r.name === recipe.name)}
                                    onToggleFavorite={() => handleToggleFavorite(recipe)}
                                    onShare={() => handleShareRecipe(recipe)}
                                />
                                ))}
                            </div>
                            </div>
                        </div>
                        ) : ingredients.length > 0 && !isLoading && !isValidating && !error && (
                        <div className="text-center py-10 px-6 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                            <p className="text-gray-500 dark:text-slate-400">{translations.noRecipesFound}</p>
                        </div>
                        )}
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>

      {selectedRecipe && (
        <CookingModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onAddToShoppingList={handleAddToShoppingList}
          onUpdateRecipe={handleUpdateRecipe}
          isFavorite={favoriteRecipes.some(r => r.name === selectedRecipe.name)}
          onToggleFavorite={() => handleToggleFavorite(selectedRecipe)}
          onShare={() => handleShareRecipe(selectedRecipe)}
        />
      )}
    </div>
  );
};

export default App;