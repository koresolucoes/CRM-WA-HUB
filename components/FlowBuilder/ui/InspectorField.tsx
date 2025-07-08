
import React from 'react';
import { formFieldClasses } from '../../ui/styleConstants';

const InspectorField = ({ label, children, helpText }: { label: string, children: React.ReactNode, helpText?: string }) => (
    <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
        {children}
        {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </div>
);

export default InspectorField;
