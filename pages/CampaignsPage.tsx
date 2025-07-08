import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Campaign, MessageTemplate, BodyComponent, CampaignLog } from '../types';
import { CampaignStatus } from '../types';
import { SparklesIcon, PauseIcon, PlayIcon, TrashIcon } from '../components/icons';
import { optimizeMessageWithGemini } from '../services/geminiService';
import { getMessageTemplates, getActiveConnection, sendMessage } from '../services/metaService';
import { getContacts } from '../services/contactService';
import { getCampaigns, getCampaignById, addCampaign, updateCampaign, deleteCampaign, addCampaignLog } from '../services/campaignService';
import { searchService } from '../services/searchService';
import { formFieldClasses } from '../components/ui/styleConstants';
import { getStatusClass } from '../components/Campaigns/utils';
import { CampaignDetailsModal } from '../components/Campaigns/CampaignDetailsModal';

function CampaignsPage(): React.ReactNode {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [recipientType, setRecipientType] = useState<'all' | 'tag'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);

  // AI optimization state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState('');

  // Template fetching state
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState('');

  const approvedTemplates = useMemo(() => 
    templates.filter(t => t.status === 'APPROVED'), 
    [templates]
  );
  
  const processCampaign = useCallback(async (campaignId: number) => {
    let campaign = await getCampaignById(campaignId);
    if (!campaign || campaign.status !== CampaignStatus.ENVIANDO) return;
    
    const activeConnection = await getActiveConnection();
    if (!activeConnection) {
        await addCampaignLog(campaignId, { message: "Envio falhou: Nenhuma conexão ativa com a Meta.", type: 'error' });
        campaign = await getCampaignById(campaignId);
        if(campaign) await updateCampaign({ ...campaign, status: CampaignStatus.FALHA });
        return;
    }
    
    const template = approvedTemplates.find(t => t.id === campaign!.templateId);
    if (!template) {
        await addCampaignLog(campaignId, { message: "Envio falhou: Template não encontrado ou não está aprovado.", type: 'error' });
        campaign = await getCampaignById(campaignId);
        if(campaign) await updateCampaign({ ...campaign, status: CampaignStatus.FALHA });
        return;
    }

    const allContacts = await getContacts();
    const targetContacts = campaign.target.type === 'all'
        ? allContacts
        : allContacts.filter(c => c.tags.includes(campaign!.target.value!));

    const contactsToProcess = targetContacts.slice(campaign.sentCount + campaign.failedCount);
    const bodyComponent = template.components.find(c => c.type === 'BODY') as BodyComponent | undefined;

    for (const contact of contactsToProcess) {
        let currentCampaignState = await getCampaignById(campaignId);
        if (!currentCampaignState || currentCampaignState.status !== CampaignStatus.ENVIANDO) {
            await addCampaignLog(campaignId, { message: 'Processo de envio interrompido.', type: 'info' });
            break; 
        }

        let components: any[] = [];
        if (bodyComponent && bodyComponent.text.includes('{{1}}')) {
            components.push({ type: 'body', parameters: [{ type: 'text', text: contact.name }] });
        }

        try {
            await sendMessage(activeConnection, { recipient: contact.phone, templateName: template.name, languageCode: template.language, components });
            await addCampaignLog(campaignId, { message: `Enviado para ${contact.name} (${contact.phone})`, type: 'success' });
            currentCampaignState.sentCount++;
        } catch (error) {
            console.error(`Falha ao enviar para ${contact.name}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            await addCampaignLog(campaignId, { message: `Falha para ${contact.name}: ${errorMessage}`, type: 'error' });
            currentCampaignState.failedCount++;
        }
        
        await updateCampaign(currentCampaignState);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const finalCampaignState = await getCampaignById(campaignId);
    if (finalCampaignState && finalCampaignState.status === CampaignStatus.ENVIANDO && finalCampaignState.sentCount + finalCampaignState.failedCount === finalCampaignState.totalCount) {
        await addCampaignLog(campaignId, { message: 'Campanha concluída.', type: 'info' });
        await updateCampaign({ ...finalCampaignState, status: CampaignStatus.CONCLUIDA });
        window.dispatchEvent(new CustomEvent('localDataChanged')); // Final update for dashboard etc.
    }

  }, [approvedTemplates]);

  const refreshCampaigns = useCallback(async () => {
      const currentCampaigns = await getCampaigns();
      setCampaigns(currentCampaigns);
      if (selectedCampaign) {
          const updatedSelected = currentCampaigns.find(c => c.id === selectedCampaign.id);
          setSelectedCampaign(updatedSelected || null);
      }
  }, [selectedCampaign]);

  useEffect(() => {
    // This listener ensures that any background update to campaigns is reflected in the UI.
    window.addEventListener('localDataChanged', refreshCampaigns);

    // When the component mounts, check if any campaigns are in 'ENVIANDO' state and restart their processing.
    const startPendingCampaigns = async () => {
      const campaignsToProcess = (await getCampaigns()).filter(c => c.status === CampaignStatus.ENVIANDO);
      for (const campaign of campaignsToProcess) {
          processCampaign(campaign.id);
      }
    };

    refreshCampaigns();
    startPendingCampaigns();
    
    return () => {
        window.removeEventListener('localDataChanged', refreshCampaigns);
    };
  }, [processCampaign, refreshCampaigns]);


  useEffect(() => {
    const handleSearch = (searchTerm: string) => {
      const lowercasedTerm = searchTerm.toLowerCase();
      setFilteredCampaigns(campaigns.filter(c => c.name.toLowerCase().includes(lowercasedTerm)));
    };
    setFilteredCampaigns(campaigns);
    const unsubscribe = searchService.subscribe(handleSearch);
    return () => unsubscribe();
  }, [campaigns]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const allContacts = await getContacts();
      const tags = new Set<string>();
      allContacts.forEach(c => c.tags.forEach(tag => tags.add(tag)));
      setAllTags(Array.from(tags));
      if (tags.size > 0 && !selectedTag) setSelectedTag(Array.from(tags)[0]);
      
      if(templates.length > 0) return;

      const activeConnection = await getActiveConnection();
      if (!activeConnection) {
        setTemplateError('Nenhuma conexão com a Meta está ativa.');
        return;
      }
      setIsLoadingTemplates(true);
      setTemplateError('');
      try {
        const fetchedTemplates = await getMessageTemplates(activeConnection);
        setTemplates(fetchedTemplates);
      } catch (error) {
        setTemplateError(error instanceof Error ? error.message : 'Falha ao buscar modelos.');
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    if (isModalOpen || isDetailsModalOpen) {
      fetchInitialData();
    }
  }, [isModalOpen, isDetailsModalOpen, selectedTag, templates.length]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    const template = approvedTemplates.find(t => t.id === templateId);
    setMessageContent(template ? (template.components.find(c => c.type === 'BODY') as BodyComponent)?.text || '' : '');
  };
  
  const handleOptimize = async () => {
    if (!messageContent) return;
    setIsOptimizing(true);
    setOptimizationError('');
    try {
      const optimizedText = await optimizeMessageWithGemini(messageContent);
      setMessageContent(optimizedText);
    } catch (error) {
      console.error("Erro ao otimizar mensagem:", error);
      setOptimizationError('Falha ao otimizar a mensagem. Tente novamente.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName || !selectedTemplateId) return;
    
    const allContacts = await getContacts();
    const targetContacts = recipientType === 'all'
        ? allContacts
        : allContacts.filter(c => c.tags.includes(selectedTag));
        
    if (targetContacts.length === 0) {
        alert('Nenhum contato encontrado para o segmento selecionado.');
        return;
    }

    const newCampaignData: Omit<Campaign, 'id'> = {
        name: campaignName,
        status: CampaignStatus.ENVIANDO,
        sentCount: 0,
        failedCount: 0,
        totalCount: targetContacts.length,
        readRate: 0,
        sentDate: new Date().toISOString().split('T')[0],
        templateId: selectedTemplateId,
        target: { type: recipientType, value: recipientType === 'tag' ? selectedTag : null },
        logs: [{ timestamp: new Date().toISOString(), message: 'Campanha criada e iniciada.', type: 'info' }]
    };
    
    const newCampaign = await addCampaign(newCampaignData);
    setIsModalOpen(false);
    processCampaign(newCampaign.id);
  };

  const handlePauseToggle = async (campaign: Campaign) => {
    const isPaused = campaign.status === CampaignStatus.PAUSADA;
    const newStatus = isPaused ? CampaignStatus.ENVIANDO : CampaignStatus.PAUSADA;
    await updateCampaign({ ...campaign, status: newStatus });
    await addCampaignLog(campaign.id, { message: `Campanha ${isPaused ? 'retomada' : 'pausada'} pelo usuário.`, type: 'info' });
    if (isPaused) {
        processCampaign(campaign.id);
    }
  };

  const handleDeleteCampaign = async (campaignId: number) => {
    // The sandbox environment blocks confirm(). Removing it to fix functionality.
    await deleteCampaign(campaignId);
  };

  const openModal = () => {
    setCampaignName('');
    setSelectedTemplateId('');
    setMessageContent('');
    setRecipientType('all');
    setOptimizationError('');
    setIsOptimizing(false);
    setIsModalOpen(true);
  };
  
  const handleViewDetails = (campaign: Campaign) => {
      setSelectedCampaign(campaign);
      setIsDetailsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Campanhas</h1>
          <p className="text-gray-500 mt-1">Gerencie, crie e agende seus disparos.</p>
        </div>
        <button onClick={openModal} className="bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-amber-700 transition duration-300 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          Criar Campanha
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">Nome da Campanha</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3">Progresso</th>
              <th scope="col" className="px-6 py-3">Data de Envio</th>
              <th scope="col" className="px-6 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.length > 0 ? (
              filteredCampaigns.map((campaign) => (
              <tr key={campaign.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{campaign.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {(campaign.status !== CampaignStatus.RASCUNHO && campaign.status !== CampaignStatus.AGENDADA) && campaign.totalCount > 0 ? (
                    <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 flex overflow-hidden">
                            <div className="bg-green-500" style={{ width: `${(campaign.sentCount / campaign.totalCount) * 100}%` }}></div>
                            <div className="bg-red-500" style={{ width: `${(campaign.failedCount / campaign.totalCount) * 100}%` }}></div>
                        </div>
                        <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                            {campaign.sentCount + campaign.failedCount} / {campaign.totalCount}
                            {campaign.failedCount > 0 && <span className="text-red-600"> ({campaign.failedCount} falhas)</span>}
                        </span>
                    </div>
                  ) : ('-')}
                </td>
                <td className="px-6 py-4">{campaign.sentDate}</td>
                <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                        <button onClick={() => handleViewDetails(campaign)} className="font-medium text-amber-600 hover:underline focus:outline-none">Detalhes</button>
                        {(campaign.status === CampaignStatus.ENVIANDO || campaign.status === CampaignStatus.PAUSADA) && (
                            <button onClick={() => handlePauseToggle(campaign)} className="p-1 text-gray-500 hover:text-amber-600" title={campaign.status === CampaignStatus.PAUSADA ? 'Retomar' : 'Pausar'}>
                                {campaign.status === CampaignStatus.PAUSADA ? <PlayIcon className="w-5 h-5"/> : <PauseIcon className="w-5 h-5"/>}
                            </button>
                        )}
                        {(campaign.status === CampaignStatus.RASCUNHO || campaign.status === CampaignStatus.CONCLUIDA || campaign.status === CampaignStatus.FALHA) && (
                            <button onClick={() => handleDeleteCampaign(campaign.id)} className="p-1 text-gray-500 hover:text-red-600" title="Excluir">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </td>
              </tr>
            ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-500">
                  Nenhum resultado encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isDetailsModalOpen && <CampaignDetailsModal campaign={selectedCampaign} onClose={() => setIsDetailsModalOpen(false)} templates={templates} />}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <form onSubmit={handleCreateCampaign} className="bg-white rounded-lg p-8 w-full max-w-2xl transform transition-all">
            <h2 className="text-xl font-bold mb-4">Criar Nova Campanha</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Nome da Campanha" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} required className={formFieldClasses} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destinatários</label>
                <div className="flex items-center space-x-4">
                    <label className="flex items-center"><input type="radio" value="all" checked={recipientType === 'all'} onChange={() => setRecipientType('all')} className="h-4 w-4 text-amber-600 border-gray-300 focus:ring-amber-500"/><span className="ml-2">Todos os Contatos</span></label>
                    <label className="flex items-center"><input type="radio" value="tag" checked={recipientType === 'tag'} onChange={() => setRecipientType('tag')} className="h-4 w-4 text-amber-600 border-gray-300 focus:ring-amber-500"/><span className="ml-2">Segmentar por Tag</span></label>
                </div>
                 {recipientType === 'tag' && (<select value={selectedTag} onChange={e => setSelectedTag(e.target.value)} className={`mt-2 ${formFieldClasses}`} required><option value="" disabled>Selecione uma tag</option>{allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}</select>)}
              </div>
               {isLoadingTemplates ? (<div className="text-center py-2 text-gray-500">Carregando modelos...</div>)
               : templateError ? (<div className="text-red-500 text-sm">{templateError}</div>)
               : (<select value={selectedTemplateId} onChange={handleTemplateChange} required className={formFieldClasses}><option value="">Selecione um Modelo de Mensagem</option>{approvedTemplates.map(template => (<option key={template.id} value={template.id}>{template.name}</option>))}</select>)}
              <div className="relative">
                <textarea value={messageContent} onChange={(e) => setMessageContent(e.target.value)} placeholder="Selecione um modelo para ver e otimizar a mensagem. A variável {{1}} será substituída pelo nome do contato." className={`${formFieldClasses} h-40 resize-none`} readOnly={!selectedTemplateId}></textarea>
                <button type="button" onClick={handleOptimize} disabled={isOptimizing || !messageContent} className="absolute bottom-4 right-3 bg-amber-100 text-amber-600 px-3 py-1 rounded-md text-sm font-semibold flex items-center hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"><SparklesIcon className={`w-4 h-4 mr-1.5 ${isOptimizing ? 'animate-spin' : ''}`} />{isOptimizing ? 'Otimizando...' : 'Otimizar com IA'}</button>
              </div>
              {optimizationError && <p className="text-red-500 text-sm">{optimizationError}</p>}
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-white bg-amber-600 rounded hover:bg-amber-700">Criar e Iniciar Disparo</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default CampaignsPage;