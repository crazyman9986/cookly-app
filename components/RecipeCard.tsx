
import React from 'react';
import { Recipe } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { FlameIcon } from './icons/FlameIcon';
import { HeartIcon } from './icons/HeartIcon';
import { useLanguage } from '../context/LanguageContext';
import { ShareIcon } from './icons/ShareIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { TagIcon } from './icons/TagIcon';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onSelect, isFavorite, onToggleFavorite, onShare }) => {
  const { translations } = useLanguage();
  const difficultyStyles: { [key in Recipe['difficulty']]: string } = {
    Easy: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    Hard: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };

  // Estimate active cooking time if not provided, assuming ~5 minutes per step.
  const estimatedCookingTime = recipe.steps.length * 5;
  const totalTime = recipe.prepTime + (recipe.activeCookingTime || estimatedCookingTime);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare();
  };

  return (
    <div 
      className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden hover:shadow-xl dark:hover:shadow-slate-700/50 transition-shadow duration-300 cursor-pointer flex flex-col group"
      onClick={onSelect}
      aria-label={`View recipe for ${recipe.name}`}
    >
      <div className="relative aspect-video w-full">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={`A dish of ${recipe.name}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-slate-700 animate-pulse flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"></path></svg>
          </div>
        )}
        <button
          onClick={handleShareClick}
          className="absolute top-3 left-3 p-2 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all duration-200"
          aria-label="Share recipe"
        >
          <ShareIcon className="w-5 h-5" />
        </button>
        <button 
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 ${isFavorite ? 'bg-red-500 text-white' : 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700'}`}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <HeartIcon isFilled={isFavorite} className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 flex-grow flex flex-col">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">{recipe.name}</h3>
          <p className="text-gray-600 dark:text-slate-400 text-sm">{recipe.description}</p>
        </div>
        
        <div className="mt-auto pt-4">
          {(recipe.cuisine || (recipe.restrictions && recipe.restrictions.length > 0)) && (
            <div className="flex flex-wrap gap-2 mb-4 text-xs">
              {recipe.cuisine && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 rounded-full font-medium">
                  <GlobeIcon className="w-3.5 h-3.5" />
                  <span>{recipe.cuisine}</span>
                </div>
              )}
              {recipe.restrictions?.map(restriction => (
                <div key={restriction} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 rounded-full font-medium">
                  <TagIcon className="w-3.5 h-3.5" />
                  <span>{translations.dietaryFilters[restriction]}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700 pt-4">
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400"/>
              <span>{totalTime} min total</span>
            </div>
            <div className="flex items-center space-x-2">
              <FlameIcon className="w-5 h-5 text-red-500 dark:text-red-400"/>
              <span>{recipe.calories} kcal</span>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${difficultyStyles[recipe.difficulty] || 'bg-gray-100 text-gray-800'}`}>
              {recipe.difficulty}
            </span>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-slate-800/50 px-6 py-3 border-t border-gray-200 dark:border-slate-700">
        <div className="text-center w-full py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-indigo-600 dark:text-indigo-300 font-semibold text-sm rounded-lg shadow-sm group-hover:bg-indigo-50 dark:group-hover:bg-slate-600 group-hover:border-indigo-400 dark:group-hover:border-indigo-500 transition-all duration-200">
            {translations.viewRecipeButton}
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;