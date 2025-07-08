
import React from 'react';
import type { FooterComponent } from '../../types';
import { formFieldClasses } from '../ui/styleConstants';

const FooterEditor = ({ component, onChange }: { component: FooterComponent, onChange: (newComponent: FooterComponent) => void }) => (
    <input type="text" value={component.text} onChange={e => onChange({ ...component, text: e.target.value })} placeholder="Texto do rodapé" className={formFieldClasses} />
);

export default FooterEditor;
