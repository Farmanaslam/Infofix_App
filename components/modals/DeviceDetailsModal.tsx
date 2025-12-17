


import React from 'react';
import { Device } from '../../types';

interface DeviceDetailsModalProps {
    device: Device;
    onClose: () => void;
}

const DeviceDetailsModal: React.FC<DeviceDetailsModalProps> = ({ device, onClose }) => {
    const details = [
        { label: 'Type', value: device.type },
        { label: 'Brand', value: device.brand },
        { label: 'Model', value: device.model },
        { label: 'Serial Number', value: device.serialNumber },
        { label: 'Brand Service', value: device.brandService },
        { label: 'Description', value: device.description },
    ].filter(d => d.value); // Filter out items with no value

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md text-black">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Device Details</h2>
                    <button onClick={onClose} className="text-black text-2xl">&times;</button>
                </div>
                <div className="space-y-3 border-t pt-4">
                    {details.map(detail => (
                        <div key={detail.label} className="grid grid-cols-3 gap-4">
                            <span className="font-semibold col-span-1">{detail.label}:</span>
                            <span className="col-span-2">{detail.value}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end mt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-black">Close</button>
                </div>
            </div>
        </div>
    );
};

export default DeviceDetailsModal;