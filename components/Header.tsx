import React from 'react';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';

const Header: React.FC = () => {
    return (
        <header className="bg-white dark:bg-slate-800 shadow-md dark:shadow-slate-700/50 sticky top-0 z-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center flex-shrink-0">
                    <span className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500">
                        Cookly
                    </span>
                </div>
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