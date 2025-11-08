import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PlusIcon } from './icons/PlusIcon';

interface ManualIngredientInputProps {
  onAdd: (ingredient: string) => void;
}

const ManualIngredientInput: React.FC<ManualIngredientInputProps> = ({ onAdd }) => {
  const [inputValue, setInputValue] = useState('');
  const { translations } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      onAdd(trimmedValue);
      setInputValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 justify-center max-w-lg mx-auto">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={translations.addIngredientPlaceholder}
        className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400"
        aria-label={translations.addIngredientPlaceholder}
      />
      <button
        type="submit"
        className="bg-indigo-600 text-white font-bold py-3 px-5 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors flex items-center gap-2"
        disabled={!inputValue.trim()}
        aria-label={translations.addButton}
      >
        <PlusIcon className="w-5 h-5" />
        <span>{translations.addButton}</span>
      </button>
    </form>
  );
};

export default ManualIngredientInput;