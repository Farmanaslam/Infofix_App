import React from 'react';
import { TeamMember } from '../../types';

interface TeamMemberDetailsModalProps {
    member: TeamMember;
    onClose: () => void;
}

const TeamMemberDetailsModal: React.FC<TeamMemberDetailsModalProps> = ({ member, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm text-center text-black">
                <div className="relative">
                    <button onClick={onClose} className="absolute -top-4 -right-4 text-black text-3xl font-light bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-300">&times;</button>
                </div>
                
                <img
                    src={member.photoUrl || 'https://via.placeholder.com/128'}
                    alt={member.name}
                    onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/128'; }}
                    className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-blue-500 shadow-lg"
                />

                <h2 className="text-3xl font-bold mb-1">{member.name}</h2>
                <p className="text-lg font-semibold text-blue-600 mb-2">{member.details}</p>
                <p className="text-md text-black mb-6">{member.experience} {member.experience === 1 ? 'year' : 'years'} of experience</p>

                <div className="flex justify-center mt-6 border-t pt-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-black font-semibold">Close</button>
                </div>
            </div>
        </div>
    );
};

export default TeamMemberDetailsModal;
