import React, { useState } from 'react';
import { XMarkIcon } from '../icons';
import { formFieldClasses } from '../ui/styleConstants';

export const TagInput = ({ selectedTags, allTags, onChange }: { selectedTags: string[], allTags: string[], onChange: (newTags: string[]) => void }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = allTags.filter(tag => 
    !selectedTags.includes(tag) && 
    tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      onChange([...selectedTags, trimmedTag]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(selectedTags.filter(tag => tag !== tagToRemove));
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  return (
    <div className="relative">
      <div className={`${formFieldClasses} flex flex-wrap items-center gap-2`}>
        {selectedTags.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-amber-200 text-amber-800 text-sm font-medium px-2 py-1 rounded">
            {tag}
            <button type="button" onClick={() => handleRemoveTag(tag)} className="text-amber-600 hover:text-amber-800">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </span>
        ))}
        <input 
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} // Delay para permitir o clique
          onKeyDown={handleKeyDown}
          className="flex-grow bg-transparent focus:outline-none p-1 min-w-[120px]"
          placeholder="Adicionar tag..."
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map(tag => (
            <li 
              key={tag}
              onMouseDown={() => handleAddTag(tag)} // onMouseDown executa antes do onBlur
              className="px-3 py-2 cursor-pointer hover:bg-amber-100"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};