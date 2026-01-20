import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import api from '../services/api.service';
import toast from 'react-hot-toast';
import Input from './ui/input';
import Gender from './ui/gender';
import { Loader2 } from 'lucide-react';

interface AddPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPatientAdded: () => void;
    patient?: any; // Using any for now to avoid circular dependency, ideally should be Patient type
}

interface PatientFormData {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber: string;
    address: string;
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onPatientAdded, patient }) => {
    const [formData, setFormData] = useState<PatientFormData>({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        phoneNumber: '',
        address: '',
    });

    useEffect(() => {
        if (patient) {
            setFormData({
                firstName: patient.firstName || '',
                lastName: patient.lastName || '',
                dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
                gender: patient.gender || '',
                phoneNumber: patient.phoneNumber || '',
                address: patient.address || '',
            });
        } else {
            setFormData({
                firstName: '',
                lastName: '',
                dateOfBirth: '',
                gender: '',
                phoneNumber: '',
                address: '',
            });
        }
    }, [patient, isOpen]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (patient) {
                const res = await api.put(`/patients/${patient.id}`, formData);
                if (res.status === 200) {
                    toast.success('Patient updated successfully');
                    onPatientAdded();
                    onClose();
                    setFormData({
                        firstName: '',
                        lastName: '',
                        dateOfBirth: '',
                        gender: '',
                        phoneNumber: '',
                        address: '',
                    });
                } else {
                    toast.error('Failed to update patient');
                }
            } else {
                const res = await api.post('/patients', formData);
                if (res.status === 201) {
                    toast.success('Patient added successfully');
                    onPatientAdded();
                    onClose();

                    // Reset form
                    setFormData({
                        firstName: '',
                        lastName: '',
                        dateOfBirth: '',
                        gender: '',
                        phoneNumber: '',
                        address: '',
                    });
                }
                else {
                    toast.error('Failed to add patient');
                }
            }

        } catch (error: any) {
            // Handle duplicate patient error
            if (error.response?.status === 409) {
                const existingPatient = error.response.data.existingPatient;
                toast.error(
                    `Patient already exists: ${existingPatient?.firstName} ${existingPatient?.lastName} (${existingPatient?.phoneNumber})`,
                    { duration: 5000 }
                );
            } else {
                toast.error(patient ? 'Failed to update patient' : 'Failed to add patient');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={patient ? "Edit Patient" : "Add New Patient"} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* First Name */}
                    <Input
                        label='First Name'
                        id='firstName'
                        type='text'
                        name='firstName'
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder='First Name'
                        required
                    />

                    {/* Last Name */}
                    <Input
                        label='Last Name'
                        id='lastName'
                        type='text'
                        name='lastName'
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder='Last Name'
                        required
                    />

                    {/* Date of Birth */}
                    <Input
                        label='Date of Birth'
                        id='dateOfBirth'
                        type='date'
                        name='dateOfBirth'
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        required
                    />

                    {/* Gender */}
                    <Gender
                        label='Gender'
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        required
                    />

                    {/* Phone Number */}
                    <Input
                        label='Phone Number'
                        id='phoneNumber'
                        type='tel'
                        name='phoneNumber'
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        placeholder='Phone Number'
                        required
                    />

                    {/* Address */}
                    <Input
                        label='Address'
                        id='address'
                        type='text'
                        name='address'
                        value={formData.address}
                        onChange={handleChange}
                        placeholder='Address'
                        required
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-secondary-200 text-sm">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <span className="flex items-center">
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                {patient ? 'Updating...' : 'Adding...'}
                            </span>
                        ) : (
                            patient ? 'Update Patient' : 'Add Patient'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddPatientModal;
