// Google Sheets Integration for AICS
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const config = require('./config');

class GoogleSheetsCRM {
  constructor() {
    this.initialized = false;
  }

  init(serviceAccountKey) {
    if (!serviceAccountKey) {
      console.warn('No Google Sheets service account key provided');
      return false;
    }

    this.serviceAccountKey = serviceAccountKey;
    this.initialized = true;
    return true;
  }

  async getDoc(spreadsheetId) {
    if (!this.initialized || !this.serviceAccountKey) {
      console.warn('Google Sheets not initialized');
      return null;
    }

    try {
      // Parse service account key
      let creds;
      if (typeof this.serviceAccountKey === 'string') {
        creds = JSON.parse(this.serviceAccountKey);
      } else {
        creds = this.serviceAccountKey;
      }

      // Create JWT auth client
      const jwt = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive',
        ],
      });

      const doc = new GoogleSpreadsheet(spreadsheetId, jwt);
      await doc.loadInfo();

      return doc;
    } catch (error) {
      console.error('Error loading Google Sheet:', error);
      return null;
    }
  }

  async ensureSheet(spreadsheetId) {
    const doc = await this.getDoc(spreadsheetId);
    if (!doc) return null;

    // Check if we have a "Leads" sheet, create it if not
    let sheet;
    if (doc.sheetsByTitle['Leads']) {
      sheet = doc.sheetsByTitle['Leads'];
    } else {
      sheet = await doc.addSheet({
        title: 'Leads',
        headerValues: [
          'ID',
          'Name',
          'Email',
          'Phone',
          'Company',
          'Notes',
          'Status',
          'Score',
          'Created At'
        ],
      });
    }

    return sheet;
  }

  async addLead(spreadsheetId, lead) {
    const sheet = await this.ensureSheet(spreadsheetId);
    if (!sheet) return false;

    try {
      await sheet.addRow({
        ID: lead.id,
        Name: lead.name,
        Email: lead.email,
        Phone: lead.phone,
        Company: lead.company,
        Notes: lead.notes,
        Status: lead.status,
        Score: lead.score,
        'Created At': new Date(lead.createdAt).toLocaleString()
      });
      console.log(`Lead ${lead.id} added to Google Sheets`);
      return true;
    } catch (error) {
      console.error('Error adding lead to Google Sheets:', error);
      return false;
    }
  }

  async updateLead(spreadsheetId, leadId, updates) {
    const sheet = await this.ensureSheet(spreadsheetId);
    if (!sheet) return false;

    try {
      const rows = await sheet.getRows();
      const row = rows.find(r => r.ID === leadId);
      if (row) {
        if (updates.name !== undefined) row.Name = updates.name;
        if (updates.email !== undefined) row.Email = updates.email;
        if (updates.phone !== undefined) row.Phone = updates.phone;
        if (updates.company !== undefined) row.Company = updates.company;
        if (updates.notes !== undefined) row.Notes = updates.notes;
        if (updates.status !== undefined) row.Status = updates.status;
        if (updates.score !== undefined) row.Score = updates.score;

        await row.save();
        console.log(`Lead ${leadId} updated in Google Sheets`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating lead in Google Sheets:', error);
      return false;
    }
  }
}

module.exports = GoogleSheetsCRM;
