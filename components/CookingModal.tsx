

import React, { useState, useEffect, useRef } from 'react';
import { Recipe, Ingredient, InstructionStep } from '../types';
import { getIngredientInfo, generateRecipeImage } from '../services/geminiService';
import { XIcon } from './icons/XIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ShoppingCartIcon } from './icons/ShoppingCartIcon';
import { ProteinIcon } from './icons/ProteinIcon';
import { FatIcon } from './icons/FatIcon';
import { CarbsIcon } from './icons/CarbsIcon';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { ClockIcon } from './icons/ClockIcon';
import { FlameIcon } from './icons/FlameIcon';
import { PencilIcon } from './icons/PencilIcon';
import { CheckIcon } from './icons/CheckIcon';
import { HeartIcon } from './icons/HeartIcon';
import { useLanguage } from '../context/LanguageContext';
import { ShareIcon } from './icons/ShareIcon';
import { ResetIcon } from './icons/ResetIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { TagIcon } from './icons/TagIcon';
import { WarningIcon } from './icons/WarningIcon';

interface CookingModalProps {
  recipe: Recipe;
  onClose: () => void;
  onAddToShoppingList: (item: string) => void;
  onUpdateRecipe: (recipe: Recipe) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
}

interface TooltipState {
  visible: boolean;
  content: string | null;
  sources: { uri: string; title: string }[];
  loading: boolean;
  x: number;
  y: number;
  width: number;
}


// A new component to handle on-demand image generation for each step.
const StepImage: React.FC<{
    step: InstructionStep;
    onImageLoaded: (url: string) => void;
  }> = ({ step, onImageLoaded }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const imageRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      let isMounted = true;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && isMounted) {
            // Stop observing after it becomes visible to prevent re-triggering
            observer.disconnect();
  
            if (step.imagePrompt && !step.imageUrl) {
              // Use the new queued image generation
              generateRecipeImage(step.imagePrompt)
                .then(imageUrl => {
                  if (isMounted) {
                    onImageLoaded(imageUrl);
                    setIsLoading(false);
                  }
                })
                .catch(err => {
                  console.error("Failed to generate step image:", err);
                  if (isMounted) {
                    setError(true);
                    setIsLoading(false);
                  }
                });
            } else {
              setIsLoading(false);
            }
          }
        },
        { threshold: 0.1 } // Trigger when 10% of the image placeholder is visible
      );
  
      if (imageRef.current) {
        observer.observe(imageRef.current);
      }
  
      return () => {
        isMounted = false;
        observer.disconnect();
      };
    }, [step.imagePrompt, step.imageUrl, onImageLoaded]);
  
    if (!step.imagePrompt) return null;
  
    if (step.imageUrl) {
      return <img src={step.imageUrl} alt={`Visual for step`} className="w-full aspect-video object-cover rounded-lg shadow-sm" />;
    }
  
    if (error) {
        return (
            <div ref={imageRef} className="w-full aspect-video bg-red-100 dark:bg-red-900/20 rounded-lg flex flex-col items-center justify-center text-center p-4">
                <WarningIcon className="w-8 h-8 text-red-500 dark:text-red-400 mb-2" />
                <p className="text-sm text-red-700 dark:text-red-300">Image generation failed. This might be due to API rate limits.</p>
            </div>
        )
    }
  
    return (
      <div ref={imageRef} className="w-full aspect-video bg-gray-200 dark:bg-slate-700 animate-pulse rounded-lg flex items-center justify-center">
        <svg className="w-10 h-10 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"></path></svg>
      </div>
    );
};


