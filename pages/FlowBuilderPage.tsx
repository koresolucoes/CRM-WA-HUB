import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFlowById, updateFlow, saveDraftFlow, generateFlowPreview } from '../services/flowService';
import type { WhatsAppFlow, FlowScreen, FlowComponent, FlowComponentType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import {
    XCircleIcon, XMarkIcon, TrashIcon, PaperAirplaneIcon, PlusIcon,
    EyeIcon
} from '../components/icons';
import { FlowStatus } from '../types';
import { slugify } from '../utils/slugify';
import ComponentInspector from '../components/FlowBuilder/ComponentInspector';
import ComponentToolbox from '../components/FlowBuilder/ComponentToolbox';
import FlowPreview from '../components/FlowBuilder/FlowPreview';
import NotificationToast from '../components/ui/NotificationToast';
import InspectorField from '../components/FlowBuilder/ui/InspectorField';
import { formFieldClasses } from '../components/ui/styleConstants';

// --- Types ---
type Notification = {
    message: string;
    type: 'success' | 'error' | 'info';
    details?: string[];
};

type InspectorView = 'component' | 'screen' | 'flow';


// --- Main Page Component ---

export default function FlowBuilderPage() {
    const { flowId } = useParams<{ flowId: string }>();
    const navigate = useNavigate();
    const [flow, setFlow] = useState<WhatsAppFlow | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
    const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
    const [inspectorView, setInspectorView] = useState<InspectorView>('screen');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [notification, setNotification] = useState<Notification | null>(null);
    
    const debouncedSave = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial Load and screen selection logic
    useEffect(() => {
        if (!flowId) {
            navigate('/flows');
            return;
        }

        const loadInitialData = async () => {
            try {
                const data = await getFlowById(flowId);
                if (!data) {
                    navigate('/flows');
                    return;
                }
                
                if (data.origin === 'meta' && data.screens.length === 0) {
                    const newScreen: FlowScreen = {
                        id: uuidv4(),
                        screen_id: 'WELCOME_SCREEN',
                        title: 'Tela de Boas-Vindas',
                        layout: { type: 'SingleColumnLayout', children: [] },
                    };
                    const updatedFlowData = { ...data, screens: [newScreen] };
                    
                    const savedFlow = await updateFlow(updatedFlowData); 
                    
                    setFlow(savedFlow);
                    setSelectedScreenId(savedFlow.screens[0]?.id || null);
                } else {
                    setFlow(data);
                    if (data.screens.length > 0 && !selectedScreenId) {
                        setSelectedScreenId(data.screens[0].id);
                    }
                }
            } catch (err) {
                 setError(err instanceof Error ? err.message : "Falha ao carregar o flow.");
            }
        };

        loadInitialData();
        
    }, [flowId, navigate, selectedScreenId]);

    // Auto-save with error handling
    useEffect(() => {
        if (flow) {
            if (debouncedSave.current) clearTimeout(debouncedSave.current);
            debouncedSave.current = setTimeout(() => {
                if (flow.status !== FlowStatus.PUBLISHED) {
                    updateFlow(flow).catch(err => {
                        console.error("Auto-save failed:", err);
                        setNotification({ type: 'error', message: `Falha ao salvar rascunho.` });
                    });
                }
            }, 1500);
        }
        return () => {
            if (debouncedSave.current) clearTimeout(debouncedSave.current);
        };
    }, [flow]);

    const updateFlowState = useCallback((updater: (prev: WhatsAppFlow) => WhatsAppFlow) => {
        setFlow(prev => prev ? updater(prev) : null);
    }, []);

    const addScreen = () => {
        const newScreenId = uuidv4();
        const newScreen: FlowScreen = {
            id: newScreenId,
            screen_id: `SCREEN_${flow ? flow.screens.length + 1 : 1}`,
            title: 'Nova Tela',
            layout: { type: 'SingleColumnLayout', children: [] }
        };
        updateFlowState(prev => ({ ...prev, screens: [...prev.screens, newScreen] }));
        setSelectedScreenId(newScreenId);
    };

    const deleteScreen = (screenId: string) => {
        if (flow && flow.screens.length <= 1) {
            alert("Um flow deve ter pelo menos uma tela.");
            return;
        }
        updateFlowState(prev => ({
            ...prev,
            screens: prev.screens.filter(s => s.id !== screenId)
        }));
        if(selectedScreenId === screenId) {
             setSelectedScreenId(flow?.screens[0]?.id || null);
        }
    };
    
    const addComponent = (type: FlowComponentType) => {
        const baseId = slugify(`${type}_${uuidv4().substring(0,4)}`);
        let baseComponent: FlowComponent = { id: uuidv4(), type, name: baseId };
        
        const defaultText = (label: string) => { baseComponent.text = label; baseComponent.name = slugify(label); };
        const defaultLabel = (label: string) => { baseComponent.label = label; baseComponent.name = slugify(label); };
        
        switch(type) {
            case 'TextHeading': defaultText("Confira os Detalhes do Pedido"); break;
            case 'TextSubheading': defaultText("Resumo da sua compra"); break;
            case 'TextBody': defaultText("Seu pedido #12345 foi confirmado e será enviado em breve. Agradecemos a sua preferência!"); break;
            case 'RichText': defaultText("# Termos de Serviço\n\nAo continuar, você concorda com nossos termos. Leia mais em nosso [site](https://example.com)."); break;
            case 'TextInput': defaultLabel("Digite seu nome completo"); baseComponent.name = "customer_name"; break;
            case 'TextArea': defaultLabel("Deixe um comentário (opcional)"); baseComponent.name = "customer_comment"; break;
            case 'CheckboxGroup': defaultLabel("Quais produtos você tem interesse?"); baseComponent.name = 'product_interest'; baseComponent['data-source'] = [{id: 'eletronicos', title: 'Eletrônicos'}, {id: 'vestuario', title: 'Vestuário'}]; break;
            case 'RadioButtonsGroup': defaultLabel("Tipo de Atendimento"); baseComponent.name = 'service_type'; baseComponent['data-source'] = [{id: 'suporte_tecnico', title: 'Suporte Técnico'}, {id: 'informacoes_produto', title: 'Informações do Produto'}]; break;
            case 'Dropdown': defaultLabel("Selecione o Estado"); baseComponent.name = 'state_selection'; baseComponent['data-source'] = [{id: 'sp', title: 'São Paulo'}, {id: 'rj', title: 'Rio de Janeiro'}]; break;
            case 'ChipsSelector': defaultLabel("Selecione seus interesses"); baseComponent.name = 'user_interests'; baseComponent['data-source'] = [{id: 'esportes', title: 'Esportes'}, {id: 'tecnologia', title: 'Tecnologia'}]; break;
            case 'DatePicker': defaultLabel("Selecione a data de nascimento"); baseComponent.name = "date_of_birth"; break;
            case 'CalendarPicker': defaultLabel("Selecione as datas da sua estadia"); baseComponent.name = "hotel_stay_dates"; break;
            case 'OptIn': defaultLabel("Sim, quero receber novidades por WhatsApp"); baseComponent.name = "whatsapp_opt_in"; break;
            case 'Image': baseComponent.src = ""; baseComponent['alt-text'] = "Logotipo da empresa"; baseComponent.name = "company_logo"; break;
            case 'ImageCarousel': baseComponent.images = [{id: uuidv4(), src: '', 'alt-text': 'Produto em destaque 1'}]; baseComponent.name = "product_carousel"; break;
            case 'PhotoPicker': defaultLabel("Envie uma foto do seu RG"); baseComponent.name = "id_photo_upload"; break;
            case 'DocumentPicker': defaultLabel("Anexe o comprovante de residência"); baseComponent.name = "proof_of_address_upload"; break;
            case 'Footer': defaultLabel("Confirmar e Enviar"); baseComponent.name = "submit_button"; baseComponent['on-click-action'] = {type: "Complete"}; break;
            case 'EmbeddedLink': defaultText("Saiba mais sobre a oferta"); baseComponent.name = "offer_details_link"; baseComponent['on-click-action'] = {type: "open_url", url: 'https://www.example.com/oferta'}; break;
            default: defaultLabel("Novo Componente");
        }

        updateFlowState(prev => ({
            ...prev,
            screens: prev.screens.map(s => 
                s.id === selectedScreenId 
                    ? { ...s, layout: { ...s.layout, children: [...s.layout.children, baseComponent] } }
                    : s
            )
        }));
    };
    
    const deleteComponent = (componentId: string) => {
        updateFlowState(prev => ({
            ...prev,
            screens: prev.screens.map(s => 
                s.id === selectedScreenId 
                    ? { ...s, layout: { ...s.layout, children: s.layout.children.filter(c => c.id !== componentId) } }
                    : s
            )
        }));
        if(selectedComponentId === componentId) {
            setSelectedComponentId(null);
            setInspectorView('screen');
        }
    };

    const updateComponentProp = useCallback((componentId: string, prop: keyof FlowComponent, value: any) => {
         updateFlowState(prev => ({
            ...prev,
            screens: prev.screens.map(s => 
                s.id === selectedScreenId 
                    ? { ...s, layout: { ...s.layout, children: s.layout.children.map(c => c.id === componentId ? {...c, [prop]: value} : c) } }
                    : s
            )
        }));
    }, [selectedScreenId, updateFlowState]);

    const handleSubmit = async () => {
        if (!flow) return;
        
        setIsSubmitting(true);
        setNotification(null);
        try {
            const result = await saveDraftFlow(flow.id);

            if (result.success) {
                 setNotification({ type: 'success', message: 'Rascunho do flow salvo com sucesso!' });
                 setTimeout(() => navigate('/flows'), 2000);
            } else if (result.errors) {
                 const errorDetails = result.errors.map(e => e.error_user_msg || e.message);
                 setNotification({ type: 'error', message: "Falha ao salvar rascunho devido a erros de validação da Meta:", details: errorDetails });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
            setNotification({ type: 'error', message: `Falha ao salvar rascunho: ${message}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTestFlow = async () => {
        if (!flow) return;
    
        setIsTesting(true);
        setNotification(null);
        try {
            await updateFlow(flow);
            const previewUrl = await generateFlowPreview(flow.id);
            window.open(previewUrl, '_blank');
            setNotification({ type: 'info', message: 'URL de pré-visualização gerada e aberta em uma nova aba.' });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
            setNotification({ type: 'error', message: `Falha ao gerar pré-visualização: ${message}` });
        } finally {
            setIsTesting(false);
        }
    };
    
    const handleSelectComponent = (componentId: string) => {
        setSelectedComponentId(componentId);
        setInspectorView('component');
    };

    const selectedScreen = useMemo(() => flow?.screens.find(s => s.id === selectedScreenId), [flow, selectedScreenId]);
    const selectedComponent = useMemo(() => selectedScreen?.layout.children.find(c => c.id === selectedComponentId), [selectedScreen, selectedComponentId]);
    
    if (error) {
         return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-red-50 text-red-700">
                <XCircleIcon className="w-12 h-12" />
                <p className="text-lg font-semibold mt-4">Erro ao Carregar o Flow</p>
                <p className="max-w-md text-center">{error}</p>
                 <button onClick={() => navigate('/flows')} className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Voltar para a Lista de Flows
                </button>
            </div>
        );
    }

    if (!flow) return <div className="h-screen w-screen flex items-center justify-center">Carregando editor de flow...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {notification && <NotificationToast notification={notification} onClose={() => setNotification(null)} />}
            <header className="bg-white border-b p-3 flex justify-between items-center sticky top-0 z-20 shrink-0">
                <div className="flex items-center">
                    <button onClick={() => navigate('/flows')} className="p-2 rounded-full hover:bg-gray-100 mr-2">
                        <XMarkIcon className="w-5 h-5 text-gray-600" />
                    </button>
                    <input
                        value={flow.name}
                        onChange={e => updateFlowState(p => ({...p, name: e.target.value}))}
                        className="font-bold text-lg bg-transparent focus:outline-none focus:bg-gray-100 p-1 rounded-md"
                    />
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={handleTestFlow} disabled={isTesting || isSubmitting} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold flex items-center disabled:opacity-50">
                        <EyeIcon className="w-5 h-5 mr-2" />
                        {isTesting ? 'Gerando...' : 'Testar Flow'}
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting || isTesting} className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition duration-300 disabled:opacity-50 font-semibold flex items-center">
                        <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                        {isSubmitting ? "Salvando..." : "Salvar Rascunho"}
                    </button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
                <aside className="lg:col-span-3 bg-white p-4 rounded-lg border shadow-sm flex flex-col overflow-y-auto">
                    <div className="pb-4 border-b">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="font-bold text-gray-800">Telas</h2>
                            <button onClick={addScreen} className="p-1 rounded-md bg-amber-100 text-amber-600 hover:bg-amber-200"><PlusIcon className="w-5 h-5"/></button>
                        </div>
                        <div className="space-y-1">
                            {flow.screens.map(screen => (
                                <div key={screen.id} onClick={() => { setSelectedScreenId(screen.id); setSelectedComponentId(null); setInspectorView('screen'); }} className={`p-2 rounded-md cursor-pointer flex justify-between items-center group ${selectedScreenId === screen.id ? 'bg-amber-100' : 'hover:bg-gray-100'}`}>
                                    <span className="font-medium text-sm">{screen.title}</span>
                                    <button onClick={(e) => { e.stopPropagation(); deleteScreen(screen.id); }} className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    {selectedScreen && (
                        <div className="py-4 flex-grow flex flex-col">
                             <h2 className="font-bold text-gray-800 mb-2">Componentes em "{selectedScreen.title}"</h2>
                            <div className="space-y-1 mb-4 overflow-y-auto">
                               {selectedScreen.layout.children.map(comp => (
                                   <div key={comp.id} onClick={() => handleSelectComponent(comp.id)} className={`p-2 rounded-md cursor-pointer flex justify-between items-center group ${selectedComponentId === comp.id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                                       <span className="font-medium text-sm">{comp.label || comp.text || comp.name || comp.type}</span>
                                   </div>
                               ))}
                            </div>
                            <div className="mt-auto pt-4 border-t">
                                <ComponentToolbox onAddComponent={addComponent} />
                            </div>
                        </div>
                    )}
                </aside>

                <main className="lg:col-span-5 bg-white p-6 rounded-lg border shadow-sm overflow-y-auto">
                    <div className="flex items-center border-b mb-4">
                        { selectedComponent && (
                            <button onClick={() => setInspectorView('component')} className={`px-4 py-2 font-semibold ${inspectorView === 'component' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500'}`}>Componente</button>
                        )}
                        <button onClick={() => setInspectorView('screen')} className={`px-4 py-2 font-semibold ${inspectorView === 'screen' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500'}`}>Tela</button>
                        <button onClick={() => setInspectorView('flow')} className={`px-4 py-2 font-semibold ${inspectorView === 'flow' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500'}`}>Flow</button>
                    </div>

                    {inspectorView === 'component' && selectedComponent ? (
                        <ComponentInspector component={selectedComponent} onChange={updateComponentProp} onDelete={deleteComponent} screens={flow.screens}/>
                    ) : inspectorView === 'screen' && selectedScreen ? (
                        <div>
                            <h2 className="font-bold text-lg mb-4">Propriedades da Tela "{selectedScreen.title}"</h2>
                             <div className="space-y-4">
                                <InspectorField label="Título da Tela"><input type="text" value={selectedScreen.title} onChange={e => updateFlowState(p => ({...p, screens: p.screens.map(s => s.id === selectedScreenId ? {...s, title: e.target.value} : s)}))} className={formFieldClasses}/></InspectorField>
                                <InspectorField label="ID da Tela (API)"><input type="text" value={selectedScreen.screen_id} onChange={e => updateFlowState(p => ({...p, screens: p.screens.map(s => s.id === selectedScreenId ? {...s, screen_id: e.target.value.toUpperCase().replace(/ /g, '_')} : s)}))} className={`${formFieldClasses} font-mono`} placeholder="WELCOME_SCREEN"/></InspectorField>
                                <InspectorField label="É uma tela terminal?"><input type="checkbox" checked={!!selectedScreen.terminal} onChange={e => updateFlowState(p => ({...p, screens: p.screens.map(s => s.id === selectedScreenId ? {...s, terminal: e.target.checked} : s)}))} className="h-5 w-5 rounded text-amber-600 focus:ring-amber-500" /></InspectorField>
                            </div>
                        </div>
                    ) : inspectorView === 'flow' ? (
                        <div>
                             <h2 className="font-bold text-lg mb-4">Configurações do Flow</h2>
                             <div className="space-y-4">
                                <InspectorField label="Nome do Flow"><input type="text" value={flow.name} onChange={e => updateFlowState(p => ({...p, name: e.target.value}))} className={formFieldClasses}/></InspectorField>
                                <InspectorField label="Endpoint URI (Opcional)" helpText="URL do seu backend para flows dinâmicos."><input type="url" value={flow.endpointUri || ''} onChange={e => updateFlowState(p => ({...p, endpointUri: e.target.value}))} className={formFieldClasses} placeholder="https://seu-backend.com/api/flow" /></InspectorField>
                             </div>
                        </div>
                    ) : (
                        <p>Selecione uma tela ou componente para editar.</p>
                    )}
                </main>

                <aside className="lg:col-span-4">
                    <FlowPreview screen={selectedScreen} flowName={flow.name} />
                </aside>
            </div>
        </div>
    );
}