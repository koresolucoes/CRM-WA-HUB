import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Contact, CrmStage, SheetContact } from '../types';
import { getContacts, addContact, updateContact, deleteContact, addMultipleContacts, parseCsv } from '../services/contactService';
import { getAllStages } from '../services/crmService';
import { PencilIcon, TrashIcon } from '../components/icons';
import { searchService } from '../services/searchService';
import { runAutomations } from '../services/automationService';
import { formFieldClasses } from '../components/ui/styleConstants';
import { ContactModal } from '../components/Contacts/ContactModal';
import { DeleteConfirmModal } from '../components/Contacts/DeleteConfirmModal';

const EMPTY_CONTACT_FORM: Omit<Contact, 'id' | 'lastInteraction' | 'is24hWindowOpen'> = {
    name: '',
    phone: '',
    tags: [],
};

function ContactsPage(): React.ReactNode {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [allStages, setAllStages] = useState<Omit<CrmStage, 'cards'>[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [formState, setFormState] = useState(EMPTY_CONTACT_FORM);
  
  const [tagsForImport, setTagsForImport] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [contactsData, stagesData] = await Promise.all([
        getContacts(),
        getAllStages()
      ]);
      setContacts(contactsData);
      setAllStages(stagesData);

      const uniqueTags = new Set<string>();
      contactsData.forEach(c => c.tags.forEach(tag => uniqueTags.add(tag)));
      setAllTags(Array.from(uniqueTags).sort());

    } catch(err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar dados.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('localDataChanged', loadData);
    return () => window.removeEventListener('localDataChanged', loadData);
  }, [loadData]);

  useEffect(() => {
    const handleSearch = (searchTerm: string) => {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = contacts.filter(contact =>
        contact.name.toLowerCase().includes(lowercasedTerm) ||
        contact.phone.toLowerCase().includes(lowercasedTerm)
      );
      setFilteredContacts(filtered);
    };

    setFilteredContacts(contacts);
    const unsubscribe = searchService.subscribe(handleSearch);
    
    return () => unsubscribe();
  }, [contacts]);

  const handleOpenAddModal = () => {
    setEditingContact(null);
    setFormState(EMPTY_CONTACT_FORM);
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormState({ ...contact, tags: contact.tags || [] });
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (contact: Contact) => {
    setContactToDelete(contact);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsModalOpen(false);
    setIsDeleteModalOpen(false);
    setEditingContact(null);
    setContactToDelete(null);
  };

  const handleFormChange = (field: keyof typeof formState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.phone) {
        alert("Nome e telefone são obrigatórios.");
        return;
    }

    const contactData = { ...formState };

    try {
        if (editingContact) {
            const oldContact = contacts.find(c => c.id === editingContact.id);
            await updateContact({ ...contactData, id: editingContact.id });
            
            // Manually trigger automations for added tags
            if (oldContact) {
                const oldTags = new Set(oldContact.tags || []);
                const addedTags = contactData.tags.filter(tag => !oldTags.has(tag));
                for (const addedTag of addedTags) {
                    await runAutomations('tag_added', { contactId: editingContact.id, tagName: addedTag });
                }
            }
        } else {
            const newContact = await addContact(contactData);
            // Manually trigger automations for new contact
            await runAutomations('contact_created', { contactId: newContact.id });
            if (newContact.tags.length > 0) {
                for (const tag of newContact.tags) {
                    await runAutomations('tag_added', { contactId: newContact.id, tagName: tag });
                }
            }
        }
    } catch (err) {
        alert(err instanceof Error ? err.message : "Falha ao salvar contato.");
    }

    handleCloseModals();
};
  
  const handleDeleteContact = async () => {
      if (contactToDelete) {
          await deleteContact(contactToDelete.id);
          handleCloseModals();
      }
  };
  
  const handleImportClick = () => {
    importInputRef.current?.click();
  };
  
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
            const text = event.target?.result as string;
            if (!text) throw new Error("O arquivo está vazio.");

            const parsedCsv = parseCsv(text);
            if (parsedCsv.length === 0) {
                throw new Error("Nenhum dado encontrado no arquivo. Verifique se ele contém um cabeçalho e pelo menos uma linha de dados.");
            }

            const headers = Object.keys(parsedCsv[0]);
            const requiredHeaders = ['nome', 'telefone'];
            if (!requiredHeaders.every(rh => headers.includes(rh))) {
                throw new Error(`O arquivo CSV deve conter as colunas "nome" e "telefone". Cabeçalhos encontrados: [${headers.join(', ')}]`);
            }
            
            const contactsFromCsv: SheetContact[] = parsedCsv
                .map(row => ({
                    name: row.nome || '',
                    phone: row.telefone || '',
                    ...row,
                }))
                .filter(contact => contact.name && contact.phone);

            if (contactsFromCsv.length === 0) {
                throw new Error("Nenhum contato válido (com nome e telefone) encontrado no arquivo.");
            }
            
            const tagsToApply = tagsForImport.split(',').map(t => t.trim()).filter(Boolean);
            
            await addMultipleContacts(contactsFromCsv, tagsToApply);
            
            alert(`${contactsFromCsv.length} contatos foram processados para importação. Contatos novos foram adicionados e os existentes foram ignorados.`);
            setTagsForImport(''); // Clear tags after import
            
        } catch (error) {
            alert(`Erro ao importar: ${error instanceof Error ? error.message : 'Erro desconhecido.'}`);
        } finally {
            // Reset file input to allow re-uploading the same file
            if(e.target) e.target.value = '';
        }
      };
      reader.onerror = () => {
        alert("Falha ao ler o arquivo.");
        if(e.target) e.target.value = '';
      }
      reader.readAsText(file);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Contatos</h1>
          <p className="text-gray-500 mt-1">Importe, gerencie e segmente seus contatos.</p>
        </div>
        <div className="flex items-center space-x-3">
            <input 
              type="text"
              value={tagsForImport}
              onChange={e => setTagsForImport(e.target.value)}
              placeholder="Tags para importar (opcional)"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
            />
            <input 
              type="file" 
              ref={importInputRef} 
              className="hidden" 
              onChange={handleFileImport}
              accept=".csv"
            />
            <button onClick={handleImportClick} className="bg-white text-gray-700 border border-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 transition duration-300">
                Importar CSV
            </button>
            <button onClick={handleOpenAddModal} className="bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-amber-700 transition duration-300">
                Adicionar Contato
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">Nome</th>
              <th scope="col" className="px-6 py-3">Telefone</th>
              <th scope="col" className="px-6 py-3">Tags</th>
              <th scope="col" className="px-6 py-3">Etapa do CRM</th>
              <th scope="col" className="px-6 py-3">Janela 24h</th>
              <th scope="col" className="px-6 py-3">Última Interação</th>
              <th scope="col" className="px-6 py-3"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center p-10 text-gray-500">Carregando contatos...</td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="text-center p-10 text-red-500">{error}</td></tr>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => {
              const crmStageName = allStages.find(stage => stage.id === contact.crmStageId)?.title || '—';
              const lastInteractionDate = contact.lastInteraction ? new Date(contact.lastInteraction).toLocaleDateString('pt-BR') : 'N/A';
              return (
                <tr key={contact.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{contact.name}</td>
                  <td className="px-6 py-4">{contact.phone}</td>
                  <td className="px-6 py-4">
                    {contact.tags.map(tag => (
                      <span key={tag} className="bg-gray-200 text-gray-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </td>
                  <td className="px-6 py-4">{crmStageName}</td>
                  <td className="px-6 py-4">
                    {contact.is24hWindowOpen ? (
                      <div className="flex items-center text-green-600">
                        <span className="relative flex h-3 w-3 mr-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        Aberta
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-500">
                        <span className="flex h-3 w-3 mr-2">
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
                        </span>
                        Fechada
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">{lastInteractionDate}</td>
                  <td className="px-6 py-4 flex items-center space-x-3">
                    <button onClick={() => handleOpenEditModal(contact)} className="text-gray-500 hover:text-amber-600 p-1 rounded-full transition-colors">
                        <PencilIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleOpenDeleteModal(contact)} className="text-gray-500 hover:text-red-600 p-1 rounded-full transition-colors">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              )
            })
            ) : (
                <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-500">
                    Nenhum contato encontrado.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      <ContactModal 
        isOpen={isModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveContact}
        editingContact={editingContact}
        formState={formState}
        handleFormChange={handleFormChange}
        allTags={allTags}
      />
      
      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={handleCloseModals}
        onDelete={handleDeleteContact}
        contactToDelete={contactToDelete}
      />
    </div>
  );
}

export default ContactsPage;