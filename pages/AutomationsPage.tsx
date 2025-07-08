import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Automation, AutomationNode, CrmBoard, TriggerCrmStageChangedData, TriggerContextMessageData } from '../types';
import { AutomationStatus } from '../types';
import { getAutomations, addAutomation, deleteAutomation, updateAutomation } from '../services/automationService';
import { getAllStages, getBoards } from '../services/crmService';
import { PencilIcon, TrashIcon, PlayIcon, PauseIcon } from '../components/icons';
import { CreateAutomationModal } from '../components/Automations/CreateAutomationModal';

const getStatusClass = (status: AutomationStatus) => {
  switch (status) {
    case AutomationStatus.ACTIVE: return 'bg-green-100 text-green-800';
    case AutomationStatus.PAUSED: return 'bg-yellow-100 text-yellow-800';
    case AutomationStatus.DRAFT:
    default: return 'bg-gray-100 text-gray-800';
  }
};

const formatTrigger = (nodes: AutomationNode[], crmStages: { id: string, title: string }[], boards: CrmBoard[]): string => {
    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode) return 'Nenhum gatilho definido';
    
    const data = triggerNode.data;
    switch (data.type) {
        case 'contact_created':
            return 'Quando um novo contato é criado';
        case 'webhook':
            return 'Quando um Webhook é recebido';
        case 'tag_added':
            return `Quando a tag "${(data as any).value || 'qualquer'}" é adicionada`;
        case 'crm_stage_changed': {
            const triggerData = data as TriggerCrmStageChangedData;
            const boardName = triggerData.crmBoardId ? boards.find(b => b.id === triggerData.crmBoardId)?.name : null;
            const stageName = triggerData.crmStageId ? crmStages.find(s => s.id === triggerData.crmStageId)?.title : null;

            if (boardName && stageName) return `${boardName} → ${stageName}`;
            if (boardName) return `${boardName} → Qualquer Etapa`;
            if (stageName) return `Qualquer Board → ${stageName}`;
            return 'Quando entra em qualquer etapa';
        }
        case 'context_message': {
            const msgData = data as TriggerContextMessageData;
            if (!msgData.value || msgData.match === 'any') return "Quando uma mensagem é recebida";
            const matchText = msgData.match === 'exact' ? 'exata' : 'contém';
            return `Quando mensagem ${matchText} "${msgData.value}"`;
        }
        default:
            return 'Gatilho desconhecido';
    }
};

function AutomationsPage(): React.ReactNode {
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [crmStages, setCrmStages] = useState<{ id: string; title: string }[]>([]);
    const [boards, setBoards] = useState<CrmBoard[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const loadData = async () => {
        const [automationsData, stagesData, boardsData] = await Promise.all([
            getAutomations(),
            getAllStages(),
            getBoards(),
        ]);
        setAutomations(automationsData);
        setCrmStages(stagesData);
        setBoards(boardsData);
    };

    useEffect(() => {
        loadData();
        const handleLocalDataChange = () => loadData();
        window.addEventListener('localDataChanged', handleLocalDataChange);
        return () => {
            window.removeEventListener('localDataChanged', handleLocalDataChange);
        };
    }, []);
    
    const handleDelete = async (automationId: string) => {
        if (window.confirm('Tem certeza que deseja remover esta automação?')) {
            await deleteAutomation(automationId);
            await loadData();
        }
    };

    const toggleStatus = async (automation: Automation) => {
        const newStatus = automation.status === AutomationStatus.ACTIVE ? AutomationStatus.PAUSED : AutomationStatus.ACTIVE;
        await updateAutomation({ ...automation, status: newStatus });
        await loadData();
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Automações</h1>
                    <p className="text-gray-500 mt-1">Crie fluxos automatizados de mensagens para se comunicar com seus contatos de forma eficiente e personalizada.</p>
                </div>
                 <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-amber-700 transition duration-300 flex items-center"
                    >
                        Adicionar Automação
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nome</th>
                            <th scope="col" className="px-6 py-3">Gatilho</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3">Criada em</th>
                            <th scope="col" className="px-6 py-3"><span className="sr-only">Ações</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {automations.map(automation => (
                            <tr key={automation.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{automation.name}</td>
                                <td className="px-6 py-4 text-gray-600">{formatTrigger(automation.nodes, crmStages, boards)}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(automation.status)}`}>
                                        {automation.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{new Date(automation.createdAt).toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4 flex items-center justify-end space-x-3">
                                    <button
                                        onClick={() => toggleStatus(automation)}
                                        className={`p-1 rounded-full transition-colors ${automation.status === AutomationStatus.DRAFT ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-amber-600'}`}
                                        title={automation.status === AutomationStatus.ACTIVE ? "Pausar" : "Ativar"}
                                        disabled={automation.status === AutomationStatus.DRAFT}
                                    >
                                        {automation.status === AutomationStatus.ACTIVE ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                                    </button>
                                    <button onClick={() => navigate(`/automacoes/${automation.id}`)} className="text-gray-500 hover:text-amber-600 p-1 rounded-full transition-colors" title="Editar">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(automation.id)} className="text-gray-500 hover:text-red-600 p-1 rounded-full transition-colors" title="Remover">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {automations.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">
                                    Nenhuma automação criada ainda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {isModalOpen && (
                <CreateAutomationModal 
                    onClose={() => setIsModalOpen(false)}
                    onNavigate={(id) => {
                        setIsModalOpen(false);
                        navigate(`/automacoes/${id}`);
                    }}
                    addAutomation={addAutomation}
                />
            )}
        </div>
    );
}

export default AutomationsPage;