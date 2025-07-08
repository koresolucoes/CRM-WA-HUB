
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CarouselImage } from '../../../types';
import { TrashIcon } from '../../icons';
import { formFieldClasses } from '../../ui/styleConstants';


const ImageCarouselEditor = ({ images = [], onChange }: { images: CarouselImage[], onChange: (newImages: CarouselImage[]) => void }) => {
    const updateItem = (id: string, prop: keyof CarouselImage, value: string) => {
        onChange(images.map(img => img.id === id ? { ...img, [prop]: value } : img));
    };
    const addItem = () => {
        const newItem: CarouselImage = { id: uuidv4(), src: '', 'alt-text': 'Nova Imagem' };
        onChange([...images, newItem]);
    };
    const removeItem = (id: string) => {
        onChange(images.filter(img => img.id !== id));
    };

    return (
        <div className="space-y-2">
            {images.map((item) => (
                <div key={item.id} className="flex items-start space-x-2 bg-gray-50 p-2 rounded-md border">
                    <div className="space-y-2 flex-grow">
                        <textarea placeholder="URL da Imagem (Base64)" value={item.src} onChange={e => updateItem(item.id, 'src', e.target.value)} className={`${formFieldClasses} h-16`} />
                        <input type="text" placeholder="Texto Alternativo" value={item['alt-text']} onChange={e => updateItem(item.id, 'alt-text', e.target.value)} className={formFieldClasses} />
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                </div>
            ))}
            <button onClick={addItem} className="text-sm font-semibold text-amber-600 hover:underline">+ Adicionar Imagem</button>
        </div>
    );
};

export default ImageCarouselEditor;
