import React, { useRef } from 'react';
import type { BodyComponent } from '../../types';
import { formFieldClasses } from '../ui/styleConstants';

const BodyEditor = ({ component, onChange }: { component: BodyComponent, onChange: (newComponent: BodyComponent) => void }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const addVariable = () => {
        if (textareaRef.current) {
            const currentText = textareaRef.current.value;
            const selectionStart = textareaRef.current.selectionStart;
            const selectionEnd = textareaRef.current.selectionEnd;
            const variableRegex = /\{\{(\d+)\}\}/g;
            let maxVar = 0;
            let match;
            while ((match = variableRegex.exec(currentText)) !== null) {
                maxVar = Math.max(maxVar, parseInt(match[1]));
            }
            const newVar = `{{${maxVar + 1}}}`;
            const newText = currentText.substring(0, selectionStart) + newVar + currentText.substring(selectionEnd);
            onChange({ ...component, text: newText });
        }
    };
    
    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={component.text}
                onChange={e => onChange({ ...component, text: e.target.value })}
                className={`${formFieldClasses} h-48`}
                placeholder="Corpo da mensagem..."
            />
            <button onClick={addVariable} type="button" className="absolute bottom-3 right-3 text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-1 rounded-md hover:bg-amber-200">
                + Adicionar Variável
            </button>
        </div>
    );
};

export default BodyEditor;