import React, { useState } from 'react';
import { fixVendorBusinessNames } from '../../utils/fixVendorBusinessNames';

export default function VendorMigrationTool() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runMigration = async () => {
    if (!window.confirm('This will update all vendor businessName fields. Continue?')) {
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const migrationResult = await fixVendorBusinessNames();
      setResult(migrationResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '600px',
      margin: '40px auto',
      background: '#fff',
      borderRadius: '16px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginBottom: '16px', color: '#E61E26' }}>
        🔧 Vendor BusinessName Migration
      </h2>
      
      <p style={{ marginBottom: '24px', color: '#666', lineHeight: '1.6' }}>
        This tool will sync the <code>businessName</code> field with the <code>name</code> field 
        for all vendors that have missing or generic business names.
      </p>

      <button
        onClick={runMigration}
        disabled={running}
        style={{
          width: '100%',
          padding: '16px',
          background: running ? '#ccc' : '#E61E26',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: running ? 'not-allowed' : 'pointer',
          marginBottom: '16px'
        }}
      >
        {running ? '⏳ Running Migration...' : '🚀 Run Migration'}
      </button>

      {result && (
        <div style={{
          padding: '16px',
          background: '#f0fdf4',
          border: '2px solid #2ECC71',
          borderRadius: '12px',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#2ECC71' }}>✅ Migration Complete!</h3>
          <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.8' }}>
            <div>✅ Fixed: <strong>{result.fixed}</strong> vendors</div>
            <div>⏭️ Skipped: <strong>{result.skipped}</strong> vendors</div>
            <div>❌ Errors: <strong>{result.errors}</strong> vendors</div>
            <div>📦 Total: <strong>{result.total}</strong> vendors</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: '16px',
          background: '#fff5f5',
          border: '2px solid #E61E26',
          borderRadius: '12px',
          color: '#E61E26'
        }}>
          <h3 style={{ margin: '0 0 8px 0' }}>❌ Error</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
        </div>
      )}

      <div style={{
        marginTop: '24px',
        padding: '12px',
        background: '#f9f9f9',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#666'
      }}>
        <strong>Note:</strong> This migration is safe to run multiple times. 
        It only updates vendors with missing or generic businessName values.
      </div>
    </div>
  );
}
