from odoo import api, fields, models

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    bizvibe_api_key = fields.Char(string="BizVibe API Key", config_parameter='bizvibe.api_key')
    bizvibe_api_endpoint = fields.Char(string="BizVibe API Endpoint", default="https://api.bizvibe.com", config_parameter='bizvibe.api_endpoint')
