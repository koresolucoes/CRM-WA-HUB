
import React, { useState } from 'react';
import type { CrmStage } from '../../types';
import ContactCard from './ContactCard';

const CrmStageColumn: React.FC<{
    stage: CrmStage;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, cardId: string, sourceStageId: string) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, destinationStageId: string) => void;
}> = ({ stage, onDragStart, onDrop }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div
            className="flex-shrink-0 w-80 bg-gray-100 rounded-xl p-1"
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { onDrop(e, stage.id); setIsDragOver(false); }}
        >
            <div className={`p-3 transition-colors duration-300 rounded-lg ${isDragOver ? 'bg-amber-100' : ''}`}>
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="font-bold text-gray-800">{stage.title}</h3>
                    <span className="text-sm font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded-md">{stage.cards.length}</span>
                </div>
                <div className="h-[calc(100vh-22rem)] overflow-y-auto px-1">
                    {stage.cards.map(contact => (
                        <ContactCard
                            key={contact.id}
                            contact={contact}
                            onDragStart={(e, contactId) => onDragStart(e, contactId, stage.id)}
                        />
                    ))}
                    {isDragOver && (
                        <div className="h-20 border-2 border-dashed border-amber-400 bg-amber-50 rounded-lg mt-2"></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(CrmStageColumn);
