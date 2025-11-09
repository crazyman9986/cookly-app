import React from 'react';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { ChefHatIcon } from './icons/ChefHatIcon';

const Header: React.FC = () => {
    return (
        <header className="bg-white dark:bg-slate-800 shadow-md dark:shadow-slate-700/50 sticky top-0 z-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
                <button
                    onClick={() => window.location.reload()}
                    type="button"
                    aria-label="Cookly home"
                    className="flex items-center flex-shrink-0 gap-2"
                >
                    <ChefHatIcon className="w-8 h-8 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500" />
                    <span className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500">
                        Cookly
                    </span>
                </button>
                <div className="flex items-center justify-end gap-2">
                    <LanguageSwitcher />
                    <div className="border-l border-gray-200 dark:border-slate-700 h-8 mx-2 hidden sm:block"></div>
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
};

export default Header;