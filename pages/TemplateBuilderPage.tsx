
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTemplateById, updateTemplate, deleteTemplate } from '../services/templateService';
import { createMessageTemplate, getActiveConnection } from '../services/metaService';
import { PaperAirplaneIcon } from '../components/icons';
import type { MessageTemplate, TemplateComponent, HeaderComponent, BodyComponent, FooterComponent, ButtonsComponent } from '../types';
import NotificationToast, { type Notification } from '../components/ui/NotificationToast';
import HeaderEditor from '../components/TemplateBuilder/HeaderEditor';
import BodyEditor from '../components/TemplateBuilder/BodyEditor';
import FooterEditor from '../components/TemplateBuilder/FooterEditor';
import ButtonsEditor from '../components/TemplateBuilder/ButtonsEditor';
import TemplatePreview from '../components/TemplateBuilder/TemplatePreview';

// --- Main Page Component ---

export default function TemplateBuilderPage() {
    const { templateId } = useParams<{ templateId: string }>();
    const navigate = useNavigate();
    const [template, setTemplate] = useState<MessageTemplate | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);

    useEffect(() => {
        const loadTemplate = async () => {
            if (templateId) {
                const loadedTemplate = await getTemplateById(templateId);
                if (loadedTemplate) {
                    setTemplate(loadedTemplate);
                } else {
                    navigate('/modelos');
                }
            }
        };
        loadTemplate();
    }, [templateId, navigate]);
    
    // Auto-save draft on change
    useEffect(() => {
        const handler = setTimeout(() => {
            if (template) {
                updateTemplate(template);
            }
        }, 1000);
        return () => clearTimeout(handler);
    }, [template]);

    const handleTemplateChange = (key: keyof MessageTemplate, value: any) => {
        setTemplate(prev => prev ? { ...prev, [key]: value } : null);
    };

    const handleComponentChange = (index: number, newComponent: TemplateComponent) => {
        setTemplate(prev => {
            if (!prev) return null;
            const newComponents = [...prev.components];
            newComponents[index] = newComponent;
            return { ...prev, components: newComponents };
        });
    };

    const toggleComponent = (type: 'HEADER' | 'FOOTER' | 'BUTTONS') => {
        setTemplate(prev => {
            if (!prev) return null;
            const hasComponent = prev.components.some(c => c.type === type);
            if (hasComponent) {
                return { ...prev, components: prev.components.filter(c => c.type !== type) };
            } else {
                let newComponent: TemplateComponent;
                switch (type) {
                    case 'HEADER': newComponent = { type: 'HEADER', format: 'TEXT', text: '' }; break;
                    case 'FOOTER': newComponent = { type: 'FOOTER', text: '' }; break;
                    case 'BUTTONS': newComponent = { type: 'BUTTONS', buttons: [] }; break;
                }
                // Maintain order: HEADER, BODY, FOOTER, BUTTONS
                const newComponents = [...prev.components, newComponent].sort((a, b) => {
                    const order = { HEADER: 1, BODY: 2, FOOTER: 3, BUTTONS: 4 };
                    return order[a.type] - order[b.type];
                });
                return { ...prev, components: newComponents };
            }
        });
    };

    const handleSubmit = async () => {
        if (!template) return;
        
        const connection = await getActiveConnection();
        if (!connection) {
            setNotification({ type: 'error', message: 'Nenhuma conexão ativa com a Meta. Configure em Configurações.' });
            return;
        }

        setIsSubmitting(true);
        setNotification(null);
        try {
            await createMessageTemplate(connection, template);
            await deleteTemplate(template.id); // Remove local draft on successful submission
            setNotification({ type: 'success', message: 'Modelo enviado para aprovação com sucesso!' });
            setTimeout(() => navigate('/modelos'), 2000);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
            setNotification({ type: 'error', message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!template) return <div className="h-screen w-screen flex items-center justify-center">Carregando editor...</div>;

    const header = template.components.find(c => c.type === 'HEADER') as HeaderComponent | undefined;
    const body = template.components.find(c => c.type === 'BODY') as BodyComponent;
    const footer = template.components.find(c => c.type === 'FOOTER') as FooterComponent | undefined;
    const buttons = template.components.find(c => c.type === 'BUTTONS') as ButtonsComponent | undefined;

    return (
        <div className="min-h-screen bg-gray-50">
            {notification && <NotificationToast notification={notification} onClose={() => setNotification(null)} />}
            <header className="bg-white border-b p-3 flex justify-between items-center sticky top-0 z-10">
                 <div className="flex items-center">
                    <button onClick={() => navigate('/modelos')} className="text-gray-500 hover:text-gray-800 mr-3 p-2 rounded-full hover:bg-gray-100">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <h1 className="font-bold text-lg text-gray-800">{template.name}</h1>
                    <span className="ml-3 text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">Rascunho</span>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={handleSubmit} disabled={isSubmitting} className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition duration-300 disabled:opacity-50 font-semibold flex items-center">
                         <PaperAirplaneIcon className="w-5 h-5 mr-2"/>
                        {isSubmitting ? "Enviando..." : "Enviar para Aprovação"}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h2 className="text-lg font-bold mb-4">Informações Básicas</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <input type="text" value={template.name} onChange={e => handleTemplateChange('name', e.target.value)} placeholder="Nome do modelo" className="w-full px-3 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                             <select value={template.category} onChange={e => handleTemplateChange('category', e.target.value)} className="w-full px-3 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none">
                                <option value="MARKETING">Marketing</option>
                                <option value="UTILITY">Utilidade</option>
                                <option value="AUTHENTICATION">Autenticação</option>
                            </select>
                            <input type="text" value={template.language} onChange={e => handleTemplateChange('language', e.target.value)} placeholder="Idioma (ex: pt_BR)" className="w-full px-3 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        </div>
                    </div>
                    
                    {/* Component Editors */}
                     {[
                        { type: 'HEADER', title: 'Cabeçalho', component: header },
                        { type: 'BODY', title: 'Corpo', component: body },
                        { type: 'FOOTER', title: 'Rodapé', component: footer },
                        { type: 'BUTTONS', title: 'Botões', component: buttons },
                     ].map(({ type, title, component }) => (
                         <div key={type} className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold">{title}</h2>
                                {type !== 'BODY' && (
                                    <label className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only" checked={!!component} onChange={() => toggleComponent(type as any)} />
                                            <div className={`block w-10 h-6 rounded-full transition-colors ${!!component ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${!!component ? 'translate-x-full' : ''}`}></div>
                                        </div>
                                    </label>
                                )}
                            </div>
                            {type === 'HEADER' && !!component && <HeaderEditor component={header} onChange={c => handleComponentChange(template.components.findIndex(comp => comp.type === 'HEADER'), c!)} />}
                            {type === 'BODY' && <BodyEditor component={body} onChange={c => handleComponentChange(template.components.findIndex(comp => comp.type === 'BODY'), c)} />}
                            {type === 'FOOTER' && !!component && <FooterEditor component={footer!} onChange={c => handleComponentChange(template.components.findIndex(comp => comp.type === 'FOOTER'), c)} />}
                            {type === 'BUTTONS' && !!component && <ButtonsEditor component={buttons!} onChange={c => handleComponentChange(template.components.findIndex(comp => comp.type === 'BUTTONS'), c)} />}
                        </div>
                     ))}

                </div>
                <div>
                    <TemplatePreview template={template} />
                </div>
            </div>
        </div>
    );
}
