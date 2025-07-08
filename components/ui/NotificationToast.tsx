
import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '../icons';

export type Notification = {
    message: string;
    type: 'success' | 'error' | 'info';
    details?: string[];
};

const NotificationToast = ({ notification, onClose }: { notification: Notification; onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 8000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const isSuccess = notification.type === 'success';
    const isError = notification.type === 'error';
    const Icon = isSuccess ? CheckCircleIcon : isError ? XCircleIcon : CheckCircleIcon;
    const colors = isSuccess ? 'bg-green-100 border-green-500 text-green-800' : isError ? 'bg-red-100 border-red-500 text-red-800' : 'bg-blue-100 border-blue-500 text-blue-800';

    return (
        <div className={`fixed top-5 right-5 max-w-sm w-full p-4 rounded-lg border-l-4 shadow-lg z-50 flex items-start transition-all animate-fade-in-right ${colors}`}>
            <div className="flex-shrink-0"><Icon className="h-5 w-5" /></div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium">{notification.message}</p>
                {notification.details && (
                    <ul className="mt-2 list-disc list-inside text-xs">
                        {notification.details.map((detail, i) => <li key={i}>{detail}</li>)}
                    </ul>
                )}
            </div>
            <button onClick={onClose} className="ml-4 flex-shrink-0 flex"><XMarkIcon className="h-5 w-5" /></button>
        </div>
    );
};

export default NotificationToast;
