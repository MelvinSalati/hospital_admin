import React, { useState, useRef, useEffect } from 'react';

const ProductAdjustmentForm = () => {
  // ============ STATE ============
  const [formData, setFormData] = useState({
    // Header
    adjustmentNumber: `ADJ-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random()*1000)).padStart(3,'0')}`,
    adjustmentDate: new Date().toISOString().slice(0,16),
    location: '',
    reasonCategory: '',
    reasonSubCategory: '',
    
    // Target Product
    productSKU: '',
    productName: '',
    batchLot: '',
    currentStatus: 'Available',
    targetStatus: 'Available',
    
    // Delta (The Change)
    currentQuantity: 0,
    adjustedQuantity: 0,
    variance: 0,
    unitOfMeasure: 'Eaches',
    
    // Financial
    unitCost: 0,
    totalValue: 0,
    varianceAccount: 'Inventory Shrinkage',
    
    // Traceability
    parentDocument: '',
    documentType: 'PO',
    
    // Workflow
    initiator: '',
    verifier: '',
    approver: '',
    notes: '',
    
    // System
    syncAction: 'Adjust Now'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isVerifierVerified, setIsVerifierVerified] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  // ============ MOCK PRODUCT DATABASE ============
  const mockProducts = [
    { sku: 'PR-1001', name: 'Stainless Steel Bearing 6202', batch: 'B2026-01', cost: 4.50, uom: 'Eaches', location: 'WH-A / Z3 / R12 / B04' },
    { sku: 'PR-1002', name: 'Hydraulic Pump Seal Kit', batch: 'B2026-02', cost: 12.75, uom: 'Kit', location: 'WH-A / Z1 / R05 / B02' },
    { sku: 'PR-1003', name: 'Industrial Grade Lubricant 5L', batch: 'L2026-03', cost: 28.00, uom: 'Each', location: 'WH-B / Z2 / R08 / B01' },
    { sku: 'PR-1004', name: 'Brass Fitting 1/2" NPT', batch: 'B2026-04', cost: 1.20, uom: 'Eaches', location: 'WH-C / Z4 / R15 / B07' },
    { sku: 'PR-1005', name: 'Conveyor Belt Roller 48"', batch: 'R2026-05', cost: 89.50, uom: 'Each', location: 'WH-A / Z5 / R20 / B03' },
  ];

  // ============ SEARCH FUNCTION ============
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term.length > 0) {
      const results = mockProducts.filter(p => 
        p.sku.toLowerCase().includes(term.toLowerCase()) ||
        p.name.toLowerCase().includes(term.toLowerCase())
      );
      setSearchResults(results);
      setShowSearchDropdown(true);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  };

  const selectProduct = (product) => {
    setFormData(prev => ({
      ...prev,
      productSKU: product.sku,
      productName: product.name,
      batchLot: product.batch,
      unitCost: product.cost,
      unitOfMeasure: product.uom,
      location: product.location
    }));
    setSearchTerm(`${product.sku} - ${product.name}`);
    setShowSearchDropdown(false);
  };

  // ============ ADJUSTMENT BUTTONS (Delta) ============
  const handleAdjustment = (type) => {
    const current = formData.currentQuantity;
    let newQuantity = current;

    switch(type) {
      case 'increment':
        newQuantity = current + 1;
        break;
      case 'decrement':
        newQuantity = Math.max(0, current - 1);
        break;
      case 'add5':
        newQuantity = current + 5;
        break;
      case 'subtract5':
        newQuantity = Math.max(0, current - 5);
        break;
      case 'add10':
        newQuantity = current + 10;
        break;
      case 'subtract10':
        newQuantity = Math.max(0, current - 10);
        break;
      case 'setZero':
        newQuantity = 0;
        break;
      default:
        return;
    }

    const variance = newQuantity - current;
    setFormData(prev => ({
      ...prev,
      adjustedQuantity: newQuantity,
      variance: variance,
      totalValue: (newQuantity * prev.unitCost).toFixed(2)
    }));
  };

  // Auto-calculate variance when current quantity changes manually
  useEffect(() => {
    const variance = formData.adjustedQuantity - formData.currentQuantity;
    setFormData(prev => ({
      ...prev,
      variance: variance,
      totalValue: (prev.adjustedQuantity * prev.unitCost).toFixed(2)
    }));
  }, [formData.adjustedQuantity, formData.currentQuantity, formData.unitCost]);

  // ============ VERIFICATION & APPROVAL ============
  const handleVerify = () => {
    // In real app, this would scan badge or check auth
    setIsVerifierVerified(true);
    alert('✅ Verifier badge scanned & confirmed!');
  };

  const handleApprove = () => {
    if (!isVerifierVerified) {
      alert('⚠️ Must be verified by a second person before approval!');
      return;
    }
    setIsApproved(true);
    alert('✅ Adjustment approved! System will sync.');
  };

  // ============ SUBMIT ============
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isApproved) {
      alert('⚠️ This adjustment must be approved before submission!');
      return;
    }
    
    const payload = {
      ...formData,
      submittedAt: new Date().toISOString(),
      action: formData.syncAction,
      status: 'COMPLETED'
    };
    
    console.log('🚀 SUBMITTING ADJUSTMENT:', payload);
    alert(`✅ Adjustment ${formData.adjustmentNumber} submitted successfully!\nVariance: ${payload.variance} units\nTotal Value: $${payload.totalValue}`);
    
    // Reset verification for next adjustment
    setIsVerifierVerified(false);
    setIsApproved(false);
  };

  // ============ RESET ============
  const handleReset = () => {
    if (window.confirm('Reset all fields?')) {
      window.location.reload();
    }
  };

  // ============ STYLES (Compact & Clean) ============
  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '16px',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '16px',
      color: '#1a1a1a',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '2px solid #dee2e6',
      paddingBottom: '10px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      backgroundColor: 'white',
      padding: '16px',
      borderRadius: '6px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
    },
    fullWidth: {
      gridColumn: '1 / -1'
    },
    label: {
      display: 'block',
      fontSize: '11px',
      fontWeight: '600',
      color: '#495057',
      marginBottom: '3px',
      textTransform: 'uppercase',
      letterSpacing: '0.3px'
    },
    input: {
      width: '100%',
      padding: '5px 8px',
      fontSize: '13px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      backgroundColor: 'white',
      transition: 'border-color 0.15s'
    },
    select: {
      width: '100%',
      padding: '5px 8px',
      fontSize: '13px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      backgroundColor: 'white'
    },
    badge: {
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600'
    },
    buttonGroup: {
      display: 'flex',
      gap: '4px',
      flexWrap: 'wrap',
      marginTop: '4px'
    },
    btn: {
      padding: '4px 10px',
      fontSize: '12px',
      fontWeight: '600',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    btnPrimary: {
      backgroundColor: '#0d6efd',
      color: 'white',
      padding: '6px 16px',
      fontSize: '13px',
      fontWeight: '600',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    btnSuccess: {
      backgroundColor: '#198754',
      color: 'white',
      padding: '6px 16px',
      fontSize: '13px',
      fontWeight: '600',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    btnDanger: {
      backgroundColor: '#dc3545',
      color: 'white',
      padding: '6px 16px',
      fontSize: '13px',
      fontWeight: '600',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    btnSecondary: {
      backgroundColor: '#6c757d',
      color: 'white',
      padding: '6px 16px',
      fontSize: '13px',
      fontWeight: '600',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    searchWrapper: {
      position: 'relative'
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: 'white',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      maxHeight: '150px',
      overflowY: 'auto',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    dropdownItem: {
      padding: '6px 10px',
      cursor: 'pointer',
      fontSize: '13px',
      borderBottom: '1px solid #f1f3f5'
    },
    statusBadge: (status) => ({
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      backgroundColor: status === 'Available' ? '#d1e7dd' : '#f8d7da',
      color: status === 'Available' ? '#0f5132' : '#842029'
    }),
    varianceDisplay: (variance) => ({
      fontSize: '20px',
      fontWeight: '700',
      color: variance > 0 ? '#198754' : variance < 0 ? '#dc3545' : '#6c757d',
      padding: '4px 12px',
      backgroundColor: variance !== 0 ? '#f8f9fa' : 'transparent',
      borderRadius: '4px'
    })
  };

  // ============ RENDER ============
  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.title}>
        <span>📦 Product Adjustment Form</span>
        <span style={{ fontSize: '13px', fontWeight: '400', color: '#6c757d' }}>
          {formData.adjustmentNumber}
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={styles.grid}>

          {/* ===== LEFT COLUMN ===== */}
          {/* LEFT COLUMN - Product Search & Identity */}
          <div>
            <div style={{ marginBottom: '10px' }}>
              <label style={styles.label}>🔍 Search Product (SKU or Name)</label>
              <div style={styles.searchWrapper}>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Type SKU or product name..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchTerm.length > 0 && setShowSearchDropdown(true)}
                />
                {showSearchDropdown && searchResults.length > 0 && (
                  <div style={styles.dropdown}>
                    {searchResults.map((p) => (
                      <div
                        key={p.sku}
                        style={styles.dropdownItem}
                        onClick={() => selectProduct(p)}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        <strong>{p.sku}</strong> - {p.name} <span style={{ color: '#6c757d', fontSize: '12px' }}>({p.location})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={styles.label}>SKU</label>
                <input style={styles.input} value={formData.productSKU} readOnly />
              </div>
              <div>
                <label style={styles.label}>Batch/Lot</label>
                <input style={styles.input} value={formData.batchLot} readOnly />
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={styles.label}>Product Name</label>
              <input style={styles.input} value={formData.productName} readOnly />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={styles.label}>Location (Zone/Rack/Bin)</label>
                <input style={styles.input} value={formData.location} readOnly />
              </div>
              <div>
                <label style={styles.label}>UOM</label>
                <select style={styles.select} value={formData.unitOfMeasure} onChange={(e) => setFormData({...formData, unitOfMeasure: e.target.value})}>
                  <option>Eaches</option>
                  <option>Cases</option>
                  <option>Pallets</option>
                  <option>Kilograms</option>
                  <option>Liters</option>
                </select>
              </div>
            </div>
          </div>

          {/* ===== RIGHT COLUMN ===== */}
          {/* RIGHT COLUMN - Status & Traceability */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={styles.label}>Current Status</label>
                <select style={styles.select} value={formData.currentStatus} onChange={(e) => setFormData({...formData, currentStatus: e.target.value})}>
                  <option>Available</option>
                  <option>Quarantined</option>
                  <option>In-Transit</option>
                  <option>On-Hold</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Target Status</label>
                <select style={styles.select} value={formData.targetStatus} onChange={(e) => setFormData({...formData, targetStatus: e.target.value})}>
                  <option>Available</option>
                  <option>Quarantined</option>
                  <option>Scrap</option>
                  <option>Return to Vendor</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={styles.label}>Parent Document Type</label>
                <select style={styles.select} value={formData.documentType} onChange={(e) => setFormData({...formData, documentType: e.target.value})}>
                  <option>PO</option>
                  <option>SO</option>
                  <option>TO</option>
                  <option>WO</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Document #</label>
                <input style={styles.input} placeholder="e.g., PO-2026-045" value={formData.parentDocument} onChange={(e) => setFormData({...formData, parentDocument: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={styles.label}>📋 Reason Category</label>
                <select style={styles.select} value={formData.reasonCategory} onChange={(e) => setFormData({...formData, reasonCategory: e.target.value})}>
                  <option value="">Select...</option>
                  <option>Vendor Shortage</option>
                  <option>Vendor Damage</option>
                  <option>Customer Return</option>
                  <option>Internal Shrink</option>
                  <option>Administrative Error</option>
                  <option>Pick Error</option>
                  <option>Quality Hold Release</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Sub-Reason</label>
                <input style={styles.input} placeholder="e.g., miscount, damaged box" value={formData.reasonSubCategory} onChange={(e) => setFormData({...formData, reasonSubCategory: e.target.value})} />
              </div>
            </div>
          </div>

          {/* ===== FULL WIDTH - ADJUSTMENT SECTION (The Delta) ===== */}
          <div style={styles.fullWidth}>
            <div style={{ 
              backgroundColor: '#f1f3f5', 
              padding: '12px', 
              borderRadius: '6px',
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '12px',
              alignItems: 'center'
            }}>
              
              {/* Current Quantity */}
              <div>
                <label style={styles.label}>📊 Current System Count</label>
                <input 
                  type="number" 
                  style={{...styles.input, fontSize: '18px', fontWeight: '600'}} 
                  value={formData.currentQuantity} 
                  onChange={(e) => setFormData({...formData, currentQuantity: Number(e.target.value)})}
                />
              </div>

              {/* Adjustment Buttons (Compact) */}
              <div style={{ textAlign: 'center' }}>
                <label style={{...styles.label, textAlign: 'center'}}>⚡ Quick Adjust</label>
                <div style={styles.buttonGroup}>
                  <button type="button" style={{...styles.btn, backgroundColor: '#e9ecef'}} onClick={() => handleAdjustment('decrement')}>−1</button>
                  <button type="button" style={{...styles.btn, backgroundColor: '#e9ecef'}} onClick={() => handleAdjustment('subtract5')}>−5</button>
                  <button type="button" style={{...styles.btn, backgroundColor: '#e9ecef'}} onClick={() => handleAdjustment('subtract10')}>−10</button>
                  <button type="button" style={{...styles.btn, backgroundColor: '#ffc107', color: '#000'}} onClick={() => handleAdjustment('setZero')}>Zero</button>
                  <button type="button" style={{...styles.btn, backgroundColor: '#e9ecef'}} onClick={() => handleAdjustment('add10')}>+10</button>
                  <button type="button" style={{...styles.btn, backgroundColor: '#e9ecef'}} onClick={() => handleAdjustment('add5')}>+5</button>
                  <button type="button" style={{...styles.btn, backgroundColor: '#e9ecef'}} onClick={() => handleAdjustment('increment')}>+1</button>
                </div>
              </div>

              {/* Adjusted Quantity & Variance */}
              <div>
                <label style={styles.label}>✅ Adjusted Count</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="number" 
                    style={{...styles.input, fontSize: '18px', fontWeight: '700', borderColor: formData.variance !== 0 ? '#0d6efd' : '#ced4da'}} 
                    value={formData.adjustedQuantity} 
                    onChange={(e) => setFormData({...formData, adjustedQuantity: Number(e.target.value)})}
                  />
                  <span style={styles.varianceDisplay(formData.variance)}>
                    {formData.variance > 0 ? `+${formData.variance}` : formData.variance}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== FULL WIDTH - FINANCIAL & WORKFLOW ===== */}
          <div style={styles.fullWidth}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <label style={styles.label}>💰 Unit Cost ($)</label>
                <input type="number" style={styles.input} value={formData.unitCost} onChange={(e) => setFormData({...formData, unitCost: Number(e.target.value)})} />
              </div>
              <div>
                <label style={styles.label}>💵 Total Value ($)</label>
                <input style={{...styles.input, fontWeight: '600', backgroundColor: '#e9ecef'}} value={`$${formData.totalValue}`} readOnly />
              </div>
              <div>
                <label style={styles.label}>📂 Variance Account</label>
                <select style={styles.select} value={formData.varianceAccount} onChange={(e) => setFormData({...formData, varianceAccount: e.target.value})}>
                  <option>Inventory Shrinkage</option>
                  <option>Receiving Variance</option>
                  <option>Rework Labor</option>
                  <option>Obsolete Inventory</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>🔄 System Sync Action</label>
                <select style={styles.select} value={formData.syncAction} onChange={(e) => setFormData({...formData, syncAction: e.target.value})}>
                  <option>Adjust Now</option>
                  <option>Hold for Re-count</option>
                </select>
              </div>
            </div>
          </div>

          {/* ===== FULL WIDTH - VERIFICATION, APPROVAL & NOTES ===== */}
          <div style={styles.fullWidth}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <label style={styles.label}>👤 Initiator</label>
                <input style={styles.input} placeholder="Your name/badge" value={formData.initiator} onChange={(e) => setFormData({...formData, initiator: e.target.value})} />
              </div>
              <div>
                <label style={styles.label}>🔐 Verifier <span style={{color: isVerifierVerified ? '#198754' : '#dc3545'}}>{isVerifierVerified ? '✅' : '❌'}</span></label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input style={{...styles.input, flex: 1}} placeholder="Scan badge or type name" value={formData.verifier} onChange={(e) => setFormData({...formData, verifier: e.target.value})} />
                  <button type="button" style={{...styles.btn, backgroundColor: '#6f42c1', color: 'white', padding: '5px 12px'}} onClick={handleVerify}>Verify</button>
                </div>
              </div>
              <div>
                <label style={styles.label}>✅ Approver</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input style={{...styles.input, flex: 1}} placeholder="Manager name" value={formData.approver} onChange={(e) => setFormData({...formData, approver: e.target.value})} />
                  <button type="button" style={{...styles.btn, backgroundColor: '#198754', color: 'white', padding: '5px 12px'}} onClick={handleApprove}>Approve</button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== FULL WIDTH - NOTES ===== */}
          <div style={styles.fullWidth}>
            <label style={styles.label}>📝 Notes / Root Cause</label>
            <textarea 
              style={{...styles.input, minHeight: '40px', resize: 'vertical'}} 
              placeholder="Describe what happened, attach photos/references if needed..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          {/* ===== FULL WIDTH - ACTION BUTTONS ===== */}
          <div style={{...styles.fullWidth, display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #dee2e6', paddingTop: '12px', marginTop: '4px'}}>
            <button type="button" style={styles.btnSecondary} onClick={handleReset}>🗑️ Reset</button>
            <button type="submit" style={{...styles.btnSuccess, padding: '8px 32px', fontSize: '14px'}}>
              📤 Submit Adjustment
            </button>
          </div>

          {/* Status Bar */}
          <div style={{...styles.fullWidth, display: 'flex', gap: '16px', fontSize: '12px', color: '#6c757d', paddingTop: '6px'}}>
            <span>🔹 Adjustment: <strong>{formData.adjustmentNumber}</strong></span>
            <span>🔹 Variance: <strong style={{color: formData.variance > 0 ? '#198754' : formData.variance < 0 ? '#dc3545' : '#6c757d'}}>{formData.variance > 0 ? '+' : ''}{formData.variance}</strong></span>
            <span>🔹 Verifier: {isVerifierVerified ? '✅ Verified' : '⏳ Pending'}</span>
            <span>🔹 Approved: {isApproved ? '✅ Yes' : '⏳ Pending'}</span>
          </div>

        </div>
      </form>
    </div>
  );
};

export default AdjustmentModal;