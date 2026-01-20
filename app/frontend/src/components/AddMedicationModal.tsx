import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../services/api.service';
import toast from 'react-hot-toast';
import Input from './ui/input';

interface AddMedicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    medicationToEdit?: any;
}

const AddMedicationModal: React.FC<AddMedicationModalProps> = ({ isOpen, onClose, onSuccess, medicationToEdit }) => {
    const [formData, setFormData] = useState({
        medicationName: '',
        category: '',
        description: '',
        currentStock: 0,
        minimumStock: 10,
        costPrice: 0,
        sellingPrice: 0,
        expiryDate: '',
        supplier: '',
        batchNumber: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (medicationToEdit) {
            setFormData({
                medicationName: medicationToEdit.medicationName || '',
                category: medicationToEdit.category || '',
                description: medicationToEdit.description || '',
                currentStock: medicationToEdit.currentStock || 0,
                minimumStock: medicationToEdit.minimumStock || 10,
                costPrice: Number(medicationToEdit.costPrice) || 0,
                sellingPrice: Number(medicationToEdit.sellingPrice) || 0,
                expiryDate: medicationToEdit.expiryDate ? new Date(medicationToEdit.expiryDate).toISOString().split('T')[0] : '',
                supplier: medicationToEdit.supplier || '',
                batchNumber: medicationToEdit.batchNumber || ''
            });
        } else {
            setFormData({
                medicationName: '',
                category: '',
                description: '',
                currentStock: 0,
                minimumStock: 10,
                costPrice: 0,
                sellingPrice: 0,
                expiryDate: '',
                supplier: '',
                batchNumber: ''
            });
        }
    }, [medicationToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['currentStock', 'minimumStock', 'costPrice', 'sellingPrice'].includes(name)
                ? parseFloat(value) || 0
                : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined
            };

            if (medicationToEdit) {
                await api.put(`/pharmacy/${medicationToEdit.id}`, payload);
                toast.success('Medication updated successfully');
            } else {
                await api.post('/pharmacy', payload);
                toast.success('Medication added successfully');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving medication:', error);
            toast.error('Failed to save medication');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-md font-semibold text-secondary-900">
                        {medicationToEdit ? 'Edit Medication' : 'Add New Medication'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <Input
                                label="Medication Name"
                                name="medicationName"
                                type="text"
                                required
                                value={formData.medicationName}
                                onChange={handleChange}
                                disabled={!!medicationToEdit} // Can't rename ID-like fields easily usually
                                placeholder='e.g. Paracetamol'
                            />

                        </div>

                        <div>
                            <Input
                                label="Category"
                                name="category"
                                type="text"
                                value={formData.category}
                                onChange={handleChange}
                                placeholder="e.g. Antibiotics"
                            />
                        </div>

                        <div>
                            <Input
                                label="Batch Number"
                                name="batchNumber"
                                type="text"
                                value={formData.batchNumber}
                                onChange={handleChange}
                                placeholder="e.g. 123456789"
                            />
                        </div>

                        <div>
                            <Input
                                label="Cost Price (MK)"
                                name="costPrice"
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={formData.costPrice}
                                onChange={handleChange}
                                placeholder="e.g. 10.00"
                            />
                        </div>

                        <div>
                            <Input
                                label="Selling Price (MK)"
                                name="sellingPrice"
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={formData.sellingPrice}
                                onChange={handleChange}
                                placeholder="e.g. 10.00"
                            />
                        </div>

                        <div>
                            <Input
                                label="Current Stock"
                                name="currentStock"
                                type="number"
                                min="0"
                                required
                                value={formData.currentStock}
                                onChange={handleChange}
                                placeholder="e.g. 10"
                            />
                        </div>

                        <div>
                            <Input
                                label="Minimum Stock Alert"
                                name="minimumStock"
                                min="0"
                                required
                                value={formData.minimumStock}
                                onChange={handleChange}
                                placeholder="e.g. 10"
                            />
                        </div>

                        <div>
                            <Input
                                label="Expiry Date"
                                name="expiryDate"
                                type="date"
                                value={formData.expiryDate}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <Input
                                label="Supplier"
                                name="supplier"
                                value={formData.supplier}
                                onChange={handleChange}
                                placeholder="e.g. ABC Pharmaceuticals"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-secondary-700 mb-1">Description</label>
                            <textarea
                                name="description"
                                rows={3}
                                value={formData.description}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            />
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
                            {isSubmitting ? 'Saving...' : 'Save Medication'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMedicationModal;
