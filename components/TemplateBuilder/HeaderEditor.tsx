
import React from 'react';
import type { HeaderComponent } from '../../types';
import { formFieldClasses, formSelectClasses } from '../ui/styleConstants';

const HeaderEditor = ({ component, onChange }: { component: HeaderComponent | undefined, onChange: (newComponent: HeaderComponent | undefined) => void }) => {
    if (!component) return null;

    return (
        <div className="space-y-3">
            <select value={component.format} onChange={e => onChange({ ...component, format: e.target.value as HeaderComponent['format'] })} className={formSelectClasses}>
                <option value="TEXT">Texto</option>
                <option value="IMAGE">Imagem</option>
                <option value="VIDEO">Vídeo</option>
                <option value="DOCUMENT">Documento</option>
            </select>
            {component.format === 'TEXT' ? (
                <input
                    type="text"
                    value={component.text || ''}
                    onChange={e => onChange({ ...component, text: e.target.value })}
                    placeholder="Texto do cabeçalho (use {{1}} para uma variável)"
                    className={formFieldClasses}
                />
            ) : (
                <input
                    type="text"
                    value={component.example?.header_handle?.[0] || ''}
                    onChange={e => onChange({ ...component, example: { header_handle: [e.target.value] } })}
                    placeholder={`URL de exemplo do ${component.format.toLowerCase()}`}
                    className={formFieldClasses}
                />
            )}
        </div>
    );
};

export default HeaderEditor;
