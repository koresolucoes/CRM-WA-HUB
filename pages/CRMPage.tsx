
import React, { useState, useEffect, useCallback } from 'react';
import { getBoards, createBoard, updateBoard, deleteBoard, createRawBoard } from '../services/crmService';
import { getContacts, moveContactToCrmStage } from '../services/contactService';
import { runAutomations } from '../services/automationService';
import type { CrmBoard, CrmStage, Contact } from '../types';
import { Cog6ToothIcon } from '../components/icons';
import { searchService } from '../services/searchService';
import CrmStageColumn from '../components/CRM/CrmStageColumn';
import { ManageBoardsModal } from '../components/CRM/ManageBoardsModal';

// --- Main Page Component ---
function CRMPage(): React.ReactNode {
    const [boards, setBoards] = useState<CrmBoard[]>([]);
    const [allContacts, setAllContacts] = useState<Contact[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [populatedBoard, setPopulatedBoard] = useState<{ id: string; name: string; columns: CrmStage[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Effect for initial data loading and setup.
    useEffect(() => {
        const initialLoad = async () => {
            setIsLoading(true);
            setError(null);
            try {
                let boardsData = await getBoards();
                if (boardsData.length === 0) {
                    boardsData = [await createBoard("CRM Principal")];
                }
                const contactsData = await getContacts();
                
                setBoards(boardsData);
                setAllContacts(contactsData);
                setActiveBoardId(boardsData[0]?.id || null);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Falha ao carregar dados do CRM. Verifique sua conexão ou as configurações do Supabase.';
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        initialLoad();
    }, []);

    // Effect for handling subsequent data changes from other parts of the app.
    useEffect(() => {
        const handleDataRefresh = async () => {
            setError(null);
            try {
                const [boardsData, contactsData] = await Promise.all([
                    getBoards(),
                    getContacts(),
                ]);
                setBoards(boardsData);
                setAllContacts(contactsData);

                setActiveBoardId(currentId => {
                    if (currentId && boardsData.some(f => f.id === currentId)) {
                        return currentId;
                    }
                    return boardsData.length > 0 ? boardsData[0].id : null;
                });

            } catch (err) {
                 console.error("Error reloading CRM data:", err);
                 setError(err instanceof Error ? err.message : 'Falha ao recarregar dados do CRM.');
            }
        };
    
        window.addEventListener('localDataChanged', handleDataRefresh);
        return () => window.removeEventListener('localDataChanged', handleDataRefresh);
    }, []);
    
    const populateActiveBoard = useCallback(() => {
        if (!activeBoardId) {
            setPopulatedBoard(null);
            return;
        }
    
        const activeBoardData = boards.find(f => f.id === activeBoardId);
        if (!activeBoardData) return;
    
        const firstStageId = activeBoardData.columns.length > 0 ? activeBoardData.columns[0].id : null;
        const searchTerm = searchService.getSearchTerm().toLowerCase();
    
        const populatedStages = activeBoardData.columns.map(stageDef => {
            let stageContacts = allContacts.filter(contact => {
                const contactStageId = contact.crmStageId || firstStageId;
                return contactStageId === stageDef.id;
            });
    
            if (searchTerm) {
                stageContacts = stageContacts.filter(contact =>
                    contact.name.toLowerCase().includes(searchTerm) ||
                    contact.phone.toLowerCase().includes(searchTerm)
                );
            }
    
            return { ...stageDef, cards: stageContacts };
        });
    
        setPopulatedBoard({ ...activeBoardData, columns: populatedStages });
    }, [activeBoardId, boards, allContacts]);
    
    useEffect(() => {
        populateActiveBoard();
        const unsubscribe = searchService.subscribe(() => populateActiveBoard());
        return () => unsubscribe();
    }, [populateActiveBoard]);


    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, contactId: string, sourceStageId: string) => {
        e.dataTransfer.setData("contactId", contactId);
        e.dataTransfer.setData("sourceStageId", sourceStageId);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, destinationStageId: string) => {
        e.preventDefault();
        const contactIdStr = e.dataTransfer.getData("contactId");
        const sourceStageId = e.dataTransfer.getData("sourceStageId");

        if (sourceStageId === destinationStageId || !contactIdStr) return;
        
        const contactId = parseInt(contactIdStr, 10);
        const destinationStage = populatedBoard?.columns.find(c => c.id === destinationStageId);

        if (destinationStage) {
            await moveContactToCrmStage(contactId, destinationStage);
            
            const boardContainingStage = boards.find(b => b.id === activeBoardId);
            await runAutomations('crm_stage_changed', {
                contactId: contactId,
                stage: destinationStage,
                board: boardContainingStage ? { id: boardContainingStage.id, name: boardContainingStage.name } : undefined,
            });
        }
    };
    
    const handleCommitChanges = async (finalBoards: CrmBoard[]) => {
        const originalBoards = boards;
        
        const originalBoardIds = new Set(originalBoards.map(b => b.id));
        const finalBoardIds = new Set(finalBoards.map(b => b.id));
    
        const boardsToDelete = originalBoards.filter(b => !finalBoardIds.has(b.id));
        const boardsToAdd = finalBoards.filter(b => !originalBoardIds.has(b.id));
        const boardsToUpdate = finalBoards.filter(b => originalBoardIds.has(b.id));
    
        const promises: Promise<any>[] = [];
    
        boardsToDelete.forEach(board => promises.push(deleteBoard(board.id)));
        boardsToAdd.forEach(board => promises.push(createRawBoard(board)));
        boardsToUpdate.forEach(board => {
            const originalBoard = originalBoards.find(b => b.id === board.id);
            if (JSON.stringify(originalBoard) !== JSON.stringify(board)) {
                promises.push(updateBoard(board));
            }
        });
        
        try {
            await Promise.all(promises);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao salvar as alterações do board.');
        } finally {
            setIsModalOpen(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">CRM</h1>
                    <p className="text-gray-500 mt-1">Arraste e solte os contatos e configure automações para cada etapa.</p>
                </div>
                 <div className="flex items-center space-x-3">
                    <select
                        value={activeBoardId || ''}
                        onChange={e => setActiveBoardId(e.target.value)}
                        className="w-full max-w-xs p-2 border-gray-300 rounded-lg shadow-sm focus:border-amber-500 focus:ring-amber-500"
                        disabled={isLoading}
                    >
                        {boards.map(board => (
                            <option key={board.id} value={board.id}>{board.name}</option>
                        ))}
                    </select>
                    <button onClick={() => setIsModalOpen(true)} className="bg-white text-gray-700 border border-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 transition duration-300 flex items-center">
                        <Cog6ToothIcon className="w-5 h-5 mr-2" />
                        Gerenciar Boards
                    </button>
                </div>
            </div>

            <div className="flex-grow mt-6">
                {isLoading ? (
                    <div className="text-center text-gray-500">Carregando CRM...</div>
                ) : error ? (
                    <div className="m-auto p-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg max-w-xl">
                        <p className="font-bold">Ocorreu um erro ao carregar o CRM</p>
                        <p className="mt-2">{error}</p>
                        <p className="text-xs mt-4 text-gray-600">Isso pode acontecer se a tabela 'funnels' não existir no banco de dados ou se as políticas de acesso (RLS) não permitirem a leitura. Verifique o console do navegador para mais detalhes.</p>
                    </div>
                ) : populatedBoard && populatedBoard.columns.length > 0 ? (
                    <div className="flex space-x-6 overflow-x-auto pb-4 h-full">
                        {populatedBoard.columns.map(stage => (
                            <CrmStageColumn
                                key={stage.id}
                                stage={stage}
                                onDragStart={handleDragStart}
                                onDrop={handleDrop}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 pt-10">
                        <p className="font-bold">Nenhuma etapa neste board.</p>
                        <p>Use o botão "Gerenciar Boards" para adicionar etapas.</p>
                    </div>
                )}
            </div>
            
            {isModalOpen && (
                <ManageBoardsModal
                    boards={boards}
                    onClose={() => setIsModalOpen(false)}
                    onCommitChanges={handleCommitChanges}
                />
            )}
        </div>
    );
}

export default CRMPage;
