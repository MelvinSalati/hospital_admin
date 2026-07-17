import { useState } from "react";
import { 
  Plus, X, Scan, Mic, Activity, Bone, Brain, Heart, Stethoscope, 
  ShoppingCart, Minus, Trash2, Save, Clock, ChevronDown, Search, Eye 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import Notiflix from 'notiflix';

interface ImagingOrder {
  id?: number;
  order_number?: string;
  doctor?: string;
  type?: string;
  body_part?: string;
  priority?: string;
  indication?: string;
  modality?: string;
  clinical_history?: string;
  contrast_required?: boolean;
  created_at?: string;
  ordered_date?: string;
  status?: string;
  price?: number;
  total_amount?: number;
}

interface CartImagingItem {
  id: number;
  cartId: string;
  service_name: string;
  service_id: number;
  body_part: string;
  priority: string;
  indication: string;
  clinical_history?: string;
  contrast_required: boolean;
  price: number;
  quantity: number;
  total: number;
  modality: string;
}

interface Props {
  admissionNumber?: string;
  patientId?: number;
  initialImagingOrders?: ImagingOrder[];
  imaging?: any[];
}

export default function ImagingTab({
  admissionNumber,
  patientId,
  initialImagingOrders = [],
  imaging = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartImagingItem[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ImagingOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orders, setOrders] = useState<ImagingOrder[]>(initialImagingOrders);

  // Map service names to modality values expected by backend
  const getModalityValue = (serviceName: string): string => {
    const name = serviceName.toLowerCase();
    if (name.includes('xray') || name.includes('x-ray')) return 'xray';
    if (name.includes('ultrasound')) return 'ultrasound';
    if (name.includes('ct')) return 'ct';
    if (name.includes('mri')) return 'mri';
    if (name.includes('mammogram')) return 'mammogram';
    if (name.includes('fluoroscopy')) return 'fluoroscopy';
    if (name.includes('pet')) return 'pet_ct';
    return 'xray';
  };

  // Map service names to icons
  const getIconForModality = (modalityName: string) => {
    const name = modalityName.toLowerCase();
    if (name.includes('xray') || name.includes('x-ray')) return Bone;
    if (name.includes('ultrasound')) return Mic;
    if (name.includes('ct')) return Scan;
    if (name.includes('mri')) return Brain;
    if (name.includes('mammogram')) return Activity;
    if (name.includes('fluoroscopy')) return Stethoscope;
    if (name.includes('pet')) return Heart;
    return Scan;
  };

  // Get price from service
  const getPrice = (service: any): number => {
    return parseFloat(service.cash_price) || 0;
  };

  // Status badge component
  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: "Pending", color: "text-yellow-700", bg: "bg-yellow-100" },
      scheduled: { label: "Scheduled", color: "text-blue-700", bg: "bg-blue-100" },
      in_progress: { label: "In Progress", color: "text-purple-700", bg: "bg-purple-100" },
      completed: { label: "Completed", color: "text-green-700", bg: "bg-green-100" },
      cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-100" },
    };
    const cfg = config[status] || config.pending;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  // Filtered services based on search
  const filteredServices = (imaging || []).filter(service =>
    service?.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service?.service_category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered orders based on status
  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  });

  const addToCart = (service: any) => {
    const price = getPrice(service);
    
    if (price <= 0) {
      Notiflix.Notify.warning(`No price available for ${service.service_name}`);
      return;
    }

    const existingItem = cart.find(item => item.service_id === service.id);
    const modality = getModalityValue(service.service_name);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.service_id === service.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              total: (item.quantity + 1) * item.price
            }
          : item
      ));
      Notiflix.Notify.success(`Updated ${service.service_name} quantity`);
    } else {
      const newItem: CartImagingItem = {
        id: service.id,
        cartId: `${service.id}-${Date.now()}-${Math.random()}`,
        service_name: service.service_name,
        service_id: service.id,
        body_part: "",
        priority: "routine",
        indication: "",
        clinical_history: "",
        contrast_required: false,
        price: price,
        quantity: 1,
        total: price,
        modality: modality
      };
      setCart([...cart, newItem]);
      Notiflix.Notify.success(`Added ${service.service_name} to cart`);
    }
  };

  const removeFromCart = (cartId: string, serviceName: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
    Notiflix.Notify.info(`Removed ${serviceName} from cart`);
  };

  const updateCartItem = (cartId: string, updates: Partial<CartImagingItem>) => {
    setCart(cart.map(item =>
      item.cartId === cartId
        ? { ...item, ...updates, total: (updates.quantity || item.quantity) * item.price }
        : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      Notiflix.Notify.warning("Please add at least one imaging study to the order");
      return;
    }

    const incompleteItems = cart.filter(item => !item.body_part);
    if (incompleteItems.length > 0) {
      Notiflix.Notify.warning("Please specify body part for all items in cart");
      return;
    }

    setLoading(true);
    Notiflix.Loading.pulse('Placing order...');

    try {
      for (const item of cart) {
        const payload = {
          service_id: item.service_id,
          service_name: item.service_name,
          modality: item.modality,
          body_part: item.body_part,
          priority: item.priority,
          clinical_indication: item.indication,
          clinical_history: item.clinical_history,
          contrast_required: item.contrast_required,
          admission_number: admissionNumber,
          ordered_date: new Date().toISOString(),
          price: item.price,
          total_amount: item.total
        };
        
        await api.imagingOrder.create(patientId!, payload);
      }
      
      Notiflix.Loading.remove();
      Notiflix.Notify.success(`Successfully placed ${cart.length} imaging order(s)`);
      
      setOpen(false);
      setCart([]);
      setClinicalNotes("");
      setSearchTerm("");
      
      // Reload the page to show updated orders
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (err) {
      Notiflix.Loading.remove();
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      Notiflix.Notify.failure(errorMessage);
      console.error('Error creating imaging order:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { label: string; color: string; bg: string }> = {
      routine: { label: "Routine", color: "text-blue-700", bg: "bg-blue-100" },
      urgent: { label: "Urgent", color: "text-orange-700", bg: "bg-orange-100" },
      emergency: { label: "Emergency", color: "text-red-700", bg: "bg-red-100" },
      stat: { label: "STAT", color: "text-purple-700", bg: "bg-purple-100" },
    };
    const cfg = config[priority] || config.routine;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  const hasOrders = filteredOrders && Array.isArray(filteredOrders) && filteredOrders.length > 0;
  const total = calculateTotal();

  return (
    <div className="w-full mt-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Radiology / Imaging
          </h2>
          <p className="text-sm text-gray-500">
            Manage and track patient radiology examinations
            {admissionNumber && <span className="ml-2 text-purple-600">| Admission: {admissionNumber}</span>}
          </p>
        </div>

        <Button onClick={() => setOpen(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          New Imaging Order
        </Button>
      </div>

      {/* Status Filter */}
      <div className="mb-4 flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {!hasOrders ? (
          <div className="p-8 text-center text-gray-500">
            <Scan className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm">No imaging orders found</p>
            <Button onClick={() => setOpen(true)} variant="outline" className="mt-3">
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Order
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Order #</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Modality</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Body Part</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Priority</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Ordered Date</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Amount</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-mono text-sm font-medium text-gray-900">
                        {order.order_number || `IMG-${order.id}`}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">
                          {order.type || order.modality || "Imaging Study"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {order.body_part || "Not specified"}
                    </td>
                    <td className="py-3 px-4">
                      {getPriorityBadge(order.priority || "routine")}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {order.ordered_date 
                        ? new Date(order.ordered_date).toLocaleDateString() 
                        : order.created_at 
                          ? new Date(order.created_at).toLocaleDateString() 
                          : "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(order.status || "pending")}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDetailsModal(true);
                        }}
                        variant="outline"
                        className="h-7 text-xs px-3"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Modal with Cart */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && setOpen(false)} />

          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{ maxHeight: "min(90vh, 750px)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Order Imaging Studies</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Patient ID: {patientId}
                  {admissionNumber && <span className="ml-2 text-purple-600">| Admission: {admissionNumber}</span>}
                </p>
              </div>
              <button
                onClick={() => !loading && setOpen(false)}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search imaging studies by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Main Content - Two Columns */}
            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Left Panel - Available Services */}
              <div className="w-[55%] border-r border-gray-100 flex flex-col overflow-hidden">
                <div className="px-4 py-2 bg-gray-50/60 border-b border-gray-100">
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                    Available Imaging Studies
                    {searchTerm && ` · ${filteredServices.length} result${filteredServices.length !== 1 ? "s" : ""}`}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {filteredServices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                      <Scan className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No imaging studies match your search</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredServices.map((service) => {
                        const price = getPrice(service);
                        const hasPrice = price > 0;
                        const isExpanded = expandedId === service.id;
                        const Icon = getIconForModality(service.service_name);

                        return (
                          <div key={service.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <Icon className="w-4 h-4 text-gray-500" />
                                  <p className="font-medium text-gray-900 text-sm">{service.service_name}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs font-medium ${hasPrice ? "text-emerald-600" : "text-red-500"}`}>
                                    {/* {hasPrice ? `ZMW ${price.toFixed(2)}` : "No price"} */}
                                  </span>
                                  <button
                                    onClick={() => setExpandedId(isExpanded ? null : service.id)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                  </button>
                                </div>
                                {isExpanded && service.description && (
                                  <p className="text-xs text-gray-500 mt-2">{service.description}</p>
                                )}
                              </div>
                              <button
                                onClick={() => addToCart(service)}
                                disabled={!hasPrice}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shadow-sm ${
                                  !hasPrice
                                    ? "bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed"
                                    : "bg-purple-600 border border-purple-600 text-white hover:bg-purple-700"
                                }`}
                              >
                                {!hasPrice ? "No Price" : "Add to Cart →"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Cart */}
              <div className="w-[45%] flex flex-col overflow-hidden bg-gray-50/40">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order Cart</span>
                  {cart.length > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      {cart.length} item{cart.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-gray-400">
                      <ShoppingCart className="w-12 h-12 opacity-25" />
                      <p className="text-sm font-medium">Cart is empty</p>
                      <p className="text-xs">Select an imaging study from the left to add</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.cartId} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{item.service_name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs font-medium text-emerald-600">
                                ZMW {item.total_amount}
                              </span>
                              <span className="text-xs text-gray-400">@ ZMW {item.price.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 px-1">
                              <button
                                onClick={() => updateCartItem(item.cartId, { quantity: Math.max(1, item.quantity - 1) })}
                                className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-gray-200"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateCartItem(item.cartId, { quantity: item.quantity + 1 })}
                                className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-gray-200"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.cartId, item.service_name)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Body Part Selection */}
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <label className="text-xs font-medium text-gray-600 block mb-1">Body Part *</label>
                          <input
                            type="text"
                            placeholder="e.g., Chest, Abdomen, Knee"
                            value={item.body_part}
                            onChange={(e) => updateCartItem(item.cartId, { body_part: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500"
                          />
                        </div>

                        {/* Priority Selection */}
                        <div className="mt-2">
                          <label className="text-xs font-medium text-gray-600 block mb-1">Priority</label>
                          <select
                            value={item.priority}
                            onChange={(e) => updateCartItem(item.cartId, { priority: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="routine">Routine (24-48 hours)</option>
                            <option value="urgent">Urgent (Within 24 hours)</option>
                            <option value="emergency">Emergency (Immediate)</option>
                            <option value="stat">STAT (1-2 hours)</option>
                          </select>
                        </div>

                        {/* Clinical Indication */}
                        <div className="mt-2">
                          <label className="text-xs font-medium text-gray-600 block mb-1">Clinical Indication</label>
                          <input
                            type="text"
                            placeholder="e.g., Suspected fracture, Chest pain"
                            value={item.indication}
                            onChange={(e) => updateCartItem(item.cartId, { indication: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500"
                          />
                        </div>

                        {/* Contrast Required */}
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`contrast-${item.cartId}`}
                            checked={item.contrast_required}
                            onChange={(e) => updateCartItem(item.cartId, { contrast_required: e.target.checked })}
                            className="w-3.5 h-3.5 text-purple-600 rounded"
                          />
                          <label htmlFor={`contrast-${item.cartId}`} className="text-xs text-gray-600">
                            Contrast required
                          </label>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Cart Footer */}
                {cart.length > 0 && (
                  <div className="p-4 border-t border-gray-200 bg-white shadow-lg">
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-700 block mb-1">Clinical Notes (Optional)</label>
                      <textarea
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        rows={2}
                        placeholder="Additional clinical information..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      />
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-xl font-bold text-gray-900">ZMW {total.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400">Items: {cart.length}</p>
                      </div>
                    </div>
                    <Button onClick={handleSubmit} disabled={loading} className="w-full h-10 text-sm font-medium bg-purple-600 hover:bg-purple-700">
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? "Placing Order..." : "Place Order"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={() => setShowDetailsModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Imaging Order Details
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Order #: {selectedOrder.order_number || `IMG-${selectedOrder.id}`}
                </p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Modality</label>
                  <p className="text-sm text-gray-900">{selectedOrder.type || selectedOrder.modality || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Body Part</label>
                  <p className="text-sm text-gray-900">{selectedOrder.body_part || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Priority</label>
                  <div>{getPriorityBadge(selectedOrder.priority || 'routine')}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Contrast</label>
                  <p className="text-sm text-gray-900">{selectedOrder.contrast_required ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Status</label>
                  <div>{getStatusBadge(selectedOrder.status || 'pending')}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Amount</label>
                  <p className="text-sm font-medium text-emerald-600">
                    ZMW {(selectedOrder.total_amount || selectedOrder.price || 0)}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Clinical Indication</label>
                <p className="text-sm text-gray-700 mt-1">{selectedOrder.indication || 'N/A'}</p>
              </div>
              {selectedOrder.clinical_history && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Clinical History</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedOrder.clinical_history}</p>
                </div>
              )}
              {selectedOrder.ordered_date && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Ordered Date</label>
                  <p className="text-sm text-gray-700 mt-1">{new Date(selectedOrder.ordered_date).toLocaleString()}</p>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Button onClick={() => setShowDetailsModal(false)} variant="outline" className="h-9 text-sm">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}