
import React from 'react';
import type { MessageTemplate, HeaderComponent, BodyComponent, FooterComponent, ButtonsComponent } from '../../types';

const TemplatePreview = ({ template }: { template: MessageTemplate | null }) => {
    if (!template) return null;

    const header = template.components.find(c => c.type === 'HEADER') as HeaderComponent | undefined;
    const body = template.components.find(c => c.type === 'BODY') as BodyComponent;
    const footer = template.components.find(c => c.type === 'FOOTER') as FooterComponent | undefined;
    const buttons = template.components.find(c => c.type === 'BUTTONS') as ButtonsComponent | undefined;

    return (
        <div className="w-full max-w-sm bg-gray-900 rounded-3xl p-2 shadow-2xl sticky top-8 mx-auto">
            <div className="bg-white rounded-2xl overflow-hidden">
                <div className="h-14 bg-teal-600 flex items-center p-3 text-white">
                    <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex-shrink-0"></div>
                    <p className="font-semibold">Preview</p>
                </div>
                <div className="p-2 bg-cover" style={{ backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')" }}>
                    <div className="bg-white p-3 rounded-lg shadow-md max-w-full self-start mb-auto text-left w-full">
                        {header && (
                            <div className="mb-2">
                                {header.format === 'TEXT' && <p className="font-bold text-gray-800 break-words">{header.text || 'Cabeçalho'}</p>}
                                {header.format === 'IMAGE' && <div className="h-32 bg-gray-200 flex items-center justify-center text-gray-400 rounded-md">Imagem</div>}
                                {header.format === 'VIDEO' && <div className="h-32 bg-gray-200 flex items-center justify-center text-gray-400 rounded-md">Vídeo</div>}
                                {header.format === 'DOCUMENT' && <div className="h-16 bg-gray-200 flex items-center justify-center text-gray-400 rounded-md">Documento</div>}
                            </div>
                        )}
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{body.text}</p>
                        {footer && <p className="text-xs text-gray-500 mt-2">{footer.text}</p>}
                    </div>
                    {buttons && buttons.buttons.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {buttons.buttons.map((btn, i) => (
                                <div key={i} className="bg-gray-100 text-center text-sm text-blue-600 p-2 rounded-lg cursor-pointer">
                                    {btn.text}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TemplatePreview;