const CookingModal: React.FC<CookingModalProps> = ({ recipe, onClose, onAddToShoppingList, onUpdateRecipe, isFavorite, onToggleFavorite, onShare }) => {
  const [currentlySpeakingIndex, setCurrentlySpeakingIndex] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editedPrepTime, setEditedPrepTime] = useState(String(recipe.prepTime));
  const [editedActiveTime, setEditedActiveTime] = useState(String(recipe.activeCookingTime || ''));
  const { translations, language } = useLanguage();
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, content: null, sources: [], loading: false, x: 0, y: 0, width: 0 });
  const hoverTimeoutRef = useRef<number | null>(null);
  const [addedItems, setAddedItems] = useState<string[]>([]);
  const [editingIngredient, setEditingIngredient] = useState<{ name: string, amount: string } | null>(null);


  const availableIngredients = recipe.ingredients.filter(ing => ing.isAvailable);
  const missingIngredients = recipe.ingredients.filter(ing => !ing.isAvailable);
  
  const difficultyStyles: { [key in Recipe['difficulty']]: string } = {
    Easy: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    Hard: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };

  useEffect(() => {
    setEditedPrepTime(String(recipe.prepTime));
    setEditedActiveTime(String(recipe.activeCookingTime || ''));
    setIsEditingTime(false);
    setAddedItems([]); // Reset added items when the recipe changes
    setEditingIngredient(null);
  }, [recipe.name, recipe.prepTime, recipe.activeCookingTime]);

  const handleSaveTimeChanges = () => {
    const prepTime = parseInt(editedPrepTime, 10);
    const activeCookingTime = parseInt(editedActiveTime, 10);

    if (!isNaN(prepTime) && prepTime >= 0) {
      const updatedRecipe: Recipe = {
        ...recipe,
        prepTime,
        activeCookingTime: !isNaN(activeCookingTime) && activeCookingTime >= 0 ? activeCookingTime : undefined,
      };
      onUpdateRecipe(updatedRecipe);
      setIsEditingTime(false);
    } else {
      console.error("Invalid time input");
    }
  };
  
  const handleCancelTimeEdit = () => {
    setEditedPrepTime(String(recipe.prepTime));
    setEditedActiveTime(String(recipe.activeCookingTime || ''));
    setIsEditingTime(false);
  }

  const handleResetTimeEdit = () => {
    setEditedPrepTime(String(recipe.prepTime));
    setEditedActiveTime(String(recipe.activeCookingTime || ''));
  };

  const currentPrepTime = isEditingTime ? parseInt(editedPrepTime, 10) : recipe.prepTime;
  const currentActiveTime = isEditingTime ? parseInt(editedActiveTime, 10) : recipe.activeCookingTime;
  const estimatedCookingTime = recipe.steps.length * 5;
  const totalTime = (isNaN(currentPrepTime) ? 0 : currentPrepTime) + (currentActiveTime || estimatedCookingTime);

  useEffect(() => {
    const handleVoicesChanged = () => {
      setVoices(speechSynthesis.getVoices());
    };
    speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    handleVoicesChanged();

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
    };
  }, []);
  
  useEffect(() => {
    return () => {
        speechSynthesis.cancel();
    }
  }, [recipe]);

  const handleSpeak = (text: string, index: number) => {
    const isSpeakingThis = speechSynthesis.speaking && currentlySpeakingIndex === index;
    speechSynthesis.cancel();

    if (isSpeakingThis) {
      setCurrentlySpeakingIndex(null);
      return;
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      
      const preferredVoice = voices.find(voice => voice.lang === language && voice.name.toLowerCase().includes('female'));
      utterance.voice = preferredVoice || voices.find(voice => voice.lang === language) || voices.find(voice => voice.lang.startsWith(language.split('-')[0])) || null;
      utterance.rate = 0.85;
      
      utterance.onstart = () => setCurrentlySpeakingIndex(index);
      utterance.onend = () => setCurrentlySpeakingIndex(null);
      utterance.onerror = () => setCurrentlySpeakingIndex(null);

      speechSynthesis.speak(utterance);
    }
  };
  
  const handleIngredientHover = (e: React.MouseEvent, ingredientName: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const target = e.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    setTooltip({
      visible: true,
      content: null,
      sources: [],
      loading: true,
      x: rect.left,
      y: rect.top + window.scrollY, // Use top instead of bottom for upward positioning
      width: rect.width,
    });

    hoverTimeoutRef.current = window.setTimeout(async () => {
      try {
        const info = await getIngredientInfo(ingredientName, language);
        setTooltip(prev => prev.visible ? { ...prev, loading: false, content: info.text, sources: info.sources } : prev);
      } catch (error) {
        console.error(`Failed to fetch ingredient info for ${ingredientName}:`, error);
        setTooltip(prev => ({ ...prev, visible: false }));
      }
    }, 300);
  };

  const handleIngredientLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setTooltip({ visible: false, content: null, sources: [], loading: false, x: 0, y: 0, width: 0 });
  };
  
  const handleAddItemClick = (ingredient: Ingredient) => {
    const itemNameWithAmount = `${ingredient.name} (${ingredient.amount})`;
    onAddToShoppingList(itemNameWithAmount);
    setAddedItems(prev => [...prev, ingredient.name]);
  };

  const handleEditIngredient = (ingredient: Ingredient) => {
    setEditingIngredient({ name: ingredient.name, amount: ingredient.amount });
  };

  const handleCancelEdit = () => {
      setEditingIngredient(null);
  };

  const handleSaveIngredient = () => {
      if (!editingIngredient || !editingIngredient.amount.trim()) {
          handleCancelEdit();
          return;
      }

      const updatedIngredients = recipe.ingredients.map(ing => {
          if (ing.name === editingIngredient.name) {
              return { ...ing, amount: editingIngredient.amount };
          }
          return ing;
      });

      onUpdateRecipe({ ...recipe, ingredients: updatedIngredients });
      setEditingIngredient(null);
  };

  const renderIngredient = (ing: Ingredient, type: 'available' | 'missing') => {
    const isEditing = editingIngredient?.name === ing.name;

    const baseClasses = {
        name: type === 'available' ? 'text-gray-700 dark:text-slate-300' : 'font-semibold text-red-700 dark:text-red-300',
        amount: type === 'available' ? 'text-gray-500 dark:text-slate-400' : 'text-red-600 dark:text-red-400',
        hover: type === 'available' ? 'hover:text-indigo-600 dark:hover:text-indigo-300' : 'hover:text-red-800 dark:hover:text-red-200',
        decoration: type === 'available' ? 'decoration-indigo-400' : 'decoration-red-400',
    }

    return (
        <div className="flex justify-between items-center py-1 group">
            {isEditing ? (
                <>
                    <div className="flex-grow flex items-center gap-2">
                        <span className={`${baseClasses.name}`}>{ing.name}</span>
                        <input
                            type="text"
                            value={editingIngredient.amount}
                            onChange={(e) => setEditingIngredient({ ...editingIngredient, amount: e.target.value })}
                            className="w-24 p-1 text-sm rounded border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-600 dark:text-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveIngredient();
                                if (e.key === 'Escape') handleCancelEdit();
                            }}
                        />
                    </div>
                    <div className="flex items-center">
                        <button onClick={handleSaveIngredient} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-full" aria-label="Save quantity">
                            <CheckIcon className="w-5 h-5" />
                        </button>
                        <button onClick={handleCancelEdit} className="p-2 text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full" aria-label="Cancel edit">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex-grow">
                        <span onMouseEnter={(e) => handleIngredientHover(e, ing.name)} onMouseLeave={handleIngredientLeave} className={`cursor-help underline decoration-dotted ${baseClasses.decoration} ${baseClasses.hover} ${baseClasses.name}`}>
                            {ing.name}
                        </span>
                        <span className={`${baseClasses.amount} text-sm ml-2`}>({ing.amount})</span>
                    </div>
                    <button onClick={() => handleEditIngredient(ing)} className="p-2 text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Edit quantity">
                        <PencilIcon className="w-4 h-4" />
                    </button>
                </>
            )}
        </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={(e) => { if(e.target === e.currentTarget) onClose()}}>
        {tooltip.visible && (
            <div
            className="fixed bg-gray-800 text-white p-3 rounded-lg shadow-xl z-[60] text-sm animate-fade-in"
            style={{ 
                bottom: `calc(100% - ${tooltip.y}px + 8px)`,
                left: `${tooltip.x + tooltip.width / 2}px`,
                transform: 'translateX(-50%)',
                maxWidth: '320px',
                width: 'max-content'
            }}
            >
            {tooltip.loading ? (
                <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Fetching info...</span>
                </div>
            ) : (
                <div>
                <p className="leading-relaxed">{tooltip.content}</p>
                {tooltip.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-600">
                    <h5 className="font-bold text-xs text-gray-400 mb-1">Sources:</h5>
                    <ul className="space-y-1 text-xs">
                        {tooltip.sources.slice(0, 2).map((source, i) => (
                        <li key={i} className="truncate">
                            <a 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-300 hover:underline"
                            >
                            {source.title || new URL(source.uri).hostname}
                            </a>
                        </li>
                        ))}
                    </ul>
                    </div>
                )}
                </div>
            )}
            <div className="absolute top-full left-1/2 w-0 h-0 -ml-2 border-x-8 border-x-transparent border-t-8 border-t-gray-800"></div>
            </div>
        )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex-grow">{recipe.name}</h2>
          <div className="flex items-center gap-2">
            <button
                onClick={onShare}
                className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
                aria-label="Share this recipe"
            >
                <ShareIcon className="w-6 h-6"/>
            </button>
            <button 
              onClick={onToggleFavorite}
              className={`p-2 rounded-full transition-colors duration-200 ${isFavorite ? 'text-red-500 bg-red-100 dark:bg-red-500/20' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
              aria-label={isFavorite ? translations.removeFromFavorites : translations.addToFavorites}
            >
              <HeartIcon isFilled={isFavorite} className="w-6 h-6"/>
            </button>
            <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
              <XIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg flex items-start justify-around text-center border border-gray-200 dark:border-slate-700">
            <div className="flex flex-col items-center w-1/3">
              <ClockIcon className="w-7 h-7 text-indigo-500 dark:text-indigo-400 mb-1" />
              <span className="font-bold text-xl text-gray-800 dark:text-slate-100">{totalTime}</span>
              <span className="text-sm text-gray-500 dark:text-slate-400">{translations.minsTotal}</span>
            </div>
            <div className="flex flex-col items-center w-1/3 pt-1">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full mb-2 ${difficultyStyles[recipe.difficulty]}`}>
                {recipe.difficulty}
              </span>
              <span className="text-sm text-gray-500 dark:text-slate-400">{translations.difficulty}</span>
            </div>
            <div className="flex flex-col items-center w-1/3">
              <FlameIcon className="w-7 h-7 text-red-500 dark:text-red-400 mb-1" />
              <span className="font-bold text-xl text-gray-800 dark:text-slate-100">{recipe.calories}</span>
              <span className="text-sm text-gray-500 dark:text-slate-400">{translations.kcal}</span>
            </div>
          </div>
          
          {(recipe.cuisine || (recipe.restrictions && recipe.restrictions.length > 0)) && (
            <div className="mb-6 -mt-2 flex flex-wrap items-center justify-start gap-2 px-1">
              {recipe.cuisine && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 rounded-full text-sm font-medium">
                  <GlobeIcon className="w-4 h-4" />
                  <span>{recipe.cuisine}</span>
                </div>
              )}
              {recipe.restrictions?.map(restriction => (
                <div key={restriction} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 rounded-full text-sm font-medium">
                  <TagIcon className="w-4 h-4" />
                  <span>{translations.dietaryFilters[restriction]}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">{translations.timings}</h3>
              {!isEditingTime ? (
                  <button onClick={() => setIsEditingTime(true)} className="p-2 text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-full" aria-label="Edit timings">
                    <PencilIcon className="w-4 h-4"/>
                  </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button onClick={handleSaveTimeChanges} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-full" aria-label="Save changes">
                    <CheckIcon className="w-5 h-5" />
                  </button>
                  <button onClick={handleResetTimeEdit} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-full" aria-label={translations.resetTimingsButton}>
                    <ResetIcon className="w-4 h-4" />
                  </button>
                  <button onClick={handleCancelTimeEdit} className="p-2 text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full" aria-label="Cancel editing">
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-700 space-y-3">
              {isEditingTime ? (
                <>
                  <div className="flex justify-between items-center">
                    <label htmlFor="prepTime" className="text-gray-600 dark:text-slate-300">{translations.prepTimeLabel}:</label>
                    <input 
                      id="prepTime"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editedPrepTime}
                      onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d+$/.test(value)) {
                            setEditedPrepTime(value);
                          }
                      }}
                      className="w-24 p-1 text-right rounded border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-600 dark:text-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label htmlFor="activeCookingTime" className="text-gray-600 dark:text-slate-300">{translations.activeCookingTimeLabel}:</label>
                    <input 
                      id="activeCookingTime"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editedActiveTime}
                      onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d+$/.test(value)) {
                            setEditedActiveTime(value);
                          }
                      }}
                      placeholder="e.g., 15"
                      className="w-24 p-1 text-right rounded border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-600 dark:text-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-300">{translations.prepTime}:</span>
                    <span className="font-semibold text-gray-800 dark:text-slate-200">{recipe.prepTime} {translations.mins}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-300">{translations.activeCookingTime}:</span>
                    <span className="font-semibold text-gray-800 dark:text-slate-200">{recipe.activeCookingTime ? `${recipe.activeCookingTime} ${translations.mins}` : `~${estimatedCookingTime} ${translations.mins} (${translations.estimated})`}</span>
                  </div>
                </>
              )}
               <div className="border-t border-gray-200 dark:border-slate-600 my-2"></div>
               <div className="flex justify-between items-center font-bold">
                 <span className="text-gray-700 dark:text-slate-200">{translations.totalTime}:</span>
                 <span className="text-indigo-600 dark:text-indigo-400">{totalTime} {translations.mins}</span>
               </div>
            </div>
          </div>
          
          {recipe.nutrition && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-slate-200">{translations.nutrition}</h3>
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-around text-center border border-gray-200 dark:border-slate-700">
                <div className="flex flex-col items-center w-1/3">
                  <ProteinIcon className="w-7 h-7 text-red-500 dark:text-red-400 mb-1" />
                  <span className="font-bold text-xl text-gray-800 dark:text-slate-100">{recipe.nutrition.protein}g</span>
                  <span className="text-sm text-gray-500 dark:text-slate-400">{translations.protein}</span>
                </div>
                <div className="flex flex-col items-center w-1/3 border-x border-gray-200 dark:border-slate-600">
                  <FatIcon className="w-7 h-7 text-yellow-500 dark:text-yellow-400 mb-1" />
                  <span className="font-bold text-xl text-gray-800 dark:text-slate-100">{recipe.nutrition.fat}g</span>
                  <span className="text-sm text-gray-500 dark:text-slate-400">{translations.fat}</span>
                </div>
                <div className="flex flex-col items-center w-1/3">
                  <CarbsIcon className="w-7 h-7 text-green-500 dark:text-green-400 mb-1" />
                  <span className="font-bold text-xl text-gray-800 dark:text-slate-100">{recipe.nutrition.carbohydrates}g</span>
                  <span className="text-sm text-gray-500 dark:text-slate-400">{translations.carbs}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-slate-200">{translations.ingredients}</h3>
            
            {availableIngredients.length > 0 && (
              <div className="mb-4">
                  <h4 className="text-md font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center">
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      {translations.youHave}
                  </h4>
                  <div className="space-y-1 pl-7">
                      {availableIngredients.map((ing, i) => (
                          <div key={`avail-${i}`}>{renderIngredient(ing, 'available')}</div>
                      ))}
                  </div>
              </div>
            )}

            {missingIngredients.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center">
                    <ShoppingCartIcon className="w-5 h-5 mr-2" />
                    {translations.youNeed}
                </h4>
                <ul className="space-y-2">
                  {missingIngredients.map((ing, i) => {
                    const isAdded = addedItems.includes(ing.name);
                    const isEditingThis = editingIngredient?.name === ing.name;
                    return (
                        <li key={`miss-${i}`} className="flex justify-between items-center bg-red-50/60 dark:bg-red-900/20 p-3 rounded-lg">
                            <div className="flex-grow">{renderIngredient(ing, 'missing')}</div>
                            {!isEditingThis && (
                                <div className="ml-4">
                                    {isAdded ? (
                                        <button 
                                            disabled
                                            className="text-sm bg-green-100 dark:bg-green-500/30 text-green-700 dark:text-green-300 font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-not-allowed"
                                        >
                                            <CheckIcon className="w-4 h-4"/>
                                            <span>{translations.itemAddedButton}</span>
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleAddItemClick(ing)}
                                            className="text-sm bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-500/50 font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors"
                                        >
                                            <PlusIcon className="w-4 h-4"/>
                                            <span>{translations.addToListButton}</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                   })}
                </ul>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">{translations.instructions}</h3>
            </div>
            <ol className="space-y-4">
              {recipe.steps.map((step, i) => (
                <li key={i} className={`p-3 rounded-lg transition-colors duration-300 ${currentlySpeakingIndex === i ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="h-8 w-8 flex-shrink-0 flex items-center justify-center bg-indigo-500 text-white font-bold rounded-full">{i + 1}</span>
                    <p className="flex-grow pt-1 text-gray-800 dark:text-slate-300 leading-relaxed">{step.text}</p>
                    <button
                      onClick={() => handleSpeak(step.text, i)}
                      className={`p-2 rounded-full transition-colors flex-shrink-0 ${currentlySpeakingIndex === i ? 'text-red-500 bg-red-100 dark:bg-red-500/20' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                      aria-label={`Read step ${i + 1} aloud`}
                      disabled={!('speechSynthesis' in window) || voices.length === 0}
                    >
                      <SpeakerIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mt-3 ml-11">
                    <StepImage 
                       step={step}
                       onImageLoaded={(url) => {
                           const newSteps = [...recipe.steps];
                           newSteps[i] = { ...newSteps[i], imageUrl: url };
                           onUpdateRecipe({ ...recipe, steps: newSteps });
                       }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookingModal;
