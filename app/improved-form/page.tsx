'use client';

import React, { useState } from 'react';
import { ChevronDown, Calendar, Phone, FileText, ChevronUp } from 'lucide-react';

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
}

interface PreferredDateOption {
  id: string;
  label_sl: string;
  value: string;
}

const MAIN_SERVICES: ServiceCategory[] = [
  { id: 'plumbing', name: 'Vodovod', icon: '🔧' },
  { id: 'heating', name: 'Ogrevanje', icon: '🔥' },
  { id: 'electrical', name: 'Elektrika', icon: '⚡' },
  { id: 'carpentry', name: 'Tesarstvo', icon: '🪵' },
  { id: 'painting', name: 'Slikanje', icon: '🎨' },
  { id: 'general', name: 'Splošne storitve', icon: '🔨' },
  { id: 'construction', name: 'Gradnja', icon: '🏗️' },
  { id: 'installation', name: 'Montaža', icon: '📌' },
  { id: 'cleaning', name: 'Čiščenje', icon: '🧹' },
  { id: 'gardening', name: 'Vrtnarstvo', icon: '🌱' },
  { id: 'window', name: 'Okna', icon: '🪟' },
  { id: 'roofing', name: 'Streha', icon: '🏠' },
];

const SLOVENIAN_CITIES = [
  'Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Novo Mesto', 'Velenje',
  'Ptuj', 'Trbovlje', 'Kamnik', 'Koper', 'Izola', 'Piran',
  'Kamnik', 'Slovenj Gradec', 'Jesenice', 'Domžale',
];

const DATE_OPTIONS: PreferredDateOption[] = [
  { id: 'today', label_sl: 'Danes', value: 'today' },
  { id: 'tomorrow', label_sl: 'Jutri', value: 'tomorrow' },
  { id: 'this_week', label_sl: 'Ta teden', value: 'this_week' },
  { id: 'next_week', label_sl: 'Naslednji teden', value: 'next_week' },
];

