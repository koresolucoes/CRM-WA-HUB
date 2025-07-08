
import React from 'react';
import type { FlowComponentType } from '../../types';

const ComponentToolbox = ({ onAddComponent }: { onAddComponent: (type: FlowComponentType) => void }) => {
    const componentGroups = [
        { name: "Texto", components: [
            { id: "TextHeading", label: "Título" }, { id: "TextSubheading", label: "Subtítulo" },
            { id: "TextBody", label: "Corpo" }, { id: "TextCaption", label: "Legenda" }, { id: "RichText", label: "Texto Rico" },
        ]},
        { name: "Entradas", components: [
            { id: "TextInput", label: "Campo de Texto" }, { id: "TextArea", label: "Área de Texto" },
            { id: "CheckboxGroup", label: "Grupo de Checkbox" }, { id: "RadioButtonsGroup", label: "Botões de Rádio" },
            { id: "Dropdown", label: "Dropdown" }, { id: "DatePicker", label: "Seletor de Data" },
            { id: "CalendarPicker", label: "Calendário" }, { id: "ChipsSelector", label: "Chips" }, { id: "OptIn", label: "Opt-In" },
        ]},
         { name: "Mídia", components: [
            { id: "Image", label: "Imagem" }, { id: "ImageCarousel", label: "Carrossel" },
            { id: "PhotoPicker", label: "Upload de Foto" }, { id: "DocumentPicker", label: "Upload de Doc" },
        ]},
        { name: "Ações", components: [
            { id: "Footer", label: "Rodapé com Botão" }, { id: "EmbeddedLink", label: "Link Incorporado" },
        ]}
    ];

    return (
        <div className="space-y-4">
            {componentGroups.map(group => (
                <div key={group.name}>
                    <h3 className="font-semibold text-sm text-gray-600 mb-2">{group.name}</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {group.components.map(comp => (
                            <button key={comp.id} onClick={() => onAddComponent(comp.id as FlowComponentType)} className="text-left p-2 rounded-md border bg-white hover:border-amber-500 hover:bg-amber-50 transition-all">
                                <span className="font-medium text-sm">{comp.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ComponentToolbox;
