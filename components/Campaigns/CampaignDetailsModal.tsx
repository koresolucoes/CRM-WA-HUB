import React from 'react';
import type { Campaign, MessageTemplate, BodyComponent, CampaignLog } from '../../types';
import { XMarkIcon } from '../icons';
import { getStatusClass } from './utils';


const getLogIcon = (type: CampaignLog['type']) => {
    switch (type) {
        case 'success': return <div className="w-2 h-2 rounded-full bg-green-500"></div>;
        case 'error': return <div className="w-2 h-2 rounded-full bg-red-500"></div>;
        case 'info':
        default: return <div className="w-2 h-2 rounded-full bg-blue-500"></div>;
    }
};

export const CampaignDetailsModal = ({ campaign, onClose, templates }: { campaign: Campaign | null, onClose: () => void, templates: MessageTemplate[] }) => {
    if (!campaign) return null;
    
    const template = templates.find(t => t.id === campaign.templateId);
    const bodyComponent = template?.components.find(c => c.type === 'BODY') as BodyComponent | undefined;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl transform transition-all shadow-2xl relative flex flex-col max-h-[90vh]">
            <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100">
                <XMarkIcon className="w-6 h-6 text-gray-500" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{campaign.name}</h2>
            <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                 <div><span className="font-semibold">Status:</span> <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(campaign.status)}`}>{campaign.status}</span></div>
                 <div><span className="font-semibold">Enviados:</span> {campaign.sentCount}</div>
                 <div><span className="font-semibold">Falhas:</span> {campaign.failedCount}</div>
                 <div><span className="font-semibold">Total:</span> {campaign.totalCount}</div>
            </div>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                {/* Left: Template Preview */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-800">Modelo Utilizado</h3>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <p className="font-bold text-gray-700">{template?.name || 'Nome do Template'}</p>
                        <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{bodyComponent?.text || 'Corpo do modelo não encontrado.'}</p>
                    </div>
                </div>

                {/* Right: Logs */}
                <div className="space-y-2">
                    <h3 className="font-semibold text-gray-800">Histórico de Eventos</h3>
                    <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-xs overflow-y-auto max-h-96">
                        {campaign.logs && campaign.logs.length > 0 ? campaign.logs.map(log => (
                            <div key={log.timestamp} className="flex items-start mb-2">
                                <div className="flex-shrink-0 pt-1.5 pr-3">{getLogIcon(log.type)}</div>
                                <div>
                                    <span className="text-gray-400 mr-2">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                                    <span className={log.type === 'error' ? 'text-red-400' : 'text-gray-200'}>{log.message}</span>
                                </div>
                            </div>
                        )) : <p className="text-gray-400">Nenhum evento registrado.</p>}
                    </div>
                </div>
            </div>
            
             <div className="mt-6 flex-shrink-0 text-right">
                <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300">Fechar</button>
            </div>
          </div>
        </div>
    );
};