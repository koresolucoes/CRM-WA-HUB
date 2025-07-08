import { CampaignStatus } from '../../types';

export const getStatusClass = (status: CampaignStatus) => {
  switch (status) {
    case CampaignStatus.CONCLUIDA: return 'bg-green-100 text-green-800';
    case CampaignStatus.ENVIANDO: return 'bg-blue-100 text-blue-800 animate-pulse';
    case CampaignStatus.AGENDADA: return 'bg-yellow-100 text-yellow-800';
    case CampaignStatus.PAUSADA: return 'bg-orange-100 text-orange-800';
    case CampaignStatus.FALHA: return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
