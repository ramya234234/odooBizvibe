from odoo import api, fields, models, _

class BizVibeSearchWizard(models.TransientModel):
    _name = 'bizvibe.search.wizard'
    _description = 'BizVibe Smart Search'

    query = fields.Char(string="Search Query", help="Enter a natural language query, e.g. 'Software companies in Mumbai'")
    result_ids = fields.One2many('bizvibe.search.result', 'wizard_id', string="Search Results")

    def action_search(self):
        """Mock implementation of BizVibe Search API"""
        self.ensure_one()
        # Clear previous results
        self.result_ids.unlink()

        # MOCKED DATA
        mock_companies = [
            {'name': 'TechFlow Solutions', 'industry': 'Software', 'location': 'Mumbai, India', 'description': 'Leading provider of enterprise software solutions.'},
            {'name': 'Global Logistics Inc', 'industry': 'Logistics', 'location': 'New York, USA', 'description': 'International shipping and freight forwarding.'},
            {'name': 'Green Energy Corp', 'industry': 'Renewable Energy', 'location': 'Berlin, Germany', 'description': 'Sustainable energy solutions for modern businesses.'},
            {'name': 'AgriFood Ltd', 'industry': 'Agriculture', 'location': 'Nairobi, Kenya', 'description': 'Connecting farmers with global markets.'},
            {'name': 'CyberSecure Systems', 'industry': 'Cybersecurity', 'location': 'Tel Aviv, Israel', 'description': 'Advanced threat protection and network security.'}
        ]

        # Simulate "AI" search
        results = []
        if self.query:
            for company in mock_companies:
                results.append((0, 0, {
                    'name': company['name'],
                    'industry': company['industry'],
                    'location': company['location'],
                    'description': company['description'],
                    'website': f"www.{company['name'].lower().replace(' ', '')}.com"
                }))
        
        self.write({'result_ids': results})
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'bizvibe.search.wizard',
            'view_mode': 'form',
            'res_id': self.id,
            'target': 'new',
        }

    def action_import_contacts(self):
        """Import selected results as Contacts"""
        self.ensure_one()
        input_data = self.result_ids.filtered(lambda r: r.selected)
        Partner = self.env['res.partner']
        
        created_partners = []
        for item in input_data:
            partner = Partner.create({
                'name': item.name,
                'function': item.industry,
                'city': item.location.split(',')[0].strip() if ',' in item.location else item.location,
                'website': item.website,
                'comment': f"Imported from BizVibe: {item.description}"
            })
            created_partners.append(partner.id)

        return {
            'type': 'ir.actions.act_window',
            'name': 'New Contacts',
            'res_model': 'res.partner',
            'view_mode': 'tree,form',
            'domain': [('id', 'in', created_partners)],
            'target': 'current',
        }

    def action_import_leads(self):
        """Import selected results as CRM Leads"""
        self.ensure_one()
        input_data = self.result_ids.filtered(lambda r: r.selected)
        Lead = self.env['crm.lead']
        
        created_leads = []
        for item in input_data:
            lead = Lead.create({
                'name': f"Opportunity with {item.name}",
                'partner_name': item.name,
                'contact_name': 'Unknown',
                'description': f"Sourced from BizVibe.\nQuery: {self.query}\nDescription: {item.description}",
                'website': item.website,
            })
            created_leads.append(lead.id)

        return {
            'type': 'ir.actions.act_window',
            'name': 'New Leads',
            'res_model': 'crm.lead',
            'view_mode': 'tree,form',
            'domain': [('id', 'in', created_leads)],
            'target': 'current',
        }


class BizVibeSearchResult(models.TransientModel):
    _name = 'bizvibe.search.result'
    _description = 'SearchResult'

    wizard_id = fields.Many2one('bizvibe.search.wizard', string="Wizard")
    selected = fields.Boolean(string="Select", default=True)
    name = fields.Char(string="Company Name")
    industry = fields.Char(string="Industry")
    location = fields.Char(string="Location")
    description = fields.Text(string="Description")
    website = fields.Char(string="Website")