import React, { useState, useMemo } from 'react';
import { DietaryFilter, ShoppingListItem } from '../types';
import ShoppingList from './ShoppingList';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { SearchIcon } from './icons/SearchIcon';
import { HeartIcon } from './icons/HeartIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ResetIcon } from './icons/ResetIcon';
import { useLanguage } from '../context/LanguageContext';

interface FilterSidebarProps {
  shoppingList: ShoppingListItem[];
  onUpdateShoppingListItem: (item: ShoppingListItem) => void;
  onRemoveShoppingListItem: (itemId: string) => void;
  onAddToShoppingList: (itemName: string) => void;
  isLoading: boolean;
  // Filter props
  activeFilters: DietaryFilter[];
  onFilterChange: (filter: DietaryFilter) => void;
  selectedCuisines: string[];
  onCuisineToggle: (cuisine: string) => void;
  onClearFilters: () => void;
  // View management
  view: 'suggestions' | 'favorites';
  setView: (view: 'suggestions' | 'favorites') => void;
  favoriteCount: number;
}

const dietaryFilters = Object.values(DietaryFilter);
const popularCuisines = [
  'African', 'American', 'Argentinian', 'Australian', 'Austrian', 'Azerbaijani',
  'Bangladeshi', 'Belgian', 'Brazilian', 'British', 'Cajun', 'Canadian',
  'Caribbean', 'Chinese', 'Cuban', 'Dutch', 'Egyptian', 'Ethiopian', 'Filipino',
  'French', 'German', 'Greek', 'Hungarian', 'Indian', 'Indonesian', 'Irish',
  'Israeli', 'Italian', 'Jamaican', 'Japanese', 'Korean', 'Lebanese',
  'Malaysian', 'Mediterranean', 'Mexican', 'Middle Eastern', 'Moroccan',
  'Pakistani', 'Persian', 'Peruvian', 'Polish', 'Portuguese', 'Russian',
  'Scandinavian', 'Singaporean', 'South American', 'Spanish', 'Swedish',
  'Swiss', 'Taiwanese', 'Thai', 'Turkish', 'Vietnamese'
];


type ActiveTab = 'filters' | 'shopping';

