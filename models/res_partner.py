from odoo import api, fields, models, _
import random

class ResPartner(models.Model):
    _inherit = 'res.partner'

    def action_bizvibe_enrich(self):
        """Mock Enrichment Logic"""
        for record in self:
            # Mock API response based on name
            company_name = record.name or "Unknown Company"
            
            # Simulated data
            mock_data = {
                'industry': random.choice(['Technology', 'Manufacturing', 'Retail', 'Logistics']),
                'employees': random.choice(['10-50', '50-200', '200-500', '500+']),
                'revenue': random.choice(['$1M-$5M', '$5M-$20M', '$20M+']),
                'description': f"{company_name} is a leading player in its sector with a strong market presence."
            }
            
            # Update fields if not set
            vals = {}
            if not record.function:
                vals['function'] = mock_data['industry']
            if not record.comment:
                vals['comment'] = f"Enriched by BizVibe:\nEmployees: {mock_data['employees']}\nRevenue: {mock_data['revenue']}\n{mock_data['description']}"
            
            if vals:
                record.write(vals)
        
        return {
            'type': 'ir.actions.client',
            'tag': 'bizvibe_smart_search',
            'target': 'current',
            'name': 'BizVibe Intelligence',
            'params': {
                'default_search_query': self.name,
            }
        }