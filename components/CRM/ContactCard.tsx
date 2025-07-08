
import React from 'react';
import type { Contact } from '../../types';

const ContactCard: React.FC<{ contact: Contact, onDragStart: (e: React.DragEvent<HTMLDivElement>, contactId: string) => void }> = ({ contact, onDragStart }) => (
    <div
        draggable
        onDragStart={(e) => onDragStart(e, contact.id.toString())}
        className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-3 group cursor-grab active:cursor-grabbing"
    >
        <h4 className="font-bold text-gray-800">{contact.name}</h4>
        <p className="text-sm text-gray-600 my-1">{contact.phone}</p>
        <div className="flex flex-wrap gap-1 mt-2">
            {contact.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{tag}</span>
            ))}
            {contact.tags.length > 3 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">+{contact.tags.length - 3}</span>
            )}
        </div>
    </div>
);

export default React.memo(ContactCard);
