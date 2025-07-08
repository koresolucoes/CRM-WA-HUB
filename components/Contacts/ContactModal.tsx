import React from 'react';
import type { Contact } from '../../types';
import { formFieldClasses } from '../ui/styleConstants';
import { TagInput } from './TagInput';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (e: React.FormEvent) => void;
    editingContact: Contact | null;
    formState: Omit<Contact, 'id' | 'lastInteraction' | 'is24hWindowOpen'>;
    handleFormChange: (field: string, value: any) => void;
    allTags: string[];
}

export const ContactModal = ({ isOpen, onClose, onSave, editingContact, formState, handleFormChange, allTags }: ContactModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white rounded-lg p-8 w-full max-w-lg transform transition-all">
            <h2 className="text-xl font-bold mb-6">{editingContact ? 'Editar Contato' : 'Adicionar Novo Contato'}</h2>
            <form onSubmit={onSave} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                <input type="text" name="name" id="name" value={formState.name} onChange={e => handleFormChange('name', e.target.value)} required className={`mt-1 ${formFieldClasses}`} />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefone (com código do país)</label>
                <input type="tel" name="phone" id="phone" value={formState.phone} onChange={e => handleFormChange('phone', e.target.value)} placeholder="+55 11 98765-4321" required className={`mt-1 ${formFieldClasses}`} />
              </div>
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <TagInput
                  selectedTags={formState.tags}
                  allTags={allTags}
                  onChange={(newTags) => handleFormChange('tags', newTags)}
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition duration-300">{editingContact ? 'Salvar Alterações' : 'Salvar Contato'}</button>
              </div>
            </form>
          </div>
        </div>
    );
};