export default function ImprovedLiftGOForm() {
  const [formData, setFormData] = useState({
    serviceType: '',
    location: '',
    description: '',
    preferredDate: '',
    phone: '',
  });

  const [openDrawer, setOpenDrawer] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleServiceChange = (value: string) => {
    setFormData(prev => ({ ...prev, serviceType: value }));
  };

  const handleLocationChange = (value: string) => {
    setFormData(prev => ({ ...prev, location: value }));
  };

  const handleDescriptionChange = (value: string) => {
    if (value.length <= 300) {
      setFormData(prev => ({ ...prev, description: value }));
      setCharCount(value.length);
    }
  };

  const handleDateSelect = (value: string) => {
    setFormData(prev => ({ ...prev, preferredDate: value }));
  };

  const handlePhoneChange = (value: string) => {
    setFormData(prev => ({ ...prev, phone: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    console.log('Form submitted:', formData);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">LiftGO</h1>
          <p className="text-lg text-gray-600 mb-1">Najdi obrtnika v 30 sekundah</p>
          <p className="text-sm text-gray-500">Izboljšana forma za boljše ponudbe</p>
        </div>

        {/* Success Message */}
        {submitted && (
          <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold">✓ Povpraševanje oddano!</p>
            <p className="text-sm text-green-700">Obrtniki vas bodo kontaktirali v manj kot 2 urah.</p>
          </div>
        )}

        {/* Main Form Container */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          
          {/* PRIMARY FIELDS - Core 3 Fields (Unchanged) */}
          <div className="space-y-5 mb-8">
            
            {/* 1. Service Type Dropdown with Icons */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Tip dela <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.serviceType}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg appearance-none focus:outline-none focus:border-blue-500 text-gray-900 bg-white cursor-pointer transition-colors hover:border-gray-400"
                  required
                >
                  <option value="">Izberite vrsto storitve</option>
                  {MAIN_SERVICES.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.icon} {service.name}
                    </option>
                  ))}
                  <option value="show_all">Prikaži vse (Show all)</option>
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
              </div>
              <p className="text-xs text-gray-500 mt-2">12 main categories + more available</p>
            </div>

            {/* 2. Location with Autocomplete */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Lokacija <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  placeholder="npr. Ljubljana"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 transition-colors hover:border-gray-400"
                  required
                  list="cities"
                />
                <datalist id="cities">
                  {SLOVENIAN_CITIES.map(city => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>
              <p className="text-xs text-gray-500 mt-2">Avtomatski predlogi za 50+ mest</p>
            </div>

            {/* 3. Submit Button - MAIN CTA (Unchanged Style) */}
            <button
              type="submit"
              disabled={!formData.serviceType || !formData.location}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed mt-6 shadow-md"
            >
              Oddajte povpraševanje
            </button>
          </div>

          {/* DIVIDER */}
          <div className="border-t border-gray-200 my-8"></div>

          {/* OPTIONAL FIELDS SECTION */}
          <div>
            
            {/* Section Header with Toggle */}
            <button
              type="button"
              onClick={() => setOpenDrawer(!openDrawer)}
              className="flex items-center justify-between w-full text-left mb-5 lg:mb-6 pb-4 lg:pb-5 lg:border-b lg:border-gray-300 hover:text-blue-600 transition-colors"
            >
              <span className="font-semibold text-gray-900 flex items-center gap-2 text-base">
                {openDrawer ? (
                  <ChevronUp className="w-5 h-5 text-blue-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
                Več možnosti (Optional)
              </span>
              <span className="text-xs text-gray-500 hidden lg:inline">
                {openDrawer ? 'Skrij' : 'Prikaži'} dodatna polja
              </span>
            </button>

            {/* Optional Fields Container */}
            <div className={`transition-all duration-300 overflow-hidden ${
              openDrawer ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 lg:max-h-96 lg:opacity-100'
            }`}>
              <div className="space-y-5 lg:bg-gray-50 lg:p-6 lg:rounded-lg lg:border-2 lg:border-gray-200">

                {/* 4. Work Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Opis dela
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="npr. Popravilo puščanja pipe v kuhinji, puščajo tudi radiatorji..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 resize-none transition-colors hover:border-gray-300"
                    rows={3}
                    maxLength={300}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">Boljši opis = boljše ponudbe</p>
                    <p className={`text-xs font-medium ${charCount > 250 ? 'text-orange-600' : 'text-gray-600'}`}>
                      {charCount}/300
                    </p>
                  </div>
                </div>

                {/* 5. Preferred Date/Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Želeni termin
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {DATE_OPTIONS.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleDateSelect(option.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          formData.preferredDate === option.value
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                        }`}
                      >
                        {option.label_sl}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      onChange={(e) => handleDateSelect(e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm hover:border-gray-300 transition-colors"
                    />
                    <span className="text-xs text-gray-500 whitespace-nowrap">Prilagođen termin</span>
                  </div>
                </div>

                {/* 6. Phone Number (Optional) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefonska številka
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="+386 1 234 5678"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 transition-colors hover:border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-2">Za hitrejši kontakt obrtnikov</p>
                </div>

              </div>
            </div>

          </div>

        </form>

        {/* Benefits Section */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
            <p className="font-semibold text-gray-900 text-sm mb-1">⚡ 30 sekund</p>
            <p className="text-xs text-gray-600">Oddajte zahtevo v nekaj sekundah</p>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
            <p className="font-semibold text-gray-900 text-sm mb-1">🎯 Natančno</p>
            <p className="text-xs text-gray-600">Boljši opis = boljše in hitrejše ponudbe</p>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
            <p className="font-semibold text-gray-900 text-sm mb-1">📞 Hitro</p>
            <p className="text-xs text-gray-600">Obrtniki odgovorijo v manj kot 2 uri</p>
          </div>
        </div>

      </div>
    </div>
  );
}
