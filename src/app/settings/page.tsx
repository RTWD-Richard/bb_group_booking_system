'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { settingsAPI, roomsAPI } from '@/lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRoom, setSavingRoom] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'rooms' | 'meals' | 'policies'>('general');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [settingsData, roomsData] = await Promise.all([
        settingsAPI.get(),
        roomsAPI.getAll(),
      ]);
      setSettings(settingsData);
      setRooms(roomsData);
    } catch (error: any) {
      alert('Error loading settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsAPI.update(settings);
      alert('Settings saved successfully');
    } catch (error: any) {
      alert('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRoom(roomId: string, field: string, value: any) {
    setSavingRoom(roomId);
    try {
      await roomsAPI.update(roomId, { [field]: value });
      // Refresh rooms
      const roomsData = await roomsAPI.getAll();
      setRooms(roomsData);
    } catch (error: any) {
      alert('Error updating room: ' + error.message);
    } finally {
      setSavingRoom(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-slate-600">Loading settings...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Settings</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'rooms'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Rooms & Pricing
          </button>
          <button
            onClick={() => setActiveTab('meals')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'meals'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Meal Pricing
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'policies'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Policies
          </button>
        </div>

        {/* General Settings */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">B&B Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">B&B Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={settings.bnbName}
                    onChange={(e) => setSettings({ ...settings, bnbName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={settings.bnbEmail || ''}
                    onChange={(e) => setSettings({ ...settings, bnbEmail: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={settings.bnbPhone || ''}
                    onChange={(e) => setSettings({ ...settings, bnbPhone: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">Address</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={settings.bnbAddress || ''}
                    onChange={(e) => setSettings({ ...settings, bnbAddress: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Check-in/Check-out Times</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Check-in Time</label>
                  <input
                    type="time"
                    className="input"
                    value={settings.checkInTime}
                    onChange={(e) => setSettings({ ...settings, checkInTime: e.target.value })}
                  />
                  <p className="text-xs text-slate-500 mt-1">Default: 14:00 (2:00 PM)</p>
                </div>

                <div>
                  <label className="label">Check-out Time</label>
                  <input
                    type="time"
                    className="input"
                    value={settings.checkOutTime}
                    onChange={(e) => setSettings({ ...settings, checkOutTime: e.target.value })}
                  />
                  <p className="text-xs text-slate-500 mt-1">Default: 11:00 (11:00 AM)</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Financial Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Currency</label>
                  <select
                    className="input"
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Tax/VAT Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="input"
                    value={settings.taxRate}
                    onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Rooms & Pricing */}
        {activeTab === 'rooms' && (
          <div className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Room Configuration</h2>
            <p className="text-sm text-slate-600 mb-6">
              Manage room names and pricing. Changes are saved when you leave the field.
            </p>

            <div className="space-y-4">
              {rooms.map((room) => (
                <div key={room.id} className="border border-slate-200 rounded-lg p-4 relative">
                  {savingRoom === room.id && (
                    <div className="absolute top-2 right-2 text-xs text-blue-600 font-medium">
                      Saving...
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="label">Room Name</label>
                      <input
                        type="text"
                        className="input"
                        defaultValue={room.name}
                        onBlur={(e) => {
                          if (e.target.value !== room.name) {
                            handleUpdateRoom(room.id, 'name', e.target.value);
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="label">Single Rate (£)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        defaultValue={room.singleRate}
                        onBlur={(e) => {
                          const newValue = parseFloat(e.target.value) || 0;
                          if (newValue !== room.singleRate) {
                            handleUpdateRoom(room.id, 'singleRate', newValue);
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="label">Double Rate (£)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        defaultValue={room.doubleRate}
                        onBlur={(e) => {
                          const newValue = parseFloat(e.target.value) || 0;
                          if (newValue !== room.doubleRate) {
                            handleUpdateRoom(room.id, 'doubleRate', newValue);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meal Pricing */}
        {activeTab === 'meals' && (
          <form onSubmit={handleSaveGeneral} className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Default Meal Prices</h2>
            <p className="text-sm text-slate-600 mb-6">
              Set default pricing for meals. These can be overridden per booking.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Cooked Breakfast (£)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={settings.defaultMealCookedPrice}
                  onChange={(e) => setSettings({ ...settings, defaultMealCookedPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="label">Continental Breakfast (£)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={settings.defaultMealContinentalPrice}
                  onChange={(e) => setSettings({ ...settings, defaultMealContinentalPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="label">Packed Lunch (£)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={settings.defaultMealPackedPrice}
                  onChange={(e) => setSettings({ ...settings, defaultMealPackedPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="mt-6">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Policies */}
        {activeTab === 'policies' && (
          <form onSubmit={handleSaveGeneral} className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Booking Policies</h2>
            
            <div>
              <label className="label">Cancellation Policy</label>
              <textarea
                className="input"
                rows={6}
                placeholder="Enter your cancellation policy here..."
                value={settings.cancellationPolicy || ''}
                onChange={(e) => setSettings({ ...settings, cancellationPolicy: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">
                This will be displayed to guests when they make bookings
              </p>
            </div>

            <div className="mt-6">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
