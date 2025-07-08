
import React, { useState, useEffect } from 'react';
import type { FlowComponent, FlowScreen } from '../../types';
import { slugify } from '../../utils/slugify';
import { TrashIcon } from '../icons';
import InspectorField from './ui/InspectorField';
import ActionEditor from './editors/ActionEditor';
import DataSourceEditor from './editors/DataSourceEditor';
import ImageCarouselEditor from './editors/ImageCarouselEditor';
import { formFieldClasses } from '../ui/styleConstants';

const ComponentInspector = ({ component, onChange, onDelete, screens }: { component: FlowComponent; onChange: (id: string, prop: keyof FlowComponent, value: any) => void; onDelete: (id: string) => void; screens: FlowScreen[]; }) => {
    const update = (prop: keyof FlowComponent, value: any) => onChange(component.id, prop, value);
    const isConditionalVisibility = typeof component.visible === 'string';

    const [isNameLocked, setIsNameLocked] = useState(true);

    useEffect(() => {
        // When label changes, if the name is "locked" (meaning, it's auto-generated), update it.
        const labelOrText = component.label || component.text;
        if (isNameLocked && typeof labelOrText === 'string' && labelOrText) {
            const newName = slugify(labelOrText);
            if (newName && newName !== component.name) {
                update('name', newName);
            }
        }
    }, [component.label, component.text, isNameLocked, component.name, update]);
    
    // Check on component change if the name looks like it was auto-generated from the label.
     useEffect(() => {
        const labelOrText = component.label || component.text;
        const potentialSlug = typeof labelOrText === 'string' ? slugify(labelOrText) : '';
        setIsNameLocked(!component.name || component.name === potentialSlug);
    }, [component.id, component.name, component.label, component.text]);


    const renderCommonFields = () => {
        const showNameField = !['TextHeading', 'TextSubheading', 'TextBody', 'TextCaption', 'RichText', 'Image', 'Footer'].includes(component.type);
        return (
            <>
                {showNameField && (
                    <InspectorField label="Nome da Variável (API)" helpText="O nome único usado para referenciar este campo.">
                         <div className="relative">
                            <input
                                type="text"
                                value={component.name || ''}
                                onChange={e => {
                                    setIsNameLocked(false);
                                    update('name', e.target.value);
                                }}
                                className={`${formFieldClasses} pr-8`}
                                placeholder="ex: user_name"
                            />
                             <button
                                onClick={() => setIsNameLocked(!isNameLocked)}
                                title={isNameLocked ? "Desbloquear para editar manualmente" : "Bloquear para sincronizar com o rótulo"}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                            >
                               {isNameLocked ? 
                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-600"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                                 :
                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5a4.5 4.5 0 00-4.5-4.5zm-2 8V5.5a3 3 0 116 0V9h-6z" /></svg>
                               }
                             </button>
                        </div>
                    </InspectorField>
                )}
                <InspectorField label="Visibilidade do Componente">
                    {isConditionalVisibility ? (
                        <div className="space-y-1">
                            <input type="text" value={component.visible as string} onChange={e => update('visible', e.target.value)} className={formFieldClasses} placeholder="${form.nome_do_campo.valor}"/>
                            <p className="text-xs text-gray-500 mt-1">Exemplo: <code>{`${'${form.checkbox.valor}'} == true`}</code></p>
                            <button onClick={() => update('visible', true)} className="text-xs text-red-600 hover:underline">Remover condição</button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={component.visible !== false} onChange={e => update('visible', e.target.checked)}/>
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${component.visible !== false ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${component.visible !== false ? 'translate-x-full' : ''}`}></div>
                                </div>
                                <span className="ml-3 text-sm font-medium text-gray-700">{component.visible !== false ? 'Visível' : 'Oculto'}</span>
                            </label>
                            <button onClick={() => update('visible', '')} className="text-xs text-amber-600 hover:underline font-semibold">Usar Condição</button>
                        </div>
                    )}
                </InspectorField>
            </>
        );
    };

    const renderSpecificEditor = () => {
        switch (component.type) {
            case 'TextHeading':
            case 'TextSubheading':
            case 'TextBody':
            case 'TextCaption':
                return (
                    <InspectorField label="Texto">
                        <textarea value={Array.isArray(component.text) ? component.text.join('\n') : component.text || ''} onChange={e => update('text', e.target.value)} className={`${formFieldClasses} h-24`} />
                    </InspectorField>
                );

            case 'RichText':
                return (
                    <InspectorField label="Conteúdo (Markdown)" helpText="Use a sintaxe Markdown para formatar o texto.">
                        <textarea value={Array.isArray(component.text) ? component.text.join('\n') : component.text || ''} onChange={e => update('text', e.target.value)} className={`${formFieldClasses} h-48`} />
                    </InspectorField>
                );

            case 'TextInput':
            case 'TextArea':
                return (
                    <div className="space-y-4">
                        <InspectorField label="Rótulo (Label)"><input type="text" value={component.label || ''} onChange={e => update('label', e.target.value)} className={formFieldClasses} /></InspectorField>
                        <InspectorField label="Texto de Ajuda"><input type="text" value={component['helper-text'] || ''} onChange={e => update('helper-text', e.target.value)} className={formFieldClasses} /></InspectorField>
                        {component.type === 'TextInput' && (
                             <InspectorField label="Tipo de Entrada">
                                <select value={component['input-type'] || 'text'} onChange={e => update('input-type', e.target.value)} className={formFieldClasses}>
                                    <option value="text">Texto</option><option value="number">Número</option><option value="email">Email</option><option value="password">Senha</option><option value="passcode">Código de Acesso</option><option value="phone">Telefone</option>
                                </select>
                            </InspectorField>
                        )}
                        <InspectorField label="Obrigatório?"><input type="checkbox" checked={component.required || false} onChange={e => update('required', e.target.checked)} className="h-5 w-5 rounded text-amber-600 focus:ring-amber-500" /></InspectorField>
                    </div>
                );

            case 'CheckboxGroup':
            case 'RadioButtonsGroup':
            case 'Dropdown':
            case 'ChipsSelector':
                 return (
                    <div className="space-y-4">
                        <InspectorField label="Rótulo (Label)"><input type="text" value={component.label || ''} onChange={e => update('label', e.target.value)} className={formFieldClasses} /></InspectorField>
                        <InspectorField label="Opções do Componente">
                           <DataSourceEditor dataSource={component['data-source']} onChange={ds => update('data-source', ds)} />
                        </InspectorField>
                         {component.type === 'CheckboxGroup' && (
                            <InspectorField label="Seleção de Itens">
                                <div className="flex items-center space-x-2">
                                     <input type="number" placeholder="Mín" value={component['min-selected-items'] || ''} onChange={e => update('min-selected-items', e.target.value ? parseInt(e.target.value) : undefined)} className={formFieldClasses} />
                                      <input type="number" placeholder="Máx" value={component['max-selected-items'] || ''} onChange={e => update('max-selected-items', e.target.value ? parseInt(e.target.value) : undefined)} className={formFieldClasses} />
                                </div>
                            </InspectorField>
                         )}
                    </div>
                 );

            case 'Footer':
                return (
                    <div className="space-y-4">
                        <InspectorField label="Rótulo do Botão"><input type="text" value={component.label || ''} onChange={e => update('label', e.target.value)} className={formFieldClasses} /></InspectorField>
                        <InspectorField label="Legendas (Opcional)">
                             <div className="space-y-2">
                                <input type="text" placeholder="Legenda Esquerda" value={component['left-caption'] || ''} onChange={e => update('left-caption', e.target.value)} className={formFieldClasses} />
                                <input type="text" placeholder="Legenda Direita" value={component['right-caption'] || ''} onChange={e => update('right-caption', e.target.value)} className={formFieldClasses} />
                            </div>
                        </InspectorField>
                        <ActionEditor action={component['on-click-action']} onChange={(newAction) => update('on-click-action', newAction)} screens={screens}/>
                    </div>
                );
            
            case 'ImageCarousel':
                return (
                    <div className="space-y-4">
                        <InspectorField label="Imagens do Carrossel">
                            <ImageCarouselEditor images={component.images} onChange={imgs => update('images', imgs)} />
                        </InspectorField>
                        <InspectorField label="Proporção da Imagem">
                            <select value={component['aspect-ratio']?.toString() || '1.91'} onChange={e => update('aspect-ratio', e.target.value)} className={formFieldClasses}>
                                <option value="1.91">Horizontal (1.91:1)</option>
                                <option value="1">Quadrado (1:1)</option>
                            </select>
                        </InspectorField>
                    </div>
                );
            
            case 'DatePicker':
                 return (
                     <div className="space-y-4">
                         <InspectorField label="Rótulo (Label)"><input type="text" value={component.label || ''} onChange={e => update('label', e.target.value)} className={formFieldClasses} /></InspectorField>
                         <InspectorField label="Data Mínima"><input type="date" value={component['min-date'] || ''} onChange={e => update('min-date', e.target.value)} className={formFieldClasses} /></InspectorField>
                         <InspectorField label="Data Máxima"><input type="date" value={component['max-date'] || ''} onChange={e => update('max-date', e.target.value)} className={formFieldClasses} /></InspectorField>
                    </div>
                 );

            default:
                return <p className="text-sm text-gray-500">Editor para '{component.type}' ainda não implementado.</p>
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">{component.type.replace(/([A-Z])/g, ' $1').trim()}</h2>
                <button onClick={() => onDelete(component.id)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
                {renderCommonFields()}
                {renderSpecificEditor()}
            </div>
        </div>
    );
};

export default ComponentInspector;
