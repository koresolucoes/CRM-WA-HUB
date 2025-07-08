
import React from 'react';
import type { FlowAction, FlowScreen, FlowActionType } from '../../../types';
import InspectorField from '../ui/InspectorField';
import { formFieldClasses } from '../../ui/styleConstants';

const ActionEditor = ({ action, onChange, screens, title = "Ação ao Clicar" }: { action: FlowAction | undefined, onChange: (newAction: FlowAction | undefined) => void, screens: FlowScreen[], title?: string }) => {
    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value as FlowActionType | '';
        if (newType === '') {
            onChange(undefined);
        } else {
            onChange({ type: newType });
        }
    };
    
    const updateActionProp = (key: keyof FlowAction, value: any) => {
        if (!action) return;
        onChange({ ...action, [key]: value });
    };

    return (
        <div className="space-y-2 p-3 bg-gray-50 border rounded-md">
            <InspectorField label={title}>
                <select value={action?.type || ''} onChange={handleTypeChange} className={formFieldClasses}>
                    <option value="">Nenhuma</option>
                    <option value="Navigate">Navegar para Tela</option>
                    <option value="Complete">Finalizar Flow</option>
                    <option value="DataExchange">Trocar Dados (API)</option>
                    <option value="open_url">Abrir URL</option>
                    <option value="update_data">Atualizar Dados na Tela</option>
                </select>
            </InspectorField>
            {action?.type === 'Navigate' && (
                <InspectorField label="Tela de Destino">
                    <select value={action.targetScreenId || ''} onChange={e => updateActionProp('targetScreenId', e.target.value)} className={formFieldClasses}>
                        <option value="">Selecione a tela...</option>
                        {screens.map(s => <option key={s.id} value={s.screen_id}>{s.title}</option>)}
                    </select>
                </InspectorField>
            )}
            {action?.type === 'open_url' && (
                <InspectorField label="URL">
                    <input type="url" value={action.url || ''} onChange={e => updateActionProp('url', e.target.value)} className={formFieldClasses} placeholder="https://example.com" />
                </InspectorField>
            )}
        </div>
    );
}

export default ActionEditor;
