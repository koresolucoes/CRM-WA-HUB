
import React, { useState, useEffect, useMemo } from 'react';
import type { CrmBoard, CrmStage } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { XMarkIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, PlusIcon, TagIcon } from '../icons';
import { formFieldClasses } from '../ui/styleConstants';

export const ManageBoardsModal = ({ boards, onClose, onCommitChanges }: { boards: CrmBoard[], onClose: () => void, onCommitChanges: (finalBoards: CrmBoard[]) => void }) => {
    const [draftBoards, setDraftBoards] = useState<CrmBoard[]>([]);
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
    const [newBoardName, setNewBoardName] = useState('');
    const [newStageName, setNewStageName] = useState('');

    useEffect(() => {
        // Deep copy to create a mutable draft
        const initialDrafts = JSON.parse(JSON.stringify(boards));
        setDraftBoards(initialDrafts);
        if (initialDrafts.length > 0) {
            setSelectedBoardId(initialDrafts[0].id);
        }
    }, [boards]);

    const selectedBoard = useMemo(() => draftBoards.find(b => b.id === selectedBoardId), [draftBoards, selectedBoardId]);

    const handleStageChange = (index: number, data: Partial<Omit<CrmStage, 'id' | 'cards'>>) => {
        if (!selectedBoard) return;
        setDraftBoards(prevDrafts => prevDrafts.map(b => {
            if (b.id !== selectedBoard.id) return b;
            const updatedStages = [...b.columns];
            updatedStages[index] = { ...updatedStages[index], ...data };
            return { ...b, columns: updatedStages };
        }));
    };

    const handleAddStage = () => {
        if (!newStageName.trim() || !selectedBoard) return;
        const newStage = { id: uuidv4(), title: newStageName.trim(), tagsToApply: [] };
        setDraftBoards(prevDrafts => prevDrafts.map(b => 
            b.id === selectedBoard.id ? { ...b, columns: [...b.columns, newStage] } : b
        ));
        setNewStageName('');
    };

    const handleRemoveStage = (index: number) => {
        if (!selectedBoard) return;
        setDraftBoards(prevDrafts => prevDrafts.map(b => 
            b.id === selectedBoard.id ? { ...b, columns: b.columns.filter((_, i) => i !== index) } : b
        ));
    };

    const handleMoveStage = (index: number, direction: 'up' | 'down') => {
        if (!selectedBoard) return;
        const newStages = [...selectedBoard.columns];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newStages.length) return;
        [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];
        setDraftBoards(prevDrafts => prevDrafts.map(b => 
            b.id === selectedBoard.id ? { ...b, columns: newStages } : b
        ));
    };

    const handleAddBoard = () => {
        if (!newBoardName.trim()) return;
        const newBoard = { id: uuidv4(), name: newBoardName.trim(), columns: [] };
        setDraftBoards(prev => [...prev, newBoard]);
        setSelectedBoardId(newBoard.id);
        setNewBoardName('');
    };
    
    const handleDeleteBoard = () => {
        if (!selectedBoard || !window.confirm(`Tem certeza que deseja apagar o board "${selectedBoard.name}"? As alterações só serão salvas ao confirmar no final.`)) return;
        
        setDraftBoards(prev => prev.filter(b => b.id !== selectedBoard.id));
        setSelectedBoardId(draftBoards[0]?.id || null);
    };


    if (!selectedBoard) {
         return (
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-2xl transform transition-all shadow-2xl relative">
                     <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100">
                        <XMarkIcon className="w-6 h-6 text-gray-500" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Gerenciar Boards do CRM</h2>
                    <p>Nenhum board criado ainda. Crie o primeiro para começar.</p>
                     <div className="flex items-center space-x-2 mt-4">
                        <input type="text" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} placeholder="Nome do Novo Board" className={formFieldClasses} />
                        <button onClick={handleAddBoard} className="bg-amber-600 text-white p-2 rounded-lg hover:bg-amber-700 flex-shrink-0"><PlusIcon className="w-5 h-5"/></button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-3xl transform transition-all shadow-2xl relative max-h-[90vh] flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100">
                    <XMarkIcon className="w-6 h-6 text-gray-500" />
                </button>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Gerenciar Boards do CRM</h2>
                
                <div className="flex-grow flex space-x-6 overflow-hidden">
                    {/* Left: Board List */}
                    <div className="w-1/3 border-r pr-6 flex flex-col">
                        <div className="flex-grow space-y-2 overflow-y-auto">
                        {draftBoards.map(board => (
                            <button key={board.id} onClick={() => setSelectedBoardId(board.id)} className={`w-full text-left p-2 rounded-md text-sm font-medium ${selectedBoard.id === board.id ? 'bg-amber-100 text-amber-700' : 'hover:bg-gray-100'}`}>
                                {board.name}
                            </button>
                        ))}
                        </div>
                         <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
                            <input type="text" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} placeholder="Nome do Novo Board" className={`${formFieldClasses} text-sm`} />
                            <button onClick={handleAddBoard} className="bg-amber-600 text-white p-2 rounded-lg hover:bg-amber-700 flex-shrink-0"><PlusIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                    {/* Right: Stage Editor */}
                    <div className="w-2/3 flex flex-col">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Editando: {selectedBoard.name}</h3>
                         <div className="flex-grow space-y-3 overflow-y-auto pr-2">
                            {selectedBoard.columns.map((col, index) => (
                                <div key={col.id} className="flex items-start space-x-2 bg-gray-50 p-3 rounded-md">
                                    <div className="flex flex-col space-y-1 pt-2">
                                        <button onClick={() => handleMoveStage(index, 'up')} disabled={index === 0} className="disabled:opacity-30"><ArrowUpIcon className="w-4 h-4"/></button>
                                        <button onClick={() => handleMoveStage(index, 'down')} disabled={index === selectedBoard.columns.length - 1} className="disabled:opacity-30"><ArrowDownIcon className="w-4 h-4"/></button>
                                    </div>
                                    <div className="w-full space-y-2">
                                        <input type="text" value={col.title} onChange={e => handleStageChange(index, { title: e.target.value })} className={formFieldClasses} />
                                        <div className="relative">
                                             <TagIcon className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                                             <input
                                                type="text"
                                                value={(col.tagsToApply || []).join(', ')}
                                                onChange={e => handleStageChange(index, { tagsToApply: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                                                placeholder="Tags para aplicar (ex: lead, vip)"
                                                className={`${formFieldClasses} pl-9`}
                                            />
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveStage(index)} className="p-2 text-gray-400 hover:text-red-500 self-start"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
                             <input type="text" value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="Nome da Nova Etapa" className={formFieldClasses} />
                             <button onClick={handleAddStage} className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 flex-shrink-0"><PlusIcon className="w-5 h-5"/></button>
                        </div>
                        <div className="mt-4 text-right">
                             <button onClick={handleDeleteBoard} className="text-sm font-semibold text-red-600 hover:text-red-800">Excluir Board</button>
                        </div>
                    </div>
                </div>
                 <div className="flex items-center justify-end space-x-4 mt-8 pt-4 border-t flex-shrink-0">
                    <button onClick={onClose} className="font-semibold text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">Cancelar</button>
                    <button onClick={() => onCommitChanges(draftBoards)} className="font-semibold text-white bg-amber-600 px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors">Salvar Alterações</button>
                </div>
            </div>
        </div>
    );
};
