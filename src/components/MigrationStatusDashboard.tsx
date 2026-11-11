/**
 * Migration Status Dashboard
 * 
 * Real-time migration progress monitoring and management
 */

import React, { useState, useEffect } from 'react';
import { MigrationStatusTracker, MigrationStatus, MigrationManager } from '../utils/migrationStatusTracker';
import './MigrationStatusDashboard.css';

export const MigrationStatusDashboard: React.FC = () => {
  const [currentMigration, setCurrentMigration] = useState<MigrationStatus | null>(null);
  const [migrationHistory, setMigrationHistory] = useState<MigrationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMigrationData();
  }, []);

  const loadMigrationData = async () => {
    try {
      setIsLoading(true);
      
      // Get latest migration
      const latest = await MigrationManager.getLatestMigration();
      setCurrentMigration(latest);
      
      // Get migration history
      const history = await MigrationManager.listMigrations();
      setMigrationHistory(history.slice(0, 10)); // Show last 10
      
      // Set up real-time listener for current migration
      if (latest && ['started', 'in-progress', 'paused'].includes(latest.status)) {
        const tracker = new MigrationStatusTracker(latest.id);
        
        const unsubscribe = tracker.onStatusChange((status) => {
          setCurrentMigration(status);
        });
        
        return unsubscribe;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load migration data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    
    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'in-progress': return 'warning';
      case 'paused': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'in-progress': return '🔄';
      case 'paused': return '⏸️';
      case 'started': return '🚀';
      default: return '⚪';
    }
  };

  if (isLoading) {
    return (
      <div className="migration-dashboard loading">
        <div className="loading-spinner">🔄</div>
        <p>Loading migration status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="migration-dashboard error">
        <h3>❌ Error Loading Migration Data</h3>
        <p>{error}</p>
        <button onClick={loadMigrationData} className="retry-button">
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div className="migration-dashboard">
      <header className="dashboard-header">
        <h2>🔄 Migration Status Dashboard</h2>
        <button onClick={loadMigrationData} className="refresh-button">
          🔄 Refresh
        </button>
      </header>

      {/* Current Migration Status */}
      {currentMigration && (
        <div className="current-migration">
          <h3>📊 Current Migration</h3>
          <div className="migration-card current">
            <div className="migration-header">
              <span className={`status-badge ${getStatusColor(currentMigration.status)}`}>
                {getStatusIcon(currentMigration.status)} {currentMigration.status.toUpperCase()}
              </span>
              <span className="migration-id">{currentMigration.id}</span>
            </div>

            {/* Progress Bar */}
            <div className="progress-section">
              <div className="progress-header">
                <span>Progress: {currentMigration.progress.percentage}%</span>
                {currentMigration.progress.estimatedTimeRemaining && (
                  <span>ETA: {formatDuration(currentMigration.progress.estimatedTimeRemaining)}</span>
                )}
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${currentMigration.progress.percentage}%` }}
                />
              </div>
            </div>

            {/* Current Processing */}
            {currentMigration.progress.currentVendorName && (
              <div className="current-processing">
                <p>
                  🏪 Processing: <strong>{currentMigration.progress.currentVendorName}</strong>
                </p>
              </div>
            )}

            {/* Statistics */}
            <div className="migration-stats">
              <div className="stat-group">
                <h4>📈 Progress</h4>
                <div className="stats-grid">
                  <div className="stat">
                    <span className="stat-label">Vendors</span>
                    <span className="stat-value">
                      {currentMigration.processedVendors} / {currentMigration.totalVendors}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Products</span>
                    <span className="stat-value">
                      {currentMigration.migratedProducts} / {currentMigration.totalProducts}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Failed</span>
                    <span className="stat-value error">
                      {currentMigration.failedProducts}
                    </span>
                  </div>
                </div>
              </div>

              <div className="stat-group">
                <h4>⚡ Performance</h4>
                <div className="stats-grid">
                  <div className="stat">
                    <span className="stat-label">Duration</span>
                    <span className="stat-value">
                      {formatDuration(currentMigration.performance.duration)}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Rate</span>
                    <span className="stat-value">
                      {currentMigration.performance.productsPerSecond?.toFixed(2) || 'N/A'} /s
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Started</span>
                    <span className="stat-value">
                      {formatTimestamp(currentMigration.performance.startTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Errors */}
            {currentMigration.errors && currentMigration.errors.length > 0 && (
              <div className="errors-section">
                <h4>⚠️ Errors ({currentMigration.errors.length})</h4>
                <div className="errors-list">
                  {currentMigration.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className={`error-item ${error.severity}`}>
                      <span className="error-severity">
                        {error.severity === 'critical' ? '🔴' : 
                         error.severity === 'error' ? '🟠' : '🟡'}
                      </span>
                      <div className="error-details">
                        <p>{error.error}</p>
                        <small>
                          Vendor: {error.vendorId}
                          {error.productId && ` | Product: ${error.productId}`}
                          | {formatTimestamp(error.timestamp)}
                        </small>
                      </div>
                    </div>
                  ))}
                  {currentMigration.errors.length > 5 && (
                    <p className="more-errors">
                      ... and {currentMigration.errors.length - 5} more errors
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Migration History */}
      <div className="migration-history">
        <h3>📚 Migration History</h3>
        {migrationHistory.length === 0 ? (
          <p className="no-history">No migration history found.</p>
        ) : (
          <div className="history-list">
            {migrationHistory.map((migration) => (
              <div key={migration.id} className="migration-card history">
                <div className="migration-header">
                  <span className={`status-badge ${getStatusColor(migration.status)}`}>
                    {getStatusIcon(migration.status)} {migration.status.toUpperCase()}
                  </span>
                  <span className="migration-timestamp">
                    {formatTimestamp(migration.timestamp)}
                  </span>
                </div>
                
                <div className="migration-summary">
                  <div className="summary-stats">
                    <span>🏪 {migration.processedVendors}/{migration.totalVendors} vendors</span>
                    <span>📦 {migration.migratedProducts}/{migration.totalProducts} products</span>
                    {migration.failedProducts > 0 && (
                      <span className="error">❌ {migration.failedProducts} failed</span>
                    )}
                  </div>
                  
                  {migration.performance.duration && (
                    <div className="performance-summary">
                      <span>⏱️ {formatDuration(migration.performance.duration)}</span>
                      <span>⚡ {migration.performance.productsPerSecond?.toFixed(2)}/s</span>
                    </div>
                  )}
                </div>
                
                <div className="migration-id">{migration.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Migration Actions */}
      <div className="migration-actions">
        <h3>🔧 Migration Actions</h3>
        <div className="action-buttons">
          <button 
            className="action-button primary"
            onClick={() => window.location.href = '/admin/migration'}
          >
            🚀 Start New Migration
          </button>
          
          {currentMigration?.status === 'paused' && (
            <button className="action-button warning">
              ▶️ Resume Migration
            </button>
          )}
          
          {['started', 'in-progress'].includes(currentMigration?.status || '') && (
            <button className="action-button danger">
              ⏸️ Pause Migration
            </button>
          )}
          
          <button 
            className="action-button secondary"
            onClick={() => MigrationManager.cleanupOldMigrations()}
          >
            🗑️ Cleanup Old Records
          </button>
        </div>
      </div>
    </div>
  );
};

export default MigrationStatusDashboard;
