import React, { useEffect, useState } from 'react';
import api from '../api';
import { UserPlus, User, Phone, Trash2 } from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await api.get('/agent/drivers');
      setDrivers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDriver = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await api.post('/agent/drivers', { name, phone });
      setName('');
      setPhone('');
      fetchDrivers();
      alert('Driver added successfully');
    } catch (e) {
      alert(e.message || 'Failed to add driver');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="drivers-page">
      <div className="flex-between mb-4">
        <h1 className="page-title">Manage Drivers</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Driver Form */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="card-title mb-4">
              <UserPlus size={20} className="mr-2" />
              Add New Driver
            </h3>
            <form onSubmit={handleAddDriver}>
              <div className="input-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  placeholder="Enter driver name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                <input 
                  type="text" 
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary w-full"
                disabled={submitting}
              >
                {submitting ? 'Adding...' : 'Add Driver'}
              </button>
            </form>
          </div>
        </div>

        {/* Drivers List */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="card-title mb-4">Existing Drivers</h3>
            {loading ? (
              <p>Loading drivers...</p>
            ) : drivers.length === 0 ? (
              <p className="text-muted">No drivers found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Name</th>
                      <th className="text-left py-2">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map(driver => (
                      <tr key={driver.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                              <User size={14} />
                            </div>
                            <span className="font-medium">{driver.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-muted">
                          <div className="flex items-center gap-2">
                            <Phone size={14} />
                            {driver.phone || 'N/A'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
