import React, { useState } from 'react';
import { Customer } from '../../types';
import toast from 'react-hot-toast';

interface EditProfileModalProps {
    customer: Customer;
    onSave: (customer: Customer) => void;
    onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ customer, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: customer.name,
        address: customer.address,
        email: customer.email,
        photoUrl: customer.photoUrl || '',
    });
    const [uploading, setUploading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        if (file.size > 1024 * 1024) {
             toast.error("File too large (max 1MB)");
             return;
        }
        
        setUploading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
             setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
             setUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedCustomer: Customer = {
            ...customer,
            name: formData.name,
            address: formData.address,
            email: formData.email,
            photoUrl: formData.photoUrl,
        };
        onSave(updatedCustomer);
    };

    const inputClasses = "w-full p-2 border border-gray-300 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500";
    const disabledInputClasses = `${inputClasses} bg-gray-100 cursor-not-allowed`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md text-black">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Edit Your Profile</h2>
                    <button onClick={onClose} className="text-black text-2xl">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input name="name" value={formData.name} onChange={handleChange} className={inputClasses} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Address</label>
                        <input name="address" value={formData.address} onChange={handleChange} className={inputClasses} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Email (Read-only)</label>
                        <input value={formData.email} disabled className={disabledInputClasses} />
                    </div>
                     
                    <div>
                        <label className="block text-sm font-medium mb-1">Profile Photo</label>
                        <div className="flex items-center space-x-4 mt-2">
                            <img src={formData.photoUrl || 'https://via.placeholder.com/150'} alt="Preview" className="h-16 w-16 object-cover rounded-full border" />
                            <label className="cursor-pointer bg-blue-50 text-blue-700 px-4 py-2 rounded text-sm font-semibold hover:bg-blue-100">
                                {uploading ? 'Uploading...' : 'Upload New'}
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={uploading}>Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;