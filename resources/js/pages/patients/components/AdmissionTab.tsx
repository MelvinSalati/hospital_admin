import { useState } from "react";
import {usePage} from "@inertiajs/react";
import { 
  Pill, Syringe, Microscope, Clock, CheckCircle, XCircle, 
  AlertCircle, Calendar, User, Stethoscope, FileText,
  Download, Printer, Eye, Plus, Trash2, Edit,
  StethoscopeIcon
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import axios from "axios";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import bg from '../../../../assets/img/bg_app.png';
// Types
interface PrescribedDrug {
  id: number;
  drug_name: string;
  dosage: string;
  frequency: string;
  route: string;
  start_date: string;
  end_date?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  prescribed_by: string;
  prescribed_date: string;
}

interface DrugAdministration {
  id: number;
  prescribed_drug_id: number;
  drug_name: string;
  dosage: string;
  administered_at: string;
  administered_by: string;
  administration_status: 'swallowed' | 'injected' | 'topical' | 'refused' | 'missed';
  notes?: string;
}

interface LabOrder {
  id: number;
  test_name: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';
  sample_collected_at?: string;
  sample_collected_by?: string;
  sample_type?: string;
  collected_notes?: string;
  ordered_by: string;
  ordered_date: string;
  result?: string;
  result_date?: string;
}

interface AdmissionTabsProps {
  admissionId: number;
  patientId: number;
  patientName: string;
}

export default function AdmissionTab({ admissionId, patientId, patientName }: AdmissionTabsProps) {
  const [activeTab, setActiveTab] = useState("prescribed");
  const [loading, setLoading] = useState(false);
  
  // Prescribed drugs state
  const [prescribedDrugs, setPrescribedDrugs] = useState<PrescribedDrug[]>([]);
  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
  const [newDrug, setNewDrug] = useState({
    drug_name: "",
    dosage: "",
    frequency: "",
    route: "oral",
    duration_days: 7,
    notes: ""
  });

  // Drug administration state
  const [administrations, setAdministrations] = useState<DrugAdministration[]>([]);
  const [showAdministerModal, setShowAdministerModal] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<PrescribedDrug | null>(null);
  const [administerData, setAdministerData] = useState({
    administered_at: new Date().toISOString(),
    administration_status: "swallowed" as const,
    notes: ""
  });

  // Lab orders state
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [showLabModal, setShowLabModal] = useState(false);
  const [newLabOrder, setNewLabOrder] = useState({
    test_name: "",
    priority: "routine" as const,
    sample_type: "",
    notes: ""
  });

  const drugRoutes = ["oral", "intravenous", "intramuscular", "subcutaneous", "topical", "inhalation"];
  const administrationStatuses = [
    { value: "swallowed", label: "Swallowed", color: "bg-green-100 text-green-700" },
    { value: "injected", label: "Injected", color: "bg-blue-100 text-blue-700" },
    { value: "topical", label: "Applied Topically", color: "bg-purple-100 text-purple-700" },
    { value: "refused", label: "Patient Refused", color: "bg-red-100 text-red-700" },
    { value: "missed", label: "Missed", color: "bg-orange-100 text-orange-700" }
  ];

  // Add prescribed drug
  const handleAddDrug = async () => {
    if (!newDrug.drug_name || !newDrug.dosage || !newDrug.frequency) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`/admissions/${admissionId}/prescriptions`, {
        ...newDrug,
        patient_id: patientId
      });
      
      setPrescribedDrugs([response.data, ...prescribedDrugs]);
      setShowPrescribeModal(false);
      setNewDrug({
        drug_name: "",
        dosage: "",
        frequency: "",
        route: "oral",
        duration_days: 7,
        notes: ""
      });
      toast.success("Drug prescribed successfully");
    } catch (error) {
      toast.error("Failed to prescribe drug");
    } finally {
      setLoading(false);
    }
  };

  // Administer drug
  const handleAdministerDrug = async () => {
    if (!selectedDrug) return;

    setLoading(true);
    try {
      const response = await axios.post(`/admissions/${admissionId}/administer`, {
        prescribed_drug_id: selectedDrug.id,
        ...administerData
      });
      
      setAdministrations([response.data, ...administrations]);
      setShowAdministerModal(false);
      setSelectedDrug(null);
      setAdministerData({
        administered_at: new Date().toISOString(),
        administration_status: "swallowed",
        notes: ""
      });
      toast.success("Drug administered successfully");
    } catch (error) {
      toast.error("Failed to administer drug");
    } finally {
      setLoading(false);
    }
  };

  // Add lab order
  const handleAddLabOrder = async () => {
    if (!newLabOrder.test_name) {
      toast.error("Please enter test name");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`/admissions/${admissionId}/lab-orders`, {
        ...newLabOrder,
        patient_id: patientId
      });
      
      setLabOrders([response.data, ...labOrders]);
      setShowLabModal(false);
      setNewLabOrder({
        test_name: "",
        priority: "routine",
        sample_type: "",
        notes: ""
      });
      toast.success("Lab order added successfully");
    } catch (error) {
      toast.error("Failed to add lab order");
    } finally {
      setLoading(false);
    }
  };

  // Update sample collection status
  const updateSampleCollection = async (orderId: number, collected: boolean) => {
    setLoading(true);
    try {
      const response = await axios.patch(`/admissions/${admissionId}/lab-orders/${orderId}`, {
        status: collected ? "sample_collected" : "ordered",
        sample_collected_at: collected ? new Date().toISOString() : null,
        sample_collected_by: collected ? "Current User" : null
      });
      
      setLabOrders(labOrders.map(order => 
        order.id === orderId ? response.data : order
      ));
      toast.success(collected ? "Sample collection recorded" : "Sample collection reverted");
    } catch (error) {
      toast.error("Failed to update sample status");
    } finally {
      setLoading(false);
    }
  };

   const {admissions, drugs, laborders,procedures} = usePage().props;
 
  return (
    <div className="bg-white rounded-lg shadow">
      {/* check if admision is active  */} 

      {admissions.length > 0 ? (<></>) : <>
      
        <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg text-center" style={{background:`${bg}`}}>
            <center><StethoscopeIcon className="text-center justify-center" /></center>
            <h2 className="text-lg font-medium text-red-800">No Active Admission</h2>
            <p className="p-1 text-gray-600 font-stretch-75%">No recent admission found. Click the button below to create an admission.</p>
            
        </div>
      
      </>}
       
      {/* Prescribe Drug Modal */}
      {/* <Dialog open={showPrescribeModal} onOpenChange={setShowPrescribeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prescribe Drug for {patientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Drug Name *</Label>
              <Input
                placeholder="Enter drug name"
                value={newDrug.drug_name}
                onChange={(e) => setNewDrug({...newDrug, drug_name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dosage *</Label>
                <Input
                  placeholder="e.g., 500mg"
                  value={newDrug.dosage}
                  onChange={(e) => setNewDrug({...newDrug, dosage: e.target.value})}
                />
              </div>
              <div>
                <Label>Frequency *</Label>
                <Input
                  placeholder="e.g., Twice daily"
                  value={newDrug.frequency}
                  onChange={(e) => setNewDrug({...newDrug, frequency: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Route</Label>
                <Select value={newDrug.route} onValueChange={(v) => setNewDrug({...newDrug, route: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {drugRoutes.map(route => (
                      <SelectItem key={route} value={route}>{route}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  value={newDrug.duration_days}
                  onChange={(e) => setNewDrug({...newDrug, duration_days: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional instructions..."
                value={newDrug.notes}
                onChange={(e) => setNewDrug({...newDrug, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrescribeModal(false)}>Cancel</Button>
            <Button onClick={handleAddDrug} disabled={loading}>Prescribe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

      {/* Administer Drug Modal */}
      {/* <Dialog open={showAdministerModal} onOpenChange={setShowAdministerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Administer Drug</DialogTitle>
          </DialogHeader>
          {selectedDrug && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <p className="font-medium">{selectedDrug.drug_name}</p>
                <p className="text-sm text-gray-500">{selectedDrug.dosage} - {selectedDrug.frequency}</p>
              </div>
              <div>
                <Label>Administration Status *</Label>
                <Select 
                  value={administerData.administration_status} 
                  onValueChange={(v: any) => setAdministerData({...administerData, administration_status: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {administrationStatuses.map(status => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Any observations or notes..."
                  value={administerData.notes}
                  onChange={(e) => setAdministerData({...administerData, notes: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdministerModal(false)}>Cancel</Button>
            <Button onClick={handleAdministerDrug} disabled={loading}>Record Administration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

      {/* Lab Order Modal */}
      {/* <Dialog open={showLabModal} onOpenChange={setShowLabModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Lab Test for {patientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Test Name *</Label>
              <Input
                placeholder="Enter test name"
                value={newLabOrder.test_name}
                onChange={(e) => setNewLabOrder({...newLabOrder, test_name: e.target.value})}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={newLabOrder.priority} onValueChange={(v: any) => setNewLabOrder({...newLabOrder, priority: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT (Immediate)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sample Type</Label>
              <Input
                placeholder="e.g., Blood, Urine, Swab"
                value={newLabOrder.sample_type}
                onChange={(e) => setNewLabOrder({...newLabOrder, sample_type: e.target.value})}
              />
            </div>
            <div>
              <Label>Clinical Notes</Label>
              <Textarea
                placeholder="Clinical information for the lab..."
                value={newLabOrder.notes}
                onChange={(e) => setNewLabOrder({...newLabOrder, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLabModal(false)}>Cancel</Button>
            <Button onClick={handleAddLabOrder} disabled={loading}>Order Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </div>
  );
}