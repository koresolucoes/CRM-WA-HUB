
import React from 'react';
import { TRIGGER_OPTIONS, ACTION_OPTIONS } from '../services/automationUtils';
import { iconMap } from './icons';
import { SparklesIcon } from './icons';

interface AutomationToolboxProps {
    onDragStart: (event: React.DragEvent, nodeType: 'trigger' | 'action', subType: string) => void;
}

export const AutomationToolbox = ({ onDragStart }: AutomationToolboxProps) => {
    return (
        <aside className="w-64 bg-white border-r p-4 overflow-y-auto">
            <div>
                <h3 className="text-lg font-bold mb-2">Gatilho</h3>
                <p className="text-xs text-gray-500 mb-4">O gatilho inicializa a automação. Cada automação pode ter apenas um gatilho.</p>
                <div className="space-y-2">
                    {TRIGGER_OPTIONS.map(item => {
                        const Icon = iconMap[item.icon as keyof typeof iconMap] || SparklesIcon;
                        return (
                            <div key={item.value} onDragStart={(e) => onDragStart(e, 'trigger', item.value)} draggable
                                className="p-3 border rounded-lg cursor-grab bg-white hover:bg-amber-50 hover:border-amber-400 flex items-start space-x-3">
                                <div className="text-amber-600 pt-0.5"><Icon className="w-5 h-5"/></div>
                                <div>
                                    <p className="font-semibold text-sm">{item.label}</p>
                                    <p className="text-xs text-gray-500">{item.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <hr className="my-6" />
            <div>
                <h3 className="text-lg font-bold mb-2">Ações</h3>
                <p className="text-xs text-gray-500 mb-4">Ações são os passos que a automação executa após o gatilho.</p>
                <div className="space-y-2">
                    {ACTION_OPTIONS.map(item => {
                        const Icon = iconMap[item.icon as keyof typeof iconMap] || SparklesIcon;
                        return (
                            <div key={item.value} onDragStart={(e) => onDragStart(e, 'action', item.value)} draggable
                                className="p-3 border rounded-lg cursor-grab bg-white hover:bg-amber-50 hover:border-amber-400 flex items-start space-x-3">
                                <div className="text-blue-600 pt-0.5"><Icon className="w-5 h-5"/></div>
                                <div>
                                    <p className="font-semibold text-sm">{item.label}</p>
                                    <p className="text-xs text-gray-500">{item.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
};