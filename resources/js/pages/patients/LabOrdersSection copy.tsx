import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Plus, X, Microscope } from 'lucide-react';
import useLabOrders from '@/global/useLabOrders';

const LabOrdersSection = ({ data = [], onChange }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { labOrders, loading, error, deleteLabOrder } = useLabOrders(); 
  const categories = ['Blood', 'Urine', 'Stool', 'Pathology', 'Microbiology', 'Chemistry', 'Hematology', 'Immunology'];
  
  // Available laboratory tests database
  const availableTests = labOrders;
  
  // Filter tests based on search and category
  const filteredTests = availableTests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || test.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const addTest = (test: any) => {
    console.log('Adding test:', test); // Debug log
    
    // Check if test already exists in selected list
    const exists = data.some((item: any) => item.testName === test.name);
    if (exists) {
      alert(`${test.name} is already added`);
      return;
    }
    
    const newTest = {
      id: Date.now().toString(),
      testName: test.name,
      category: test.category,
      urgency: 'routine',
      notes: '',
      normalRange: test.normalRange,
      price: test.price
    };
    
    console.log('New test object:', newTest); // Debug log
    onChange([...data, newTest]);
  };
  
  const remove = (id: string) => {
    console.log('Removing test with id:', id); // Debug log
    onChange(data.filter((item: any) => item.id !== id));
  };
  
  const update = (id: string, field: string, value: any) => {
    console.log('Updating test:', id, field, value); // Debug log
    onChange(data.map((item: any) => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };
  
  const getUrgencyColor = (urgency: string) => {
    switch(urgency) {
      case 'stat': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className='flex gap-2'>
        <div className=''>
            <h1>Select Lab Tests</h1>
        </div>
        <div className=''></div>
      </div>
      
      {/* Two Column Layout */}
      <div className="flex  gap-6">
        {/* Left Column - Available Tests */}
        <div className="border rounded-lg">
          <div className="bg-gray-50 border-b p-4">
            <h4 className="font-medium text-gray-800 mb-3">Available Laboratory Tests</h4>
            
            {/* Search and Filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {availableTests.map((item)=>(
                    <div>{item.name}</div>
                ))}
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Tests List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredTests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No tests found matching "{searchTerm}"
              </div>
            ) : (
              <div className="divide-y">
                {filteredTests.map((test) => (
                  <div key={test.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h5 className="font-medium text-gray-800">{test.name}</h5>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {test.category}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>Normal Range: {test.normalRange}</p>
                          <p>Price: ${test.price}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addTest(test)}
                        className="ml-3 bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Column - Selected Tests */}
        <div className="border rounded-lg">
          <div className="bg-gray-50 border-b p-4">
            <h4 className="font-medium text-gray-800">
              Selected Tests ({data?.length || 0})
            </h4>
            {(!data || data.length === 0) && (
              <p className="text-sm text-gray-500 mt-1">No tests selected</p>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {data && data.length > 0 ? (
              <div className="divide-y">
                {data.map((item: any) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h5 className="font-medium text-gray-800">{item.testName}</h5>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {item.category}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          <p>Normal Range: {item.normalRange}</p>
                          <p>Price: ${item.price}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Urgency
                        </label>
                        <select
                          value={item.urgency}
                          onChange={(e) => update(item.id, 'urgency', e.target.value)}
                          className="w-full border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="stat">STAT</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Status
                        </label>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${getUrgencyColor(item.urgency)}`}>
                          {item.urgency.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Notes / Instructions
                      </label>
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => update(item.id, 'notes', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Fasting required, specific timing, etc."
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Microscope className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>No tests selected</p>
                <p className="text-xs mt-1">Add tests from the left panel</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Summary Section */}
      {data && data.length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-4 mt-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-gray-800">Order Summary</h4>
              <p className="text-sm text-gray-600">Total Tests: {data.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Estimated Total:</p>
              <p className="text-lg font-bold text-indigo-600">
                ${data.reduce((total, item) => total + (item.price || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default LabOrdersSection;