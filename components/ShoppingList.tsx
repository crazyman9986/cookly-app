import React, { useState } from 'react';
import { ShoppingListItem } from '../types';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { ShoppingCartIcon } from './icons/ShoppingCartIcon';
import { useLanguage } from '../context/LanguageContext';
import { PlusIcon } from './icons/PlusIcon';

interface ShoppingListProps {
  items: ShoppingListItem[];
  onUpdate: (item: ShoppingListItem) => void;
  onRemove: (itemId: string) => void;
  onAdd: (itemName: string) => void;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ items, onUpdate, onRemove, onAdd }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<{ name: string; quantity: string }>({ name: '', quantity: '1' });
  const [newItemName, setNewItemName] = useState('');
  const { translations } = useLanguage();

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newItemName.trim();
    if (trimmedName) {
        onAdd(trimmedName);
        setNewItemName('');
    }
  };

  const handleEdit = (item: ShoppingListItem) => {
    setEditingId(item.id);
    setCurrentItem({ name: item.name, quantity: String(item.quantity) });
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleSave = () => {
    if (!editingId) return;

    const quantity = parseInt(currentItem.quantity, 10);
    if (currentItem.name.trim() && !isNaN(quantity) && quantity > 0) {
      onUpdate({
        id: editingId,
        name: currentItem.name.trim(),
        quantity: quantity,
        completed: items.find(i => i.id === editingId)?.completed || false,
      });
      setEditingId(null);
    } else {
        console.error("Invalid item name or quantity");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">{translations.shoppingListTitle}</h3>

      <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
          <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={translations.shoppingListAddItemPlaceholder}
              className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400"
              aria-label={translations.shoppingListAddItemPlaceholder}
          />
          <button
              type="submit"
              className="bg-indigo-600 text-white font-bold p-2 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0"
              disabled={!newItemName.trim()}
              aria-label={translations.addButton}
          >
              <PlusIcon className="w-5 h-5" />
          </button>
      </form>

      {items.length === 0 ? (
        <div className="text-center py-10 px-4">
            <ShoppingCartIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600" />
            <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-slate-200">{translations.shoppingListEmptyTitle}</h4>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
              {translations.shoppingListEmptySubtitle}
            </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              {editingId === item.id ? (
                 <div className="w-full flex items-center gap-2">
                    <input
                      type="text"
                      name="name"
                      value={currentItem.name}
                      onChange={handleInputChange}
                      className="w-full text-sm p-2 rounded border border-indigo-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-200 dark:border-slate-500"
                      aria-label="Edit item name"
                    />
                    <input
                      type="number"
                      name="quantity"
                      value={currentItem.quantity}
                      onChange={handleInputChange}
                      className="w-20 text-sm p-2 rounded border border-indigo-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-200 dark:border-slate-500"
                      min="1"
                      aria-label="Edit item quantity"
                    />
                    <div className="flex items-center">
                      <button onClick={handleSave} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-full" aria-label="Save changes">
                        <CheckIcon className="w-5 h-5" />
                      </button>
                      <button onClick={handleCancel} className="p-2 text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full" aria-label="Cancel editing">
                        <XIcon className="w-5 h-5" />
                      </button>
                    </div>
                 </div>
              ) : (
                <div className={`p-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${item.completed ? 'bg-gray-100 dark:bg-slate-700/50' : 'bg-white dark:bg-slate-700 shadow-sm'}`}>
                    <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => onUpdate({ ...item, completed: !item.completed })}
                        className="h-5 w-5 rounded border-gray-300 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0 bg-gray-100 dark:bg-slate-600"
                        aria-label={`Mark ${item.name} as completed`}
                    />
                    <div className="flex-grow" onClick={() => onUpdate({ ...item, completed: !item.completed })}>
                        <span className={`font-medium capitalize ${item.completed ? 'text-gray-500 dark:text-slate-400 line-through' : 'text-gray-800 dark:text-slate-200'}`}>{item.name}</span>
                        <span className={`text-sm ml-2 ${item.completed ? 'text-gray-400 dark:text-slate-500 line-through' : 'text-gray-500 dark:text-slate-400'}`}>(Qty: {item.quantity})</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(item)} className="p-2 text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-600 rounded-full" aria-label={`Edit ${item.name}`}>
                            <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => onRemove(item.id)} className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-600 rounded-full" aria-label={`Remove ${item.name}`}>
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ShoppingList;