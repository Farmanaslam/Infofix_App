
import React, { useState, useEffect } from 'react';
import { TeamMember, UserRole } from '../../types';
import toast from 'react-hot-toast';

interface TeamMemberFormModalProps {
    member: TeamMember | null;
    onSave: (member: TeamMember) => Promise<void>;
    onClose: () => void;
}

const TeamMemberFormModal: React.FC<TeamMemberFormModalProps> = ({ member, onSave, onClose }) => {
    const isEditing = !!member;
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Initialize state. Explicitly handle role fallback to ensure it is never undefined.
    const [formData, setFormData] = useState({
        name: member?.name || '',
        details: member?.details || '',
        experience: member?.experience?.toString() || '',
        photoUrl: member?.photoUrl || '',
        role: (member?.role as UserRole) || 'TECHNICIAN', 
        email: member?.email || '',
        password: '', 
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    
    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData({ ...formData, role: e.target.value as UserRole });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 1 * 1024 * 1024) { // 1MB limit
            toast.error('File size must be less than 1MB');
            return;
        }

        const compressToast = toast.loading('Optimizing image...');

        try {
            const compressedDataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target?.result as string;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const MAX_DIMENSION = 800;

                        // Resize logic
                        if (width > height) {
                            if (width > MAX_DIMENSION) {
                                height *= MAX_DIMENSION / width;
                                width = MAX_DIMENSION;
                            }
                        } else {
                            if (height > MAX_DIMENSION) {
                                width *= MAX_DIMENSION / height;
                                height = MAX_DIMENSION;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, width, height);

                        let quality = 0.9;
                        let dataUrl = canvas.toDataURL('image/jpeg', quality);
                        
                        // Target ~100KB (approx 137,000 chars in base64)
                        while (dataUrl.length > 137000 && quality > 0.1) {
                            quality -= 0.1;
                            dataUrl = canvas.toDataURL('image/jpeg', quality);
                        }
                        resolve(dataUrl);
                    };
                    img.onerror = (err) => reject(err);
                };
                reader.onerror = (err) => reject(err);
            });

            setFormData(prev => ({ ...prev, photoUrl: compressedDataUrl }));
            toast.dismiss(compressToast);
            toast.success('Photo optimized to < 100KB.');
        } catch (error) {
            console.error('Image processing failed', error);
            toast.dismiss(compressToast);
            toast.error('Failed to process image.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Manual Validation (in addition to HTML5 required)
        if (!formData.name.trim()) { toast.error('Full Name is required'); return; }
        if (!formData.email.trim()) { toast.error('Email is required'); return; }
        if (!formData.details.trim()) { toast.error('Specialization/Job Title is required'); return; }
        
        const experience = parseInt(formData.experience, 10);
        if (isNaN(experience) || experience < 0) { toast.error('Valid Experience years required'); return; }
        
        if (!isEditing && !formData.password.trim()) {
            toast.error('Password is required for new team members.');
            return;
        }

        setIsSubmitting(true);
        try {
            const passwordToSave = isEditing
                ? (formData.password.trim() ? formData.password.trim() : member.password)
                : formData.password.trim();
            
            // Construct the member object explicitly ensuring role is present
            const memberToSave: TeamMember = {
                id: member?.id || `TM-${Date.now()}`,
                name: formData.name.trim(),
                details: formData.details.trim(),
                experience: experience,
                photoUrl: formData.photoUrl.trim() || undefined,
                role: formData.role, // Explicitly use state value
                email: formData.email.trim(),
                password: passwordToSave
            };

            await onSave(memberToSave);
            // Modal close is handled by parent on success
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            toast.error(errorMessage);
            setIsSubmitting(false); 
        } 
    };

    const inputClasses = "w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-2xl font-bold text-gray-800">{isEditing ? 'Edit Profile' : 'Add Team Member'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="overflow-y-auto p-6">
                    {/* ID added to form to link with external button */}
                    <form id="team-member-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        
                        {/* Left Column: Photo & Key Role Info */}
                        <div className="md:col-span-4 flex flex-col items-center space-y-6">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full p-1 border-2 border-blue-100 shadow-md bg-white overflow-hidden">
                                    <img 
                                        src={formData.photoUrl || 'https://via.placeholder.com/150?text=No+Photo'} 
                                        alt="Preview" 
                                        className="w-full h-full rounded-full object-cover"
                                        onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Img'; }}
                                    />
                                </div>
                                
                                <label className="mt-3 block w-full">
                                    <span className="sr-only">Upload photo</span>
                                    <div className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition text-xs font-bold py-2 px-4 rounded-full cursor-pointer text-center border border-blue-200">
                                        Upload Photo
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleFileChange} 
                                        className="hidden"
                                    />
                                </label>
                                <div className="text-[10px] text-center mt-1 text-gray-400">Max: 1MB input, saves as ~100KB</div>
                            </div>

                            <div className="w-full space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <label htmlFor="role" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Role</label>
                                    <select id="role" name="role" value={formData.role} onChange={handleRoleChange} required className={inputClasses}>
                                        <option value="TECHNICIAN">Technician</option>
                                        <option value="MANAGEMENT">Management</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="experience" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Experience (Yrs)</label>
                                    <input id="experience" name="experience" type="number" min="0" value={formData.experience} onChange={handleChange} required className={inputClasses} />
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Personal Details */}
                        <div className="md:col-span-8 space-y-5">
                            <div>
                                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                                <input id="name" name="name" value={formData.name} onChange={handleChange} required className={inputClasses} placeholder="e.g. Alex Johnson" />
                            </div>
                            
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                                <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="staff@infofix.com" className={inputClasses} />
                            </div>

                            <div>
                                <label htmlFor="details" className="block text-sm font-semibold text-gray-700 mb-1">Specialization / Job Title</label>
                                <input id="details" name="details" value={formData.details} onChange={handleChange} required className={inputClasses} placeholder="e.g. Senior Network Engineer" />
                            </div>

                            <div className="pt-2">
                                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                                <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder={isEditing ? '•••••••• (Leave blank to keep unchanged)' : 'Create a password'} required={!isEditing} className={inputClasses} />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition shadow-sm" disabled={isSubmitting}>Cancel</button>
                    {/* Button linked to form via 'form' attribute, removed onClick to prevent double submission issues */}
                    <button 
                        type="submit"
                        form="team-member-form"
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed" 
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Profile')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TeamMemberFormModal;
