import React from 'react';
import { Recipe } from '../types';
import RecipeCard from './RecipeCard';
import { HeartIcon } from './icons/HeartIcon';
import { useLanguage } from '../context/LanguageContext';

interface FavoritesViewProps {
  favoriteRecipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onToggleFavorite: (recipe: Recipe) => void;
  onBrowseRecipes: () => void;
  onShareRecipe: (recipe: Recipe) => void;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({ 
    favoriteRecipes, 
    onSelectRecipe, 
    onToggleFavorite,
    onBrowseRecipes,
    onShareRecipe,
}) => {
  const { translations } = useLanguage();

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{translations.favoritesTitle}</h2>
        {favoriteRecipes.length > 0 && (
             <button 
                onClick={onBrowseRecipes}
                className="mt-3 sm:mt-0 text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
            >
                &larr; {translations.backToSuggestions}
            </button>
        )}
      </div>

      {favoriteRecipes.length === 0 ? (
        <div className="text-center py-16 px-6 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
          <HeartIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-slate-600" />
          <h3 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-slate-200">{translations.favoritesEmptyTitle}</h3>
          <p className="text-gray-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            {translations.favoritesEmptySubtitle}
          </p>
          <button 
            onClick={onBrowseRecipes}
            className="mt-6 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-300"
          >
            {translations.findRecipesNowButton}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {favoriteRecipes.map((recipe) => (
            <RecipeCard 
              key={recipe.name}
              recipe={recipe} 
              onSelect={() => onSelectRecipe(recipe)} 
              isFavorite={true} // It's always a favorite in this view
              onToggleFavorite={() => onToggleFavorite(recipe)}
              onShare={() => onShareRecipe(recipe)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesView;