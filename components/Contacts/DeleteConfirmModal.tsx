import React from 'react';
import type { Contact } from '../../types';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => void;
    contactToDelete: Contact | null;
}

export const DeleteConfirmModal = ({ isOpen, onClose, onDelete, contactToDelete }: DeleteConfirmModalProps) => {
    if (!isOpen || !contactToDelete) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg p-8 w-full max-w-md transform transition-all text-center">
                <h2 className="text-xl font-bold mb-4">Confirmar Exclusão</h2>
                <p className="text-gray-600 mb-6">Tem certeza que deseja remover o contato "{contactToDelete.name}"? Esta ação não pode ser desfeita.</p>
                <div className="flex justify-center space-x-4">
                    <button onClick={onClose} className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-300">Cancelar</button>
                    <button onClick={onDelete} className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition duration-300">Remover</button>
                </div>
            </div>
        </div>
    );
};
