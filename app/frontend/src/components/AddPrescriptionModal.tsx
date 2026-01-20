import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import api from '../services/api.service';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import Input from './ui/input';

interface AddPrescriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPrescriptionAdded: () => void;
}

interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
}

interface PharmacyStock {
    id: string;
    medicationName: string;
    currentStock: number;
    sellingPrice: number;
    category?: string;
}

interface PrescriptionItem {
    id: string; // Temporary ID for UI
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions: string;
    stockAvailable?: number;
}

const AddPrescriptionModal: React.FC<AddPrescriptionModalProps> = ({ isOpen, onClose, onPrescriptionAdded }) => {
    const { user } = useAuth();
    const [patientId, setPatientId] = useState('');
    const [items, setItems] = useState<PrescriptionItem[]>([{
        id: Date.now().toString(),
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        quantity: 1,
        instructions: ''
    }]);

    const [patients, setPatients] = useState<Patient[]>([]);
    const [pharmacyMeds, setPharmacyMeds] = useState<PharmacyStock[]>([]);

    const [patientSearch, setPatientSearch] = useState('');
    const [medSearch, setMedSearch] = useState('');
    const [activeMedIndex, setActiveMedIndex] = useState<number | null>(null);

    const [isSearchingPatient, setIsSearchingPatient] = useState(false);
    const [isSearchingMed, setIsSearchingMed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchPatients();
        } else {
            // Reset form on close
            setItems([{
                id: Date.now().toString(),
                medication: '',
                dosage: '',
                frequency: '',
                duration: '',
                quantity: 1,
                instructions: ''
            }]);
            setPatientId('');
            setPatientSearch('');
            setMedSearch('');
            setActiveMedIndex(null);
        }
    }, [isOpen]);

    // Patient Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (isOpen) {
                fetchPatients(patientSearch);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [patientSearch, isOpen]);

    // Medication Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (isOpen && activeMedIndex !== null && medSearch.trim().length > 0) {
                fetchPharmacyMeds(medSearch);
            } else if (isOpen && activeMedIndex !== null && medSearch.trim().length === 0) {
                // Clear medications when search is empty
                setPharmacyMeds([]);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [medSearch, isOpen, activeMedIndex]);

    const fetchPatients = async (search = '') => {
        setIsSearchingPatient(true);
        try {
            const response = await api.get('/patients', {
                params: { search, limit: 10 }
            });
            setPatients(response.data.patients || []);
        } catch (error) {
            console.error('Failed to fetch patients', error);
        } finally {
            setIsSearchingPatient(false);
        }
    };

    const fetchPharmacyMeds = async (search = '') => {
        setIsSearchingMed(true);
        try {
            const response = await api.get('/pharmacy', {
                params: { search }
            });
            setPharmacyMeds(response.data || []);
        } catch (error) {
            console.error('Failed to fetch medications', error);
        } finally {
            setIsSearchingMed(false);
        }
    };

    const handleAddItem = () => {
        setItems(prev => [...prev, {
            id: Date.now().toString(),
            medication: '',
            dosage: '',
            frequency: '',
            duration: '',
            quantity: 1,
            instructions: ''
        }]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof PrescriptionItem, value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value };
            return newItems;
        });
    };

    const handleMedicationSelect = (index: number, med: PharmacyStock) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = {
                ...newItems[index],
                medication: med.medicationName,
                stockAvailable: med.currentStock
            };
            return newItems;
        });
        setActiveMedIndex(null); // Close dropdown
        setMedSearch('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId) {
            toast.error('Please select a patient');
            return;
        }

        // Validate items
        for (const item of items) {
            if (!item.medication || !item.dosage || !item.frequency) {
                toast.error('Please fill in all required fields for medications');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            // Transform items to remove UI specific fields like id and stockAvailable
            const medications = items.map(({ id, stockAvailable, ...rest }) => rest);

            await api.post('/prescriptions', {
                patientId,
                medications,
                prescribedBy: user?.id
            });
            toast.success('Prescriptions created successfully');
            onPrescriptionAdded();
            onClose();
        } catch (error) {
            console.error('Error creating prescription:', error);
            toast.error('Failed to create prescription');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-md font-semibold text-secondary-900">New Prescription</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8 flex-1 overflow-y-auto">
                    {/* Patient Selection */}
                    <div className="space-y-4">
                        <Input
                            label='Patient'
                            placeholder='Search patient by name...'
                            value={patientSearch}
                            onChange={(e) => setPatientSearch(e.target.value)}
                        />

                        {patientSearch && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-white shadow-sm">
                                {isSearchingPatient ? (
                                    <p className="text-sm text-gray-500 p-2">Searching...</p>
                                ) : patients.length === 0 ? (
                                    <p className="text-sm text-gray-500 p-2">No patients found</p>
                                ) : (
                                    patients.map(patient => (
                                        <div
                                            key={patient.id}
                                            onClick={() => {
                                                setPatientId(patient.id);
                                                setPatientSearch(`${patient.firstName} ${patient.lastName}`);
                                                setPatients([]); // Clear list after selection for cleaner UI
                                            }}
                                            className={`p-3 rounded-lg cursor-pointer border transition-colors ${patientId === patient.id
                                                ? 'border-teal-500 bg-teal-50'
                                                : 'border-gray-100 hover:bg-gray-50'
                                                }`}
                                        >
                                            <p className="font-medium text-sm">{patient.firstName} {patient.lastName}</p>
                                            <p className="text-xs text-gray-500">{patient.phoneNumber}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                        {!patientSearch && patientId && (
                            <div className="text-sm text-teal-600 font-medium px-1">
                                Selected: {patients.find(p => p.id === patientId)?.firstName} {patients.find(p => p.id === patientId)?.lastName} (or search again to change)
                            </div>
                        )}
                    </div>

                    {/* Medications List */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-secondary-700">Medications</label>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="text-sm flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium"
                            >
                                <Plus className="w-4 h-4" /> Add Medication
                            </button>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative group">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove item"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="relative">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Medication Name</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={item.medication}
                                                    onChange={(e) => {
                                                        handleItemChange(index, 'medication', e.target.value);
                                                        setMedSearch(e.target.value);
                                                        setActiveMedIndex(index);
                                                    }}
                                                    onFocus={() => {
                                                        setActiveMedIndex(index);
                                                        if (item.medication) {
                                                            setMedSearch(item.medication);
                                                        }
                                                    }}
                                                    placeholder="Search pharmacy..."
                                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                                />
                                                {activeMedIndex === index && (
                                                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                        {isSearchingMed ? (
                                                            <p className="text-xs text-gray-500 p-2">Searching...</p>
                                                        ) : medSearch.trim().length === 0 ? (
                                                            <p className="text-xs text-gray-500 p-2">Type to search medications...</p>
                                                        ) : pharmacyMeds.length === 0 ? (
                                                            <div className="p-2 text-xs text-gray-500">
                                                                No matches. <span className="text-teal-600 cursor-pointer" onClick={() => setActiveMedIndex(null)}>Use "{medSearch}"</span>
                                                            </div>
                                                        ) : (
                                                            pharmacyMeds.map(med => (
                                                                <div
                                                                    key={med.id}
                                                                    onClick={() => handleMedicationSelect(index, med)}
                                                                    className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                                >
                                                                    <div className="flex justify-between">
                                                                        <span className="font-medium text-sm text-gray-900">{med.medicationName}</span>
                                                                        <span className={`text-xs px-1.5 py-0.5 rounded ${med.currentStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                            Stock: {med.currentStock}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-gray-500">{med.category}</p>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {item.stockAvailable !== undefined && (
                                                <div className="absolute -bottom-5 left-0 flex items-center gap-3 text-xs w-full">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-500">Available:</span>
                                                        <span className={`font-medium ${item.stockAvailable < (item.quantity || 0) ? 'text-red-600' : 'text-green-600'}`}>
                                                            {item.stockAvailable}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Dosage</label>
                                            <input
                                                type="text"
                                                value={item.dosage}
                                                onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                                                placeholder="e.g. 500mg"
                                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
                                            <input
                                                type="text"
                                                value={item.frequency}
                                                onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                                                placeholder="e.g. 2x Daily"
                                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
                                            <input
                                                type="text"
                                                value={item.duration}
                                                onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                                                placeholder="e.g. 7 Days"
                                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Instructions</label>
                                            <input
                                                type="text"
                                                value={item.instructions}
                                                onChange={(e) => handleItemChange(index, 'instructions', e.target.value)}
                                                placeholder="Optional"
                                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-secondary-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Prescription'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPrescriptionModal;
