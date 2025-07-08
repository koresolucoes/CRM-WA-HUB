
import React from 'react';
import type { FlowDataSourceItem } from '../../../types';
import { TrashIcon } from '../../icons';
import { formFieldClasses } from '../../ui/styleConstants';

const DataSourceEditor = ({ dataSource = [], onChange }: { dataSource: FlowDataSourceItem[], onChange: (newDataSource: FlowDataSourceItem[]) => void }) => {
    const updateItem = (index: number, prop: keyof FlowDataSourceItem, value: string) => {
        const newItems = [...dataSource];
        newItems[index] = { ...newItems[index], [prop]: value };
        onChange(newItems);
    };
    const addItem = () => {
        const newItem: FlowDataSourceItem = { id: `opcao_${dataSource.length + 1}`, title: 'Nova Opção' };
        onChange([...dataSource, newItem]);
    };
    const removeItem = (index: number) => {
        onChange(dataSource.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            {dataSource.map((item, index) => (
                <div key={item.id} className="flex items-start space-x-2 bg-gray-50 p-2 rounded-md border">
                    <div className="space-y-2 flex-grow">
                        <input type="text" placeholder="ID da Opção" value={item.id} onChange={e => updateItem(index, 'id', e.target.value)} className={formFieldClasses} />
                        <input type="text" placeholder="Título Visível" value={item.title} onChange={e => updateItem(index, 'title', e.target.value)} className={formFieldClasses} />
                        <input type="text" placeholder="Descrição (opcional)" value={item.description || ''} onChange={e => updateItem(index, 'description', e.target.value)} className={formFieldClasses} />
                    </div>
                    <button onClick={() => removeItem(index)} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                </div>
            ))}
            <button onClick={addItem} className="text-sm font-semibold text-amber-600 hover:underline">+ Adicionar Opção</button>
        </div>
    );
};

export default DataSourceEditor;
