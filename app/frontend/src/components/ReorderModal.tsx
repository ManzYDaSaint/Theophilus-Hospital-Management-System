import React, { useState } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.service';
import Input from './ui/input';

interface ReorderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    medication: {
        id: string;
        medicationName: string;
        currentStock: number;
        costPrice: number;
        expiryDate?: string;
    } | null;
}

const ReorderModal: React.FC<ReorderModalProps> = ({ isOpen, onClose, onSuccess, medication }) => {
    const [quantity, setQuantity] = useState<string>('');
    const [newCost, setNewCost] = useState<string>('');
    const [newExpiry, setNewExpiry] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !medication) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!quantity || Number(quantity) <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }

        try {
            setIsSubmitting(true);

            await api.post(`/pharmacy/${medication.id}/stock`, {
                type: 'add',
                quantity: Number(quantity),
                newCost: newCost ? Number(newCost) : undefined,
                newExpiry: newExpiry || undefined
            });

            toast.success('Stock updated successfully');
            onSuccess();
            onClose();
            // Reset form
            setQuantity('');
            setNewCost('');
            setNewExpiry('');
        } catch (error) {
            console.error('Failed to reorder', error);
            toast.error('Failed to update stock');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-md font-bold text-gray-900">Restock Medication</h2>
                        <p className="text-sm text-gray-500 mt-1">{medication.medicationName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-teal-50 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="text-xs font-semibold uppercase text-teal-600 tracking-wider">Current Stock</p>
                            <p className="text-2xl font-bold text-teal-800">{medication.currentStock}</p>
                        </div>
                        <div className="p-2 bg-teal-100 rounded-full">
                            <RefreshCw className="w-5 h-5 text-teal-600" />
                        </div>
                    </div>

                    <div>
                        <Input
                            label="Quantity to Add"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="e.g. 50"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Input
                                label="New Cost Price ($)"
                                type="number"
                                step="0.01"
                                value={newCost}
                                onChange={(e) => setNewCost(e.target.value)}
                                placeholder={medication.costPrice?.toString() || "0.00"}
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave empty to keep current</p>
                        </div>
                        <div>
                            <Input
                                label="New Expiry Date"
                                type="date"
                                value={newExpiry}
                                onChange={(e) => setNewExpiry(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave empty to keep current</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-sm"
                        >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? 'Updating...' : 'Update Stock'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReorderModal;
