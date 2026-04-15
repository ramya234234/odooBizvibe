# BizVibe Smart AI for Odoo

[![License: LGPL-3](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://www.gnu.org/licenses/lgpl-3.0)
[![Odoo Version](https://img.shields.io/badge/Odoo-17.0-875A7B.svg)](https://www.odoo.com)

**Find B2B Company Insights & Enrich Data with AI - Directly in Your Odoo CRM**

BizVibe Smart AI brings the power of intelligent company search and data enrichment right into your Odoo environment. Save time, find better prospects, and close deals faster with AI-powered company intelligence.

## 🚀 Features

### 🔍 Smart Search
- **Natural Language Queries**: Search using plain English like "Software companies in Mumbai with 50+ employees"
- **AI-Powered Results**: Get relevant company matches ranked by relevance
- **Rich Company Data**: View industry, location, employee count, revenue, and detailed descriptions
- **Modern Interface**: Beautiful, responsive search interface built with OWL

### 📊 Instant Data Enrichment
- **One-Click Enrichment**: Update Partner and Lead records with BizVibe data instantly
- **Smart Field Mapping**: Automatically populate industry, location, website, and notes
- **Batch Processing**: Enrich multiple contacts at once

### 🎯 CRM Integration
- **Seamless Workflow**: Launch searches directly from Contacts or Leads
- **Quick Import**: Convert search results to Contacts or CRM Leads with one click
- **Context-Aware**: Pre-populate search queries based on current record

### 📈 Market Intelligence
- **Company Profiles**: Access detailed company information
- **Business Insights**: Get AI-generated summaries and recommendations
- **Competitive Research**: Discover similar companies and market trends

## 📋 Requirements

- **Odoo Version**: 17.0 or higher
- **Odoo Modules**: `base`, `crm`, `contacts`, `web`
- **BizVibe API Key**: Required for production use (optional for demo with mock data)

## 🔧 Installation

### Method 1: Manual Installation

1. **Download the module**
   ```bash
   cd /path/to/odoo/addons
   git clone <repository-url> bizvibe_smart_ai
   # OR download and extract ZIP file
   ```

2. **Restart Odoo server**
   ```bash
   ./odoo-bin -c odoo.conf --stop-after-init
   ./odoo-bin -c odoo.conf
   ```

3. **Update Apps List**
   - Log into Odoo
   - Go to **Apps** menu
   - Click **Update Apps List**
   - Search for "BizVibe Smart AI"

4. **Install the module**
   - Click **Install** button

### Method 2: Docker Installation

If using Docker Compose (as in this project):

```bash
# Module is already mounted via docker-compose.yml
docker-compose restart web

# Access Odoo at http://localhost:8069
# Default credentials: admin / admin
```

## ⚙️ Configuration

### 1. API Key Setup (For Production)

To connect to the real BizVibe API:

1. Navigate to **Settings** → **General Settings**
2. Scroll to **BizVibe Smart AI** section
3. Enter your credentials:
   - **BizVibe API Key**: Your API key from BizVibe
   - **BizVibe API Endpoint**: `https://api.bizvibe.com` (default)
4. Click **Save**

> **Note**: The module includes mock data for demo purposes. You can test all features without an API key.

### 2. User Access Rights

By default, all users with "User" access can use BizVibe Smart AI features. To customize:

1. Go to **Settings** → **Users & Companies** → **Users**
2. Select a user
3. Ensure they have appropriate CRM/Sales access rights

## 📖 Usage Guide

### Smart Search

#### From Apps Menu
1. Go to **BizVibe Intelligence** in the main menu
2. Enter your search query (e.g., "Tech startups in San Francisco")
3. Press **Enter** or click **Search**
4. Browse results and click any company for detailed profile

#### From Contacts
1. Open a Contact record
2. Click **Enrich with BizVibe** button
3. Search interface opens with company name pre-filled
4. Review results and import data

#### From CRM Leads
1. Open a Lead/Opportunity
2. Click **Enrich with BizVibe** button
3. Search for related companies
4. Import to enrich lead data

### Importing Data

**To Contacts:**
- Click **Add to Contacts** on any search result
- Automatically creates a new Contact with company data

**To CRM Leads:**
- Click **Create Lead** on any search result
- Generates a new opportunity with enriched information

### Using the Legacy Wizard (Optional)

For batch operations:

1. Go to **BizVibe** → **Smart Search Wizard**
2. Enter search query
3. Click **Search**
4. Select multiple results
5. Click **Import as Contacts** or **Import as Leads**

## 🎨 Features Showcase

### Natural Language Search
```
✓ "I need cold chain logistics providers in Africa"
✓ "Find laboratory equipment suppliers for biochemical research"
✓ "RFID tracking solution vendors for inventory management"
✓ "Software companies in Mumbai with 100+ employees"
```

### AI Overview
Get instant AI-generated summaries of search results:
- Market landscape overview
- Key players analysis
- Recommended next steps

### One-Click Enrichment
Transform sparse contact data into rich company profiles with:
- Industry classification
- Employee count ranges
- Revenue estimates
- Business descriptions
- Contact details

## 🛠️ Development & Customization

### File Structure
```
bizvibe_smart_ai/
├── __init__.py
├── __manifest__.py
├── README.md
├── models/
│   ├── __init__.py
│   ├── res_partner.py          # Contact enrichment
│   ├── crm_lead.py              # Lead enrichment
│   └── res_config_settings.py  # API configuration
├── wizard/
│   ├── __init__.py
│   ├── bizvibe_search_wizard.py
│   └── bizvibe_search_wizard_view.xml
├── views/
│   ├── client_action_view.xml   # Smart Search action
│   ├── res_partner_views.xml    # Contact buttons
│   ├── crm_lead_views.xml       # Lead buttons
│   └── res_config_settings_view.xml
├── static/
│   ├── description/
│   │   ├── icon.png
│   │   ├── index.html
│   │   └── screenshots/
│   └── src/
│       ├── css/smart_search.css
│       ├── js/
│       │   ├── smart_search.js      # Main OWL component
│       │   └── mockApiService.js    # Mock API for demo
│       └── xml/smart_search.xml     # QWeb templates
└── security/
    └── ir.model.access.csv
```

### Customizing API Integration

Replace mock API calls in `static/src/js/mockApiService.js` with real API endpoints:

```javascript
async function searchCompanies(query) {
    const apiKey = await getApiKey();
    const endpoint = await getApiEndpoint();
    
    const response = await fetch(`${endpoint}/search`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });
    
    return await response.json();
}
```

## 🐛 Troubleshooting

### Module Not Appearing in Apps List
- Ensure module is in the correct addons path
- Update Apps List (Apps → Update Apps List)
- Check for Python errors in Odoo logs

### Search Not Working
- Verify JavaScript console for errors (F12 in browser)
- Check that `web.assets_backend` is loading correctly
- Clear browser cache and reload

### Enrich Button Not Visible
- Ensure module is installed, not just in Apps list
- Check user has appropriate access rights
- Verify Contact/Lead views are not customized by other modules

### API Connection Issues
- Verify API key is correct in Settings
- Check API endpoint URL format
- Test API endpoint connectivity from server

### Installation Errors
```bash
# Clear Python cache
find . -name "*.pyc" -delete
find . -name "__pycache__" -delete

# Restart with update
./odoo-bin -c odoo.conf -u bizvibe_smart_ai
```

## 📄 License

This module is licensed under LGPL-3. See [LICENSE](LICENSE) file for details.

## 🤝 Support

- **Email**: support@yourdomain.com (PLACEHOLDER - Update before submission)
- **Website**: https://www.bizvibe.com
- **Documentation**: [Module Documentation](https://www.bizvibe.com/docs)
- **Issues**: Report bugs via your preferred issue tracker

## 🎯 Roadmap

- [ ] Advanced filtering and sorting options
- [ ] Export search results to CSV/Excel
- [ ] Company comparison features
- [ ] Integration with Odoo Marketing Automation
- [ ] Saved searches and alerts
- [ ] Multi-language support

## 👥 Credits

**Author**: Sandeep Reddy  
**Contributors**: Open for contributions!

---

**Made with ❤️ for the Odoo Community**
