
import React from 'react';
import type { ButtonsComponent, Button } from '../../types';
import { TrashIcon } from '../icons';
import { formFieldClasses } from '../ui/styleConstants';

const ButtonsEditor = ({ component, onChange }: { component: ButtonsComponent, onChange: (newComponent: ButtonsComponent) => void }) => {
    const handleButtonChange = (index: number, updatedButton: Button) => {
        const newButtons = [...component.buttons];
        newButtons[index] = updatedButton;
        onChange({ ...component, buttons: newButtons });
    };

    const handleAddButton = () => {
        const buttonType = component.buttons[0]?.type || 'QUICK_REPLY';
        let newButton: Button;
        if (buttonType === 'QUICK_REPLY') {
            newButton = { type: 'QUICK_REPLY', text: 'Nova Resposta' };
        } else {
            newButton = { type: 'URL', text: 'Visitar Site', url: 'https://' };
        }
        onChange({ ...component, buttons: [...component.buttons, newButton] });
    };

    const handleRemoveButton = (index: number) => {
        const newButtons = component.buttons.filter((_, i) => i !== index);
        onChange({ ...component, buttons: newButtons });
    };

    const setButtonType = (type: 'QUICK_REPLY' | 'URL') => {
        if (type === 'QUICK_REPLY') {
            onChange({ ...component, buttons: [{ type: 'QUICK_REPLY', text: 'Resposta Rápida' }] });
        } else {
            onChange({ ...component, buttons: [{ type: 'URL', text: 'Visitar Site', url: 'https://' }] });
        }
    };
    
    const canAddButton = (component.buttons[0]?.type === 'QUICK_REPLY' && component.buttons.length < 10) ||
                         (component.buttons[0]?.type !== 'QUICK_REPLY' && component.buttons.length < 2);

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <button type="button" onClick={() => setButtonType('QUICK_REPLY')} className={`px-3 py-1 text-sm rounded-md ${component.buttons[0]?.type === 'QUICK_REPLY' ? 'bg-amber-600 text-white' : 'bg-gray-200'}`}>Respostas Rápidas</button>
                <button type="button" onClick={() => setButtonType('URL')} className={`px-3 py-1 text-sm rounded-md ${component.buttons[0]?.type !== 'QUICK_REPLY' ? 'bg-amber-600 text-white' : 'bg-gray-200'}`}>Chamada para Ação</button>
            </div>
            
            {component.buttons.map((btn, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2 relative">
                    <button onClick={() => handleRemoveButton(index)} type="button" className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                    {btn.type === 'QUICK_REPLY' && (
                        <input type="text" value={btn.text} onChange={e => handleButtonChange(index, { ...btn, text: e.target.value })} placeholder="Texto da Resposta Rápida" className={formFieldClasses} />
                    )}
                    {btn.type === 'URL' && (
                        <div className="space-y-2">
                            <input type="text" value={btn.text} onChange={e => handleButtonChange(index, { ...btn, text: e.target.value })} placeholder="Texto do Botão" className={formFieldClasses} />
                            <input type="url" value={btn.url} onChange={e => handleButtonChange(index, { ...btn, url: e.target.value })} placeholder="https://exemplo.com" className={formFieldClasses} />
                        </div>
                    )}
                    {btn.type === 'PHONE_NUMBER' && (
                         <div className="space-y-2">
                            <input type="text" value={btn.text} onChange={e => handleButtonChange(index, { ...btn, text: e.target.value })} placeholder="Texto do Botão" className={formFieldClasses} />
                            <input type="tel" value={btn.phone_number} onChange={e => handleButtonChange(index, { ...btn, phone_number: e.target.value })} placeholder="+5511999999999" className={formFieldClasses} />
                        </div>
                    )}
                </div>
            ))}

            {canAddButton && <button type="button" onClick={handleAddButton} className="text-sm text-amber-600 hover:underline">+ Adicionar Botão</button>}
        </div>
    );
};

export default ButtonsEditor;
