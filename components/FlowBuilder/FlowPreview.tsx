
import React from 'react';
import type { FlowScreen } from '../../types';

const FlowPreview = ({ screen, flowName }: { screen: FlowScreen | undefined, flowName: string }) => {
    if (!screen) {
        return (
            <div className="w-full max-w-sm bg-gray-900 rounded-3xl p-2 shadow-2xl sticky top-8 mx-auto flex items-center justify-center">
                <p className="text-white">Selecione uma tela para ver a pré-visualização.</p>
            </div>
        );
    }
    return (
        <div className="w-full max-w-sm bg-gray-900 rounded-3xl p-2 shadow-2xl sticky top-8 mx-auto">
            <div className="bg-white rounded-2xl overflow-hidden">
                <div className="h-14 bg-teal-600 flex items-center p-3 text-white">
                    <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex-shrink-0"></div>
                    <p className="font-semibold">{flowName}</p>
                </div>
                <div className="p-2 bg-cover" style={{ backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')" }}>
                    <div className="bg-white p-3 rounded-lg shadow-md max-w-full self-start mb-auto text-left w-full min-h-[400px]">
                        {screen.layout.children.map(comp => {
                           if(comp.visible === false) return null;
                           return (
                            <div key={comp.id} className="mb-3 text-sm">
                                {comp.type === 'TextHeading' && <h3 className="font-bold text-lg">{comp.text || `[Título]`}</h3>}
                                {comp.type === 'TextSubheading' && <h4 className="font-semibold text-base">{comp.text || `[Subtítulo]`}</h4>}
                                {comp.type === 'TextBody' && <p>{comp.text || `[Corpo]`}</p>}
                                {comp.type === 'TextCaption' && <p className="text-xs text-gray-500">{comp.text || `[Legenda]`}</p>}
                                {comp.type === 'TextInput' && <div className="p-2 border rounded bg-gray-50">{comp.label || '[Campo de Texto]'}</div>}
                                {comp.type === 'TextArea' && <div className="p-2 h-16 border rounded bg-gray-50">{comp.label || '[Área de Texto]'}</div>}
                                {comp.type === 'Dropdown' && <div className="p-2 border rounded bg-gray-50">{comp.label || '[Dropdown]'}</div>}
                                {comp.type === 'Footer' && <div className="p-2 bg-gray-200 text-center rounded mt-4">{comp.label || '[Botão de Rodapé]'}</div>}
                                {comp.type === 'Image' && <div className="h-24 bg-gray-200 flex items-center justify-center text-gray-400 rounded-md">Imagem</div>}
                            </div>
                           )}
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlowPreview;
