import { useState } from 'react';
import { usePage } from '@inertiajs/react';

type Procedure = {
  id: number;
  name: string;
  category: string;
  priority: 'routine' | 'urgent' | 'emergency';
  patient_id: number;
  patient_name: string;
  doctor_name: string;
  scheduled_date: string;
  duration_minutes: number;
  status: 'scheduled' | 'preparation' | 'in_progress' | 'completed' | 'cancelled' | 'post_op';
  special_instructions?: string;
  prep_instructions?: string;
  notes?: string;
  performed_by?: string;
  performed_at?: string;
  complications?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
};

type ProcedureNote = {
  id: number;
  procedure_id: number;
  note: string;
  created_by: string;
  created_at: string;
  type: 'pre' | 'intra' | 'post';
};

export default function Procedures() {
  const { props } = usePage();
  const currentUser = (props as any).auth?.user;
  
  const [activeTab, setActiveTab] = useState<'scheduled' | 'in_progress' | 'completed' | 'all'>('scheduled');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<'pre' | 'intra' | 'post'>('pre');
  
  // Mock procedures data
  const [procedures, setProcedures] = useState<Procedure[]>([
    {
      id: 1,
      name: 'Appendectomy',
      category: 'General Surgery',
      priority: 'urgent',
      patient_id: 101,
      patient_name: 'John Doe',
      doctor_name: 'Dr. Sarah Johnson',
      scheduled_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 60,
      status: 'scheduled',
      special_instructions: 'Patient has allergy to penicillin',
      prep_instructions: 'NPO after midnight',
      follow_up_required: true,
      follow_up_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      name: 'Cardiac Catheterization',
      category: 'Cardiology',
      priority: 'emergency',
      patient_id: 102,
      patient_name: 'Jane Smith',
      doctor_name: 'Dr. Michael Chen',
      scheduled_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 90,
      status: 'preparation',
      special_instructions: 'On blood thinners',
      prep_instructions: 'Hold metformin for 48 hours',
      follow_up_required: true,
    },
    {
      id: 3,
      name: 'Knee Arthroscopy',
      category: 'Orthopedics',
      priority: 'routine',
      patient_id: 103,
      patient_name: 'Bob Wilson',
      doctor_name: 'Dr. Emily Brown',
      scheduled_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 45,
      status: 'completed',
      performed_by: 'Dr. Emily Brown',
      performed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      follow_up_required: true,
      follow_up_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]);

  const [procedureNotes, setProcedureNotes] = useState<ProcedureNote[]>([
    {
      id: 1,
      procedure_id: 3,
      note: 'Patient tolerated procedure well. No complications.',
      created_by: 'Dr. Emily Brown',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'post',
    },
  ]);

  const handleUpdateStatus = (procedure: Procedure, newStatus: Procedure['status']) => {
    const updatedProcedures = procedures.map(p =>
      p.id === procedure.id
        ? {
            ...p,
            status: newStatus,
            performed_at: newStatus === 'completed' ? new Date().toISOString() : p.performed_at,
            performed_by: newStatus === 'completed' ? currentUser?.name : p.performed_by,
          }
        : p
    );
    setProcedures(updatedProcedures);
    alert(`Procedure status updated to: ${newStatus.toUpperCase()}`);
  };

  const handleAddNote = () => {
    if (selectedProcedure && noteText) {
      const newNote: ProcedureNote = {
        id: procedureNotes.length + 1,
        procedure_id: selectedProcedure.id,
        note: noteText,
        created_by: currentUser?.name || 'Unknown',
        created_at: new Date().toISOString(),
        type: noteType,
      };
      setProcedureNotes([...procedureNotes, newNote]);
      setNoteText('');
      setShowNoteModal(false);
      alert('Note added successfully');
    }
  };

  const getStatusBadge = (status: Procedure['status']) => {
    const statusConfig = {
      scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: '📅' },
      preparation: { label: 'Preparation', color: 'bg-yellow-100 text-yellow-800', icon: '🔄' },
      in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800', icon: '⚙️' },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: '✅' },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: '❌' },
      post_op: { label: 'Post-Op', color: 'bg-indigo-100 text-indigo-800', icon: '🏥' },
    };
    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: Procedure['priority']) => {
    const priorityConfig = {
      routine: { label: 'Routine', color: 'bg-gray-100 text-gray-800' },
      urgent: { label: 'Urgent', color: 'bg-orange-100 text-orange-800' },
      emergency: { label: 'Emergency', color: 'bg-red-100 text-red-800' },
    };
    const config = priorityConfig[priority];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getFilteredProcedures = () => {
    if (activeTab === 'all') return procedures;
    return procedures.filter(p => p.status === activeTab);
  };

  const getStatusActions = (procedure: Procedure) => {
    const actions = [];
    
    switch (procedure.status) {
      case 'scheduled':
        actions.push(
          <button
            key="prep"
            onClick={() => handleUpdateStatus(procedure, 'preparation')}
            className="px-2 py-1 rounded text-xs font-medium bg-yellow-600 text-white hover:bg-yellow-700"
          >
            Start Prep
          </button>
        );
        break;
      case 'preparation':
        actions.push(
          <button
            key="start"
            onClick={() => handleUpdateStatus(procedure, 'in_progress')}
            className="px-2 py-1 rounded text-xs font-medium bg-purple-600 text-white hover:bg-purple-700"
          >
            Start Procedure
          </button>
        );
        break;
      case 'in_progress':
        actions.push(
          <button
            key="complete"
            onClick={() => handleUpdateStatus(procedure, 'completed')}
            className="px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700"
          >
            Complete
          </button>
        );
        break;
      case 'completed':
        actions.push(
          <button
            key="postop"
            onClick={() => handleUpdateStatus(procedure, 'post_op')}
            className="px-2 py-1 rounded text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Post-Op Care
          </button>
        );
        break;
    }
    
    return actions;
  };

  return (
    <div className="w-full mt-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">Procedures</h2>
          <p className="text-sm text-gray-500">View and manage patient procedures</p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          + Schedule Procedure
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'scheduled'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📅 Scheduled ({procedures.filter(p => p.status === 'scheduled').length})
          </button>
          <button
            onClick={() => setActiveTab('preparation')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'preparation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔄 Preparation ({procedures.filter(p => p.status === 'preparation').length})
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'in_progress'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ⚙️ In Progress ({procedures.filter(p => p.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'completed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ✅ Completed ({procedures.filter(p => p.status === 'completed' || p.status === 'post_op').length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 All ({procedures.length})
          </button>
        </nav>
      </div>

      {/* Procedures Table */}
      <div className="animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="overflow-x-auto">
          <table className="w-full border rounded-lg">
            <thead className="bg-gray-100 text-sm">
              <tr>
                <th className="text-left p-2">Procedure</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Patient</th>
                <th className="text-left p-2">Doctor</th>
                <th className="text-left p-2">Priority</th>
                <th className="text-left p-2">Scheduled Date</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredProcedures().map((procedure) => (
                <tr key={procedure.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-medium">{procedure.name}</td>
                  <td className="p-2 text-sm">{procedure.category}</td>
                  <td className="p-2">{procedure.patient_name}</td>
                  <td className="p-2 text-sm">{procedure.doctor_name}</td>
                  <td className="p-2">{getPriorityBadge(procedure.priority)}</td>
                  <td className="p-2 text-sm">{new Date(procedure.scheduled_date).toLocaleDateString()}</td>
                  <td className="p-2">{getStatusBadge(procedure.status)}</td>
                  <td className="p-2 space-x-1">
                    <button
                      onClick={() => {
                        setSelectedProcedure(procedure);
                        setShowDetailsModal(true);
                      }}
                      className="px-2 py-1 rounded text-xs font-medium bg-gray-600 text-white hover:bg-gray-700"
                    >
                      View
                    </button>
                    {getStatusActions(procedure)}
                    {(procedure.status === 'completed' || procedure.status === 'post_op') && (
                      <button
                        onClick={() => {
                          setSelectedProcedure(procedure);
                          setNoteType('post');
                          setShowNoteModal(true);
                        }}
                        className="px-2 py-1 rounded text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Add Note
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Procedure Modal */}
      {showScheduleModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowScheduleModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-auto max-h-[90vh] flex flex-col">
              <div className="border-b px-6 py-4 bg-gradient-to-r from-blue-50 to-white rounded-t-lg flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-800">Schedule New Procedure</h3>
                <p className="text-sm text-gray-600 mt-1">Enter procedure details</p>
              </div>
              <div className="px-6 py-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Procedure Name *</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-md" placeholder="Enter procedure name" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select className="w-full px-3 py-2 border rounded-md">
                      <option>General Surgery</option>
                      <option>Cardiology</option>
                      <option>Orthopedics</option>
                      <option>Neurology</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Patient *</label>
                    <select className="w-full px-3 py-2 border rounded-md">
                      <option>John Doe</option>
                      <option>Jane Smith</option>
                      <option>Bob Wilson</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Doctor *</label>
                    <select className="w-full px-3 py-2 border rounded-md">
                      <option>Dr. Sarah Johnson</option>
                      <option>Dr. Michael Chen</option>
                      <option>Dr. Emily Brown</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                    <select className="w-full px-3 py-2 border rounded-md">
                      <option>Routine</option>
                      <option>Urgent</option>
                      <option>Emergency</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Date *</label>
                    <input type="datetime-local" className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                    <input type="number" className="w-full px-3 py-2 border rounded-md" placeholder="60" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preparation Instructions</label>
                  <textarea rows={2} className="w-full px-3 py-2 border rounded-md" placeholder="Pre-procedure preparation instructions..." />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
                  <textarea rows={2} className="w-full px-3 py-2 border rounded-md" placeholder="Any special instructions or notes..." />
                </div>
              </div>
              <div className="border-t px-6 py-4 flex justify-end space-x-3 bg-gray-50 rounded-b-lg flex-shrink-0">
                <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded-md">Schedule Procedure</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Procedure Details Modal */}
      {showDetailsModal && selectedProcedure && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowDetailsModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full mx-auto max-h-[90vh] flex flex-col">
              <div className="border-b px-6 py-4 bg-gradient-to-r from-blue-50 to-white rounded-t-lg flex justify-between items-center flex-shrink-0">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{selectedProcedure.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">Patient: {selectedProcedure.patient_name} | Doctor: {selectedProcedure.doctor_name}</p>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              <div className="px-6 py-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><label className="text-sm font-medium text-gray-500">Status</label><div className="mt-1">{getStatusBadge(selectedProcedure.status)}</div></div>
                  <div><label className="text-sm font-medium text-gray-500">Priority</label><div className="mt-1">{getPriorityBadge(selectedProcedure.priority)}</div></div>
                  <div><label className="text-sm font-medium text-gray-500">Scheduled Date</label><div className="mt-1">{new Date(selectedProcedure.scheduled_date).toLocaleString()}</div></div>
                  <div><label className="text-sm font-medium text-gray-500">Duration</label><div className="mt-1">{selectedProcedure.duration_minutes} minutes</div></div>
                </div>
                {selectedProcedure.prep_instructions && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-md"><label className="text-sm font-medium text-yellow-800">Preparation Instructions</label><p className="text-sm mt-1">{selectedProcedure.prep_instructions}</p></div>
                )}
                {selectedProcedure.special_instructions && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-md"><label className="text-sm font-medium text-blue-800">Special Instructions</label><p className="text-sm mt-1">{selectedProcedure.special_instructions}</p></div>
                )}
                {selectedProcedure.performed_by && (
                  <div className="mb-4 p-3 bg-green-50 rounded-md"><label className="text-sm font-medium text-green-800">Procedure Details</label><p className="text-sm mt-1">Performed by: {selectedProcedure.performed_by}<br />Performed at: {new Date(selectedProcedure.performed_at!).toLocaleString()}</p></div>
                )}
                {selectedProcedure.follow_up_required && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-md"><label className="text-sm font-medium text-purple-800">Follow-up Required</label><p className="text-sm mt-1">Follow-up Date: {selectedProcedure.follow_up_date ? new Date(selectedProcedure.follow_up_date).toLocaleDateString() : 'To be scheduled'}</p></div>
                )}
                <div><label className="text-sm font-medium text-gray-700 mb-2">Procedure Notes</label>
                  {procedureNotes.filter(n => n.procedure_id === selectedProcedure.id).map(note => (
                    <div key={note.id} className="mt-2 p-3 bg-gray-50 rounded-md"><p className="text-sm">{note.note}</p><p className="text-xs text-gray-500 mt-1">- {note.created_by} on {new Date(note.created_at).toLocaleString()}</p></div>
                  ))}
                </div>
              </div>
              <div className="border-t px-6 py-4 flex justify-end bg-gray-50 rounded-b-lg flex-shrink-0">
                <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 bg-gray-600 text-white rounded-md">Close</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Note Modal */}
      {showNoteModal && selectedProcedure && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowNoteModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-auto">
              <div className="border-b px-6 py-4"><h3 className="text-lg font-semibold">Add Note for {selectedProcedure.name}</h3></div>
              <div className="px-6 py-4">
                <select value={noteType} onChange={(e) => setNoteType(e.target.value as any)} className="w-full px-3 py-2 border rounded-md mb-4"><option value="pre">Pre-Procedure</option><option value="intra">Intra-Procedure</option><option value="post">Post-Procedure</option></select>
                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} className="w-full px-3 py-2 border rounded-md" placeholder="Enter your notes here..." />
              </div>
              <div className="border-t px-6 py-4 flex justify-end space-x-3">
                <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button onClick={handleAddNote} className="px-4 py-2 bg-blue-600 text-white rounded-md">Add Note</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}