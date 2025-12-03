// Report Queue Demo - v0 Inspired
class ReportApp {
  constructor() {
    this.reports = [];
    this.pollInterval = null;
    this.statusFilter = 'all';
    this.searchQuery = '';
    this.currentPage = 1;
    this.itemsPerPage = 5;
    this.currentView = 'list'; // 'list' or 'detail'
    this.selectedReportId = null;
    
    this.init();
  }

  init() {
    // Setup event listeners
    document.getElementById('generateBtn').addEventListener('click', () => {
      this.generateReport();
    });

    document.getElementById('statusFilter').addEventListener('change', (e) => {
      this.statusFilter = e.target.value;
      this.currentPage = 1;
      this.renderReports();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.currentPage = 1;
      this.renderReports();
    });

    document.getElementById('backBtn').addEventListener('click', () => {
      this.showListView();
    });
    
    // Load initial reports
    this.loadReports();
    
    // Start polling for updates
    this.startPolling();
  }

  startPolling() {
    // Poll every 1 second for real-time updates
    this.pollInterval = setInterval(() => {
      this.loadReports();
    }, 1000);
  }

  async generateReport() {
    try {
      const response = await fetch('/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const result = await response.json();
        this.showToast('Report generation started', 'Your report has been added to the queue...', 'info');
        
        // Immediately reload to show PENDING status
        setTimeout(() => this.loadReports(), 300);
      } else {
        throw new Error('Failed to create report');
      }
    } catch (error) {
      console.error('Error creating report:', error);
      this.showToast('Error', 'Failed to create report', 'error');
    }
  }

  async loadReports() {
    try {
      const response = await fetch('/reports');

      if (response.ok) {
        const newReports = await response.json();
        
        // Check if reports actually changed to avoid unnecessary re-renders
        const reportsChanged = JSON.stringify(this.reports) !== JSON.stringify(newReports);
        
        this.reports = newReports;
        
        if (this.currentView === 'list') {
          if (reportsChanged) {
            this.renderReports();
          }
        } else if (this.currentView === 'detail' && this.selectedReportId) {
          this.renderDetailView(this.selectedReportId);
        }
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  }

  getFilteredReports() {
    return this.reports.filter(report => {
      const matchesStatus = this.statusFilter === 'all' || report.status === this.statusFilter;
      const matchesSearch = this.searchQuery === '' || 
        report.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }

  renderReports() {
    const container = document.getElementById('reportsList');
    const filteredReports = this.getFilteredReports();
    
    if (filteredReports.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="4">
            <div class="empty-state">
              <h3>No reports found</h3>
              <p>${this.statusFilter === 'all' && !this.searchQuery 
                ? 'Click "Generate Report" to create your first report.' 
                : 'Try adjusting your filters.'}</p>
            </div>
          </td>
        </tr>
      `;
      document.getElementById('paginationContainer').style.display = 'none';
      return;
    }

    // Sort by created date (newest first)
    const sortedReports = [...filteredReports]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Pagination
    const totalPages = Math.ceil(sortedReports.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedReports = sortedReports.slice(startIndex, endIndex);

    container.innerHTML = paginatedReports.map(report => {
      const createdDate = new Date(report.created_at).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      const shortId = report.id.length > 8 ? report.id.substring(0, 8) : report.id;
      
      // Build status cell with optional progress
      let statusHTML = '';
      if (report.status === 'RUNNING' && report.progress !== undefined) {
        statusHTML = `
          <div class="status-cell">
            <span class="status-badge status-running">
              <span class="status-dot"></span>
              RUNNING
            </span>
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${report.progress}%"></div>
              </div>
              <span class="progress-text">${report.progress}% ${report.progress_message || ''}</span>
            </div>
          </div>
        `;
      } else {
        const statusLabel = report.status === 'PENDING' ? 'QUEUED' : 
                          report.status === 'RUNNING' ? 'PROCESSING' : 
                          report.status === 'READY' ? 'COMPLETED' : 
                          report.status === 'CANCELLED' ? 'CANCELLED' : 
                          report.status;
        statusHTML = `
          <span class="status-badge status-${report.status.toLowerCase()}">
            <span class="status-dot"></span>
            ${statusLabel}
          </span>
        `;
      }

      // Build action buttons (only cancel for PENDING, download for READY, details for FAILED)
      let actionButton = '';
      if (report.status === 'READY') {
        actionButton = `<button class="btn-action btn-download" onclick="app.downloadReport('${report.id}')">Download</button>`;
      } else if (report.status === 'FAILED') {
        actionButton = `<button class="btn-action btn-details" onclick="app.showDetailView('${report.id}')">Details</button>`;
      } else if (report.status === 'PENDING') {
        actionButton = `<button class="btn-action btn-cancel" onclick="app.cancelReport('${report.id}')">Cancel</button>`;
      } else if (report.status === 'RUNNING') {
        actionButton = `<button class="btn-action btn-details" onclick="app.showDetailView('${report.id}')">View</button>`;
      }
      // No button for RUNNING status

      return `
        <tr>
          <td><span class="report-id">${shortId}</span></td>
          <td><span class="report-date">${createdDate}</span></td>
          <td>${statusHTML}</td>
          <td class="text-right">${actionButton}</td>
        </tr>
      `;
    }).join('');

    // Add empty placeholder rows to maintain consistent height (5 rows total)
    const emptyRowsNeeded = this.itemsPerPage - paginatedReports.length;
    for (let i = 0; i < emptyRowsNeeded; i++) {
      container.innerHTML += `
        <tr class="empty-row">
          <td>&nbsp;</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
    }

    // Render pagination
    this.renderPagination(sortedReports.length, totalPages);
  }

  renderPagination(totalItems, totalPages) {
    const paginationContainer = document.getElementById('paginationContainer');
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationControls = document.getElementById('paginationControls');

    if (totalPages <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }

    paginationContainer.style.display = 'flex';

    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);

    paginationInfo.textContent = `Showing ${startItem}–${endItem} of ${totalItems} reports`;

    // Build pagination controls
    let controlsHTML = '';
    
    // Previous button
    controlsHTML += `
      <button class="btn-page" ${this.currentPage === 1 ? 'disabled' : ''} 
        onclick="app.goToPage(${this.currentPage - 1})">
        Prev
      </button>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      controlsHTML += `
        <button class="btn-page ${i === this.currentPage ? 'active' : ''}" 
          onclick="app.goToPage(${i})">
          ${i}
        </button>
      `;
    }

    // Next button
    controlsHTML += `
      <button class="btn-page" ${this.currentPage === totalPages ? 'disabled' : ''} 
        onclick="app.goToPage(${this.currentPage + 1})">
        Next
      </button>
    `;

    paginationControls.innerHTML = controlsHTML;
  }

  goToPage(page) {
    const filteredReports = this.getFilteredReports();
    const totalPages = Math.ceil(filteredReports.length / this.itemsPerPage);
    
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      this.renderReports();
    }
  }

  async downloadReport(reportId) {
    try {
      const response = await fetch(`/reports/${reportId}/download`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        this.showToast('Success', 'Report downloaded successfully', 'success');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      this.showToast('Error', 'Failed to download report', 'error');
    }
  }

  showDetails(reportId) {
    const report = this.reports.find(r => r.id === reportId);
    if (report && report.error_message) {
      this.showToast('Error Details', report.error_message, 'error');
    } else {
      this.showToast('No Details', 'No error details available', 'info');
    }
  }

  showListView() {
    this.currentView = 'list';
    this.selectedReportId = null;
    document.getElementById('listView').style.display = 'block';
    document.getElementById('detailView').style.display = 'none';
    this.renderReports();
  }

  showDetailView(reportId) {
    this.currentView = 'detail';
    this.selectedReportId = reportId;
    document.getElementById('listView').style.display = 'none';
    document.getElementById('detailView').style.display = 'block';
    this.renderDetailView(reportId);
  }

  renderDetailView(reportId) {
    const report = this.reports.find(r => r.id === reportId);
    
    if (!report) {
      this.showListView();
      return;
    }

    // Update title
    const title = report.status === 'FAILED' ? 'Report Error' : 'Report Details';
    document.getElementById('detailTitle').textContent = title;

    // Update report ID
    document.getElementById('detailReportId').textContent = report.id;

    // Update created at
    const createdDate = new Date(report.created_at).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    document.getElementById('detailCreatedAt').textContent = createdDate;

    // Update status badge
    const statusLabel = report.status === 'PENDING' ? 'QUEUED' : 
                      report.status === 'RUNNING' ? 'PROCESSING' : 
                      report.status === 'READY' ? 'COMPLETED' : 
                      report.status === 'CANCELLED' ? 'CANCELLED' : 
                      report.status;
    const statusBadgeHTML = `
      <span class="status-badge status-${report.status.toLowerCase()}">
        <span class="status-dot"></span>
        ${statusLabel}
      </span>
    `;
    document.getElementById('detailStatusBadge').innerHTML = statusBadgeHTML;

    // Update progress
    let progressHTML = '';
    if (report.status === 'RUNNING' && report.progress !== undefined) {
      progressHTML = `
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${report.progress}%"></div>
          </div>
          <span class="progress-text">${report.progress}%</span>
        </div>
      `;
    } else {
      progressHTML = `
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${report.progress || 0}%"></div>
          </div>
          <span class="progress-text">${report.progress || 0}%</span>
        </div>
      `;
    }
    document.getElementById('detailProgress').innerHTML = progressHTML;

    // Update message
    let message = '';
    if (report.status === 'FAILED') {
      message = report.error_message || 'Report generation failed.';
    } else if (report.status === 'RUNNING') {
      if (report.progress < 40) {
        message = 'Queued: Waiting to be picked up from the queue...';
      } else if (report.progress < 80) {
        message = 'Generating: Creating your report...';
      } else {
        message = 'Emailing: Sending notification with download link...';
      }
      if (report.progress_message) {
        message = `${message}\n\n${report.progress_message}`;
      }
    } else if (report.status === 'READY') {
      message = 'Complete! Your report has been generated and the download link was sent via email.';
    } else if (report.status === 'PENDING') {
      message = 'Your report is queued and waiting to be processed.';
    }
    document.getElementById('detailMessage').textContent = message;

    // Update action buttons
    let actionsHTML = '';
    if (report.status === 'READY') {
      actionsHTML = `
        <button class="btn-download-detail" onclick="app.downloadReport('${report.id}')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 11L8 3M8 11L5 8M8 11L11 8M2 13L14 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Download PDF
        </button>
      `;
    } else if (report.status === 'FAILED') {
      actionsHTML = `
        <button class="btn-retry" onclick="app.retryReport('${report.id}')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8C2 5.79086 3.79086 4 6 4H10C12.2091 4 14 5.79086 14 8C14 10.2091 12.2091 12 10 12H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M4 10L2 8L4 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Retry Report
        </button>
      `;
    } else if (report.status === 'PENDING') {
      actionsHTML = `
        <button class="btn-cancel-detail" onclick="app.cancelReport('${report.id}')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Cancel Report
        </button>
      `;
    }
    // No action button for RUNNING status
    document.getElementById('detailActions').innerHTML = actionsHTML;
  }

  async retryReport(reportId) {
    const report = this.reports.find(r => r.id === reportId);
    if (!report) {
      this.showToast('Error', 'Report not found', 'error');
      return;
    }

    // Show retrying state
    const retryBtn = document.querySelector('.btn-retry');
    if (retryBtn) {
      retryBtn.disabled = true;
      retryBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 8C2 5.79086 3.79086 4 6 4H10C12.2091 4 14 5.79086 14 8C14 10.2091 12.2091 12 10 12H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M4 10L2 8L4 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Retrying...
      `;
    }

    try {
      // Create a new report with the same params
      const response = await fetch('/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const result = await response.json();
        this.showToast('Report resubmitted', `New report ${result.id} has been added to the queue.`, 'success');
        
        // Go back to list view and reload reports
        this.showListView();
        await this.loadReports();
      } else {
        throw new Error('Failed to retry report');
      }
    } catch (error) {
      console.error('Error retrying report:', error);
      this.showToast('Error', 'Failed to retry report', 'error');
      
      // Restore button state
      if (retryBtn) {
        retryBtn.disabled = false;
        retryBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8C2 5.79086 3.79086 4 6 4H10C12.2091 4 14 5.79086 14 8C14 10.2091 12.2091 12 10 12H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M4 10L2 8L4 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Retry Report
        `;
      }
    }
  }

  async cancelReport(reportId) {
    if (!confirm('Are you sure you want to cancel this report?')) {
      return;
    }

    try {
      const response = await fetch(`/reports/${reportId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.showToast('Report cancelled', 'The report generation has been cancelled and removed from the queue.', 'success');
        this.loadReports();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel report');
      }
    } catch (error) {
      console.error('Error cancelling report:', error);
      this.showToast('Error', error.message || 'Failed to cancel report', 'error');
    }
  }

  showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 4000);
  }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new ReportApp();
});