const FilterSidebar: React.FC<FilterSidebarProps> = ({ 
    shoppingList, 
    onUpdateShoppingListItem, 
    onRemoveShoppingListItem,
    onAddToShoppingList,
    isLoading, 
    activeFilters, 
    onFilterChange, 
    selectedCuisines,
    onCuisineToggle,
    onClearFilters,
    view,
    setView,
    favoriteCount,
}) => {
  const [activeSidebarTab, setActiveSidebarTab] = useState<ActiveTab>('filters');
  const [cuisineSearch, setCuisineSearch] = useState('');
  const [openSections, setOpenSections] = useState({
    restrictions: true,
    cuisine: true,
  });
  const { translations } = useLanguage();

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const translatedCuisines = useMemo(() => popularCuisines.map(cuisine => {
    const key = cuisine.replace(/ /g, '').replace(/-/g, '');
    return {
      key: cuisine,
      name: translations.cuisines[key] || cuisine,
    }
  }), [translations.cuisines]);

  const filteredCuisines = translatedCuisines.filter(c =>
    c.name.toLowerCase().includes(cuisineSearch.toLowerCase())
  );

  const handleSetView = (newView: 'suggestions' | 'favorites') => {
    setView(newView);
    if (newView === 'suggestions') {
        setActiveSidebarTab('filters');
    }
  };

  const showClearButton = activeFilters.length > 0 || selectedCuisines.length > 0;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg sticky top-24">
      <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6">
        <button 
          onClick={() => handleSetView('suggestions')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${view === 'suggestions' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
          aria-pressed={view === 'suggestions'}
        >
          <BookOpenIcon className="w-5 h-5"/>
          {translations.recipesTab}
        </button>
        <button 
          onClick={() => handleSetView('favorites')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${view === 'favorites' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
          aria-pressed={view === 'favorites'}
        >
          <HeartIcon className="w-5 h-5"/>
          {translations.favoritesTab}
          {favoriteCount > 0 && (
            <span className="ml-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold px-2 py-0.5 rounded-full">{favoriteCount}</span>
          )}
        </button>
      </div>
      
       <div className="flex justify-center bg-gray-100 dark:bg-slate-700 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveSidebarTab('filters')}
          className={`px-4 py-2 text-sm font-medium rounded-md w-1/2 transition-colors ${activeSidebarTab === 'filters' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow' : 'text-gray-600 dark:text-slate-300'}`}
        >
          {translations.filtersTab}
        </button>
        <button
          onClick={() => setActiveSidebarTab('shopping')}
          className={`px-4 py-2 text-sm font-medium rounded-md w-1/2 transition-colors flex items-center justify-center gap-2 ${activeSidebarTab === 'shopping' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow' : 'text-gray-600 dark:text-slate-300'}`}
        >
          {translations.shoppingTab}
          {shoppingList.length > 0 && (
            <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold px-2 py-0.5 rounded-full">{shoppingList.length}</span>
          )}
        </button>
      </div>


      {activeSidebarTab === 'filters' && (
        <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
          
          {showClearButton && !isLoading && (
            <button
              onClick={onClearFilters}
              className="w-full mb-4 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center justify-center gap-2 p-2 rounded-md hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ResetIcon className="w-4 h-4" />
              {translations.clearFiltersButton}
            </button>
          )}

          {/* Restrictions Accordion */}
          <div className="border-b border-gray-200 dark:border-slate-700 pb-4">
            <button onClick={() => toggleSection('restrictions')} className="w-full flex justify-between items-center py-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{translations.restrictionsTitle}</h3>
              <ChevronDownIcon className={`w-5 h-5 text-gray-500 dark:text-slate-400 transition-transform ${openSections.restrictions ? 'rotate-180' : ''}`} />
            </button>
            {openSections.restrictions && (
              <div className="pt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                {dietaryFilters.map((filter) => (
                  <label key={filter} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeFilters.includes(filter)}
                      onChange={() => onFilterChange(filter)}
                      className="h-5 w-5 rounded border-gray-300 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500 bg-gray-100 dark:bg-slate-600 dark:focus:ring-offset-slate-800"
                    />
                    <span className="text-gray-700 dark:text-slate-300">{translations.dietaryFilters[filter]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Cuisine Accordion */}
          <div className="pt-4">
            <button onClick={() => toggleSection('cuisine')} className="w-full flex justify-between items-center py-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{translations.cuisineTitle}</h3>
              <ChevronDownIcon className={`w-5 h-5 text-gray-500 dark:text-slate-400 transition-transform ${openSections.cuisine ? 'rotate-180' : ''}`} />
            </button>
            {openSections.cuisine && (
              <div className="pt-4">
                <div className="relative mb-3">
                  <input
                      type="text"
                      placeholder={translations.searchCuisinesPlaceholder}
                      value={cuisineSearch}
                      onChange={(e) => setCuisineSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      aria-label="Search for a cuisine type"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-slate-400">
                      <SearchIcon className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredCuisines.map(cuisine => (
                      <button
                          key={cuisine.key}
                          onClick={() => onCuisineToggle(cuisine.key)}
                          className={`px-3 py-1 text-sm font-medium rounded-full border transition-colors duration-200 ${
                              selectedCuisines.includes(cuisine.key)
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white dark:bg-slate-600 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-500 hover:bg-gray-100 dark:hover:bg-slate-500'
                          }`}
                      >
                          {cuisine.name}
                      </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSidebarTab === 'shopping' && <ShoppingList items={shoppingList} onUpdate={onUpdateShoppingListItem} onRemove={onRemoveShoppingListItem} onAdd={onAddToShoppingList} />}
    </div>
  );
};

export default FilterSidebar;