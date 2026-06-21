import React, { useState, useEffect } from 'react';
import { getAllPlans, deletePlan } from '../../services/adminPlanService';
import AdminPlanForm from '../../components/AdminPlanForm';

const AdminPlansPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await getAllPlans();
      setPlans(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      try {
        await deletePlan(id);
        setPlans((prev) => prev.filter((plan) => plan._id !== id));
      } catch (err) {
        alert('Failed to delete plan');
      }
    }
  };

  const handleEdit = (plan) => {
    setPlanToEdit(plan);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setPlanToEdit(null);
    setIsFormOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Subscription Plans</h1>
        <button onClick={handleAddNew} className="bg-green-600 text-white px-4 py-2 rounded shadow">
          Add New Plan
        </button>
      </div>
      {error && <p className="text-red-500">{error}</p>}
      {loading ? (
        <p>Loading plans...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4">Name</th><th className="p-4">Price</th><th className="p-4">Render Limit</th><th className="p-4">3D Model Limit</th><th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center">No plans available.</td></tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan._id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{plan.name}</td><td className="p-4">${plan.price}</td><td className="p-4">{plan.renderLimit === -1 ? 'Unlimited' : plan.renderLimit}</td><td className="p-4">{plan.model3DLimit === -1 ? 'Unlimited' : plan.model3DLimit}</td>
                    <td className="p-4"><button onClick={() => handleEdit(plan)} className="text-blue-600 mr-4">Edit</button><button onClick={() => handleDelete(plan._id)} className="text-red-600">Delete</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <AdminPlanForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} planToEdit={planToEdit} onSuccess={fetchPlans} />
    </div>
  );
};

export default AdminPlansPage;