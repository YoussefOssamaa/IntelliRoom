import React, { useState, useEffect } from 'react';
import { createPlan, updatePlan } from '../services/adminPlanService';

const AdminPlanForm = ({ isOpen, onClose, planToEdit, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    renderLimit: -1,
    model3DLimit: -1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (planToEdit) {
      setFormData({
        name: planToEdit.name || '',
        price: planToEdit.price || 0,
        renderLimit: planToEdit.renderLimit !== undefined ? planToEdit.renderLimit : -1,
        model3DLimit: planToEdit.model3DLimit !== undefined ? planToEdit.model3DLimit : -1,
      });
    } else {
      setFormData({
        name: '',
        price: 0,
        renderLimit: -1,
        model3DLimit: -1,
      });
    }
    setError(null);
  }, [planToEdit, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'name' ? value : Number(value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (planToEdit && planToEdit._id) {
        await updatePlan(planToEdit._id, formData);
      } else {
        await createPlan(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
        <h2 className="text-xl font-bold mb-4">{planToEdit ? 'Edit Plan' : 'Create Plan'}</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col">Name <input type="text" name="name" value={formData.name} onChange={handleChange} required className="border p-2 rounded" /></label>
          <label className="flex flex-col">Price <input type="number" name="price" value={formData.price} onChange={handleChange} required min="0" className="border p-2 rounded" /></label>
          <label className="flex flex-col">Render Limit <input type="number" name="renderLimit" value={formData.renderLimit} onChange={handleChange} required min="-1" className="border p-2 rounded" /></label>
          <label className="flex flex-col">3D Model Limit <input type="number" name="model3DLimit" value={formData.model3DLimit} onChange={handleChange} required min="-1" className="border p-2 rounded" /></label>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPlanForm;