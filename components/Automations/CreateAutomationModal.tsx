import React, { useState } from 'react';
import { SparklesIcon, XMarkIcon } from '../icons';
import { AutomationStatus } from '../../types';

interface CreateAutomationModalProps {
    onClose: () => void;
    onNavigate: (id: string) => void;
    addAutomation: (details: {
        name: string;
        status: AutomationStatus;
        allowReactivation: boolean;
        blockOnOpenChat: boolean;
    }) => Promise<{ id: string }>;
}

export const CreateAutomationModal = ({ onClose, onNavigate, addAutomation }: CreateAutomationModalProps) => {
    const [step, setStep] = useState<'choice' | 'details'>('choice');
    
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [allowReactivation, setAllowReactivation] = useState(true);
    const [blockOnOpenChat, setBlockOnOpenChat] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            alert('O nome da automação é obrigatório.');
            return;
        }
        const newAutomation = await addAutomation({
            name,
            status: isActive ? AutomationStatus.ACTIVE : AutomationStatus.PAUSED,
            allowReactivation,
            blockOnOpenChat,
        });
        onNavigate(newAutomation.id);
    };
    
    const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: (checked: boolean) => void, label: string }) => (
         <div className="flex items-center justify-between w-full">
            <span className="text-gray-700">{label}</span>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                checked ? 'bg-amber-600' : 'bg-gray-300'
                }`}
            >
                <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
                />
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl p-8 w-full max-w-md transform transition-all shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100">
                    <XMarkIcon className="w-6 h-6 text-gray-500" />
                </button>

                {step === 'choice' && (
                    <>
                        <div className="text-center mb-6">
                            <span className="inline-block p-3 bg-amber-100 rounded-full mb-3">
                                <SparklesIcon className="w-8 h-8 text-amber-600" />
                            </span>
                            <h2 className="text-2xl font-bold text-gray-900">Cadastrar Automação</h2>
                            <p className="text-gray-500 mt-1">Selecione uma das opções abaixo para iniciar a configuração da sua automação.</p>
                        </div>
                        <div className="space-y-3">
                            <button onClick={() => setStep('details')} className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 hover:border-amber-500 transition-all">
                                <h3 className="font-bold text-gray-800">✨ Começar do zero</h3>
                                <p className="text-sm text-gray-600">Crie sua automação do zero, personalize cada detalhe e alcance seus clientes com mais eficiência!</p>
                            </button>
                             <button className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 hover:border-amber-500 transition-all disabled:opacity-50 cursor-not-allowed">
                                <h3 className="font-bold text-gray-800">📋 Escolher um template pronto</h3>
                                <p className="text-sm text-gray-600">Nossos templates prontos são feitos para impulsionar seus resultados.</p>
                            </button>
                             <button className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 hover:border-amber-500 transition-all disabled:opacity-50 cursor-not-allowed">
                                <h3 className="font-bold text-gray-800">🔗 Importar de outra conexão</h3>
                                <p className="text-sm text-gray-600">Importe automações de outras contas da sua empresa.</p>
                            </button>
                             <button className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 hover:border-amber-500 transition-all disabled:opacity-50 cursor-not-allowed">
                                <h3 className="font-bold text-gray-800">📄 Importar Template (JSON)</h3>
                                <p className="text-sm text-gray-600">Importe automações diretamente de arquivos JSON.</p>
                            </button>
                        </div>
                    </>
                )}

                {step === 'details' && (
                    <>
                         <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastrar Automação</h2>
                         <p className="text-gray-500 mb-6">Escolha um nome para sua automação.</p>
                        <div className="space-y-6">
                            <input 
                                type="text"
                                placeholder="Nome da sua automação"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-3 text-gray-800 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-amber-500"
                            />
                            <div className="space-y-4">
                                <ToggleSwitch checked={isActive} onChange={setIsActive} label="Ativo"/>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3">Configurações</h3>
                                <div className="space-y-4">
                                    <ToggleSwitch checked={allowReactivation} onChange={setAllowReactivation} label="Permitir reativação de fluxo?"/>
                                    <ToggleSwitch checked={blockOnOpenChat} onChange={setBlockOnOpenChat} label="Bloquear contato com chat aberto?"/>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-4 mt-8">
                            <button onClick={() => setStep('choice')} className="font-semibold text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">Voltar</button>
                            <button onClick={handleSave} className="font-semibold text-white bg-amber-600 px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors">Salvar</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};