
import React from 'react';
import { AuditLogEntry } from '../../types';

interface AuditHistoryModalProps {
    entityId: string;
    auditLog: AuditLogEntry[];
    onClose: () => void;
}

const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({ entityId, auditLog, onClose }) => {
    const history = auditLog.filter(log => log.entityId === entityId)
      .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Safely render the details property, which might be an object instead of a string
    // if the underlying database schema doesn't match the type definitions.
    const renderDetails = (details: any) => {
        if (typeof details === 'string') {
            return details;
        }
        if (typeof details === 'object' && details !== null) {
            return JSON.stringify(details, null, 2);
        }
        return String(details);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col text-black">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-2xl font-bold">History for Ticket {entityId}</h2>
                    <button onClick={onClose} className="text-black text-3xl font-light">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    {history.length > 0 ? (
                        <ul className="space-y-4">
                            {history.map(log => (
                                <li key={log.id} className="flex items-start space-x-3">
                                    <div className="bg-gray-200 p-2 rounded-full h-8 w-8 flex-shrink-0 flex items-center justify-center mt-1">
                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-black whitespace-pre-wrap">{renderDetails(log.details)}</p>
                                        <p className="text-sm text-gray-500">{log.user} &bull; {new Date(log.timestamp).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-black">No history found for this ticket.</p>
                    )}
                </div>

                <div className="flex justify-end mt-6 border-t pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-black">Close</button>
                </div>
            </div>
        </div>
    );
};

export default AuditHistoryModal;
