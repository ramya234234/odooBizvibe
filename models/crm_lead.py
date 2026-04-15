from odoo import api, fields, models, _
from odoo.tools import html2plaintext
from markupsafe import Markup
import random
import logging
import json
import re
import traceback
import time

_logger = logging.getLogger(__name__)

class CrmLead(models.Model):
    _inherit = 'crm.lead'

    bizvibe_risk_score = fields.Float(string='BizVibe Risk Score', digits=(16, 2))
    bizvibe_last_sync = fields.Datetime(string='Last BizVibe Sync')
    bizvibe_rfp_rfi_id = fields.Char(string='RFP/RFI ID')
    bizvibe_data_type = fields.Selection([
        ('rfp', 'RFP'),
        ('rfi', 'RFI')
    ], string='BizVibe Data Type')

    def action_bizvibe_enrich_lead(self):
        """Action to enrich lead with BizVibe data from RFP/RFI ID in notes"""
        _logger.info("="*80)
        _logger.info("=== BIZVIBE: Starting action_bizvibe_enrich_lead ===")
        _logger.info(f"=== BIZVIBE: Lead IDs: {self.ids}")
        _logger.info(f"=== BIZVIBE: Lead Names: {self.mapped('name')}")
        _logger.info("="*80)
        
        self.ensure_one()
        record = self
        
        _logger.info(f"=== BIZVIBE: Processing lead ID: {record.id}, Name: {record.name} ===")
        
        try:
            # Extract RFP/RFI ID from description using regex
            rfp_rfi_id, data_type, user_id = self._extract_rfp_rfi_id_from_description(record.description)
            
            _logger.info(f"=== BIZVIBE: Extraction result - ID: {rfp_rfi_id}, Type: {data_type}, User ID: {user_id} ===")
            
            if rfp_rfi_id and data_type:
                _logger.info(f"=== BIZVIBE: Found ID {rfp_rfi_id} of type {data_type} with user_id {user_id} ===")
                
                # Call appropriate API based on type
                if data_type == 'rfp':
                    _logger.info("=== BIZVIBE: Calling RFP API ===")
                    success = self._fetch_and_update_rfp_data(record, rfp_rfi_id, user_id)
                elif data_type == 'rfi':
                    _logger.info("=== BIZVIBE: Calling RFI API ===")
                    success = self._fetch_and_update_rfi_data(record, rfp_rfi_id, user_id)
                
                _logger.info(f"=== BIZVIBE: API call success status: {success} ===")
                
                if success:
                    record.bizvibe_rfp_rfi_id = rfp_rfi_id
                    record.bizvibe_data_type = data_type
                    record.bizvibe_last_sync = fields.Datetime.now()
                    
                    record.message_post(
                        body=f"Successfully updated with {data_type.upper()} data (ID: {rfp_rfi_id})",
                        message_type='comment'
                    )
                    
                    _logger.info("=== BIZVIBE: Lead successfully updated with API data ===")
                    
                    # Return action to reload the form view with success message
                    return {
                        'type': 'ir.actions.act_window',
                        'res_model': 'crm.lead',
                        'res_id': record.id,
                        'views': [(False, 'form')],
                        'target': 'current',
                        'context': {
                            'notification': {
                                'type': 'success',
                                'message': f'Lead updated with {data_type.upper()} data successfully!',
                                'sticky': False,
                            }
                        }
                    }
                else:
                    _logger.warning("=== BIZVIBE: API call failed, falling back to mock data ===")
                    self._handle_mock_data(record)
                    
                    # Return action to reload the form view with warning message
                    return {
                        'type': 'ir.actions.act_window',
                        'res_model': 'crm.lead',
                        'res_id': record.id,
                        'views': [(False, 'form')],
                        'target': 'current',
                        'context': {
                            'notification': {
                                'type': 'warning',
                                'message': 'API call failed. Used mock data instead.',
                                'sticky': False,
                            }
                        }
                    }
            else:
                _logger.info(f"=== BIZVIBE: No valid RFP/RFI ID found. Using mock data ===")
                self._handle_mock_data(record)
                
                # Return action to reload the form view with info message
                return {
                    'type': 'ir.actions.act_window',
                    'res_model': 'crm.lead',
                    'res_id': record.id,
                    'views': [(False, 'form')],
                    'target': 'current',
                    'context': {
                        'notification': {
                            'type': 'info',
                            'message': 'No RFP/RFI ID found. Used mock data.',
                            'sticky': False,
                        }
                    }
                }
                
        except Exception as e:
            _logger.error(f"=== BIZVIBE: Error processing lead {record.id}: {str(e)}")
            _logger.error(traceback.format_exc())
            
            # Return action to reload the form view with error message
            return {
                'type': 'ir.actions.act_window',
                'res_model': 'crm.lead',
                'res_id': record.id,
                'views': [(False, 'form')],
                'target': 'current',
                'context': {
                    'notification': {
                        'type': 'danger',
                        'message': f'Error: {str(e)[:100]}',
                        'sticky': False,
                    }
                }
            }

    def _handle_mock_data(self, record):
        """Fallback to mock data when API fails or no ID found"""
        _logger.info("=== BIZVIBE: Using mock data ===")
        lead_name = record.name or "New Lead"
        
        # Simulated data
        mock_data = {
            'score': random.randint(50, 99),
            'probability': random.randint(10, 80),
            'notes': f"<br/><br/><strong>BizVibe Insight:</strong> High intent signal detected for {lead_name}."
        }

        vals = {}
        if not record.description:
            vals['description'] = mock_data['notes']
        else:
            # Check if we already added BizVibe insight to avoid duplicates
            if "BizVibe Insight:" not in record.description:
                vals['description'] = record.description + mock_data['notes']
        
        # Update probability if lower than AI prediction
        if record.probability < mock_data['probability']:
            vals['probability'] = mock_data['probability']
        
        if vals:
            record.write(vals)
            _logger.info(f"=== BIZVIBE: Mock data written to lead: {vals} ===")

    def _extract_rfp_rfi_id_from_description(self, description):
        """Extract RFP or RFI ID and user ID from HTML description using regex"""
        _logger.info("=== BIZVIBE: Extracting ID from description ===")
        
        if not description:
            _logger.info("=== BIZVIBE: Description is empty ===")
            return None, None, None

        # Log first 500 chars of description for debugging
        _logger.info(f"=== BIZVIBE: Raw description (first 500 chars): {description[:500]} ===")

        # Convert HTML to plain text
        description_text = html2plaintext(description)
        _logger.info(f"=== BIZVIBE: Plain text description: {description_text[:500]} ===")

        # More flexible patterns to match RFP ID and RFI ID with various formatting
        rfp_patterns = [
            r'RFP ID:\s*(\d+)',           # Standard format
            r'\*RFP ID:\*\s*(\d+)',       # Markdown bold format
            r'RFP ID[:\*]?\s*(\d+)',      # Flexible with optional colon/asterisk
            r'RFP\s+ID[:\*]?\s*(\d+)',    # With space between RFP and ID
        ]
        
        rfi_patterns = [
            r'RFI ID:\s*(\d+)',           # Standard format
            r'\*RFI ID:\*\s*(\d+)',       # Markdown bold format
            r'RFI ID[:\*]?\s*(\d+)',      # Flexible with optional colon/asterisk
            r'RFI\s+ID[:\*]?\s*(\d+)',    # With space between RFI and ID
        ]
        
        # Default user ID from your example
        user_id = 30
        
        # Try to extract user ID from description if present
        user_id_patterns = [
            r'User ID:\s*(\d+)',
            r'user_id:\s*(\d+)',
            r'userId:\s*(\d+)',
        ]
        
        for pattern in user_id_patterns:
            user_match = re.search(pattern, description_text, re.IGNORECASE)
            if user_match:
                user_id = user_match.group(1)
                _logger.info(f"=== BIZVIBE: Found User ID: {user_id} ===")
                break
        
        # Check for RFP ID using multiple patterns
        for pattern in rfp_patterns:
            rfp_match = re.search(pattern, description_text, re.IGNORECASE)
            if rfp_match:
                rfp_id = rfp_match.group(1)
                _logger.info(f"=== BIZVIBE: Found RFP ID: {rfp_id} using pattern: {pattern} ===")
                return rfp_id, 'rfp', user_id
        
        # Check for RFI ID using multiple patterns
        for pattern in rfi_patterns:
            rfi_match = re.search(pattern, description_text, re.IGNORECASE)
            if rfi_match:
                rfi_id = rfi_match.group(1)
                _logger.info(f"=== BIZVIBE: Found RFI ID: {rfi_id} using pattern: {pattern} ===")
                return rfi_id, 'rfi', user_id
        
        _logger.info("=== BIZVIBE: No RFP or RFI ID found in description ===")
        return None, None, None

    def _fetch_and_update_rfp_data(self, lead, rfp_id, user_id):
        """Fetch RFP data from API and update lead"""
        _logger.info(f"=== BIZVIBE: Entering _fetch_and_update_rfp_data for RFP ID: {rfp_id}, User ID: {user_id} ===")
        
        try:
            import urllib.request
            import urllib.parse
            import json
            
            base_url = "https://demobizvibe-prelive.portal.infinian.team"
            # Use time.time() for Windows compatibility
            timestamp = str(int(time.time() * 1000))  # milliseconds timestamp
            url = f"{base_url}/api/buyer/services/get_rfp_details/{rfp_id}/{user_id}?rd={timestamp}"
            
            _logger.info(f"=== BIZVIBE: RFP URL being called: {url} ===")
            
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            )
            
            _logger.info("=== BIZVIBE: Making RFP API request ===")
            try:
                with urllib.request.urlopen(req, timeout=30) as response:
                    response_status = response.getcode()
                    _logger.info(f"=== BIZVIBE: RFP API Response Status Code: {response_status} ===")
                    
                    response_data = response.read().decode('utf-8')
                    _logger.info(f"=== BIZVIBE: RFP Raw Response (first 500 chars): {response_data[:500]} ===")
                    
                    data = json.loads(response_data)
                    
                    if data.get('status') == 1 and data.get('data'):
                        _logger.info("=== BIZVIBE: RFP API success - status=1 and data present ===")
                        return self._update_lead_with_rfp_data(lead, data['data'])
                    else:
                        _logger.warning(f"=== BIZVIBE: RFP API returned non-success status. Response: {data} ===")
                        return False
                        
            except urllib.error.HTTPError as e:
                _logger.error(f"=== BIZVIBE: RFP API HTTP Error: {e.code} - {e.reason} ===")
                try:
                    error_data = e.read().decode('utf-8')
                    _logger.error(f"=== BIZVIBE: RFP API Error Response Body: {error_data} ===")
                except:
                    _logger.error("=== BIZVIBE: Could not read error response body ===")
                return False
                
            except urllib.error.URLError as e:
                _logger.error(f"=== BIZVIBE: RFP API URL Error: {e.reason} ===")
                return False
                
        except Exception as e:
            _logger.error(f"=== BIZVIBE: RFP API Unexpected Error: {str(e)}", exc_info=True)
            return False

    def _fetch_and_update_rfi_data(self, lead, rfi_id, user_id):
        """Fetch RFI data from API and update lead"""
        _logger.info(f"=== BIZVIBE: Entering _fetch_and_update_rfi_data for RFI ID: {rfi_id}, User ID: {user_id} ===")
        
        try:
            import urllib.request
            import urllib.parse
            import json
            
            base_url = "https://demobizvibe-prelive.portal.infinian.team"
            # Use time.time() for Windows compatibility
            timestamp = str(int(time.time() * 1000))  # milliseconds timestamp
            url = f"{base_url}/api/buyer/services/get_rfi_details/{rfi_id}/{user_id}?rd={timestamp}"
            
            _logger.info(f"=== BIZVIBE: RFI URL being called: {url} ===")
            
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            )
            
            _logger.info("=== BIZVIBE: Making RFI API request ===")
            try:
                with urllib.request.urlopen(req, timeout=30) as response:
                    response_status = response.getcode()
                    _logger.info(f"=== BIZVIBE: RFI API Response Status Code: {response_status} ===")
                    
                    response_data = response.read().decode('utf-8')
                    _logger.info(f"=== BIZVIBE: RFI Raw Response (first 500 chars): {response_data[:500]} ===")
                    
                    data = json.loads(response_data)
                    
                    if data.get('status') == 1 and data.get('data'):
                        _logger.info("=== BIZVIBE: RFI API success - status=1 and data present ===")
                        return self._update_lead_with_rfi_data(lead, data['data'])
                    else:
                        _logger.warning(f"=== BIZVIBE: RFI API returned non-success status. Response: {data} ===")
                        return False
                        
            except urllib.error.HTTPError as e:
                _logger.error(f"=== BIZVIBE: RFI API HTTP Error: {e.code} - {e.reason} ===")
                try:
                    error_data = e.read().decode('utf-8')
                    _logger.error(f"=== BIZVIBE: RFI API Error Response Body: {error_data} ===")
                except:
                    _logger.error("=== BIZVIBE: Could not read error response body ===")
                return False
                
            except urllib.error.URLError as e:
                _logger.error(f"=== BIZVIBE: RFI API URL Error: {e.reason} ===")
                return False
                
        except Exception as e:
            _logger.error(f"=== BIZVIBE: RFI API Unexpected Error: {str(e)}", exc_info=True)
            return False

    # ==================== OPTION 2: PRE-FORMATTED TEXT (Recommended) ====================
    def _update_lead_with_rfp_data(self, lead, rfp_data):
        """Update lead with RFP data using PRE tag"""
        _logger.info("=== BIZVIBE: Updating lead with RFP data (PRE tag format) ===")
        try:
            # Format suppliers list
            suppliers_list = ""
            if rfp_data.get('suppliers'):
                supplier_items = []
                for supplier in rfp_data['suppliers']:
                    supplier_text = supplier.get('name', '')
                    if supplier.get('email'):
                        supplier_text += f" ({supplier.get('email')})"
                    supplier_items.append(supplier_text)
                suppliers_list = "\n".join(supplier_items)

            # Format milestones list
            milestones_list = ""
            if rfp_data.get('milestone') and rfp_data['milestone'].get('milestones'):
                milestone_items = []
                for milestone in rfp_data['milestone']['milestones']:
                    milestone_items.append(
                        f"{milestone.get('ms_title','')} : {milestone.get('ms_date','')}"
                    )
                milestones_list = "\n".join(milestone_items)

            # Format documents list
            documents_list = ""
            if rfp_data.get('rfp_documents'):
                doc_items = []
                for doc in rfp_data['rfp_documents']:
                    doc_text = doc.get('originalName', 'Document')
                    if doc.get('size'):
                        doc_text += f" (Size: {doc.get('size')} bytes)"
                    doc_items.append(doc_text)
                documents_list = "\n".join(doc_items)

            # Format questionnaire if present
            questionnaire_list = ""
            if rfp_data.get('rfp_questionnaire'):
                q_items = []
                for q in rfp_data['rfp_questionnaire']:
                    if isinstance(q, dict):
                        q_items.append(f"• {q.get('question','')}")
                    else:
                        q_items.append(f"• {q}")
                questionnaire_list = "\n".join(q_items)

            status_map = {
                'C': 'Completed',
                'A': 'Active',
                'P': 'Pending',
                'D': 'Draft',
                'I': 'In Progress'
            }
            status_code = rfp_data.get('status','')
            status_desc = status_map.get(status_code, status_code)

            # Build PRE-formatted text - preserves all line breaks
            note_text = f"""
<pre style="font-family: inherit; white-space: pre-wrap; word-wrap: break-word; margin: 0; padding: 0; background: transparent; border: none;">
RFP Details (Updated from API)

RFP ID: {rfp_data.get('rfp_id','N/A')}
Status: {status_desc} ({status_code})
Title: {rfp_data.get('rfp_title','N/A')}
Category: {rfp_data.get('category_name','N/A')}
Start Date: {rfp_data.get('start_date','N/A')}
End Date: {rfp_data.get('end_date','N/A')}
Publish Type: {rfp_data.get('publish_type','N/A')}
User ID: {rfp_data.get('user_id','N/A')}

Suppliers
{suppliers_list or 'No suppliers listed'}

Milestones
{milestones_list or 'No milestones listed'}

Documents
{documents_list or 'No documents attached'}
</pre>
"""

            if questionnaire_list:
                note_text += f"""
<pre style="font-family: inherit; white-space: pre-wrap; word-wrap: break-word; margin: 0; padding: 0; background: transparent; border: none;">
Questionnaire
{questionnaire_list}
</pre>
"""

            # Use Markup to ensure proper rendering
            vals = {
                'description': (lead.description or '') + Markup("<br/><br/>") + Markup(note_text)
            }

            if rfp_data.get('suppliers'):
                vals['probability'] = min((lead.probability or 0) + 20, 100)

            lead.write(vals)
            return True

        except Exception as e:
            _logger.error(f"Error updating lead with RFP data: {str(e)}", exc_info=True)
            return False

    def _update_lead_with_rfi_data(self, lead, rfi_data):
        """Update lead with RFI data using PRE tag"""
        _logger.info("=== BIZVIBE: Updating lead with RFI data (PRE tag format) ===")
        try:
            # Format suppliers list
            suppliers_list = ""
            if rfi_data.get('suppliers'):
                supplier_items = []
                for supplier in rfi_data['suppliers']:
                    supplier_text = supplier.get('name','')
                    if supplier.get('email'):
                        supplier_text += f" ({supplier.get('email')})"
                    supplier_items.append(supplier_text)
                suppliers_list = "\n".join(supplier_items)

            # Format milestones list
            milestones_list = ""
            if rfi_data.get('milestone') and rfi_data['milestone'].get('milestones'):
                milestone_items = []
                for milestone in rfi_data['milestone']['milestones']:
                    milestone_items.append(
                        f"{milestone.get('ms_title','')} : {milestone.get('ms_date','')}"
                    )
                milestones_list = "\n".join(milestone_items)

            # Format documents if present
            documents_list = ""
            if rfi_data.get('rfi_documents'):
                doc_items = []
                for doc in rfi_data['rfi_documents']:
                    doc_text = doc.get('originalName','Document')
                    if doc.get('size'):
                        doc_text += f" (Size: {doc.get('size')} bytes)"
                    doc_items.append(doc_text)
                documents_list = "\n".join(doc_items)

            # Format questionnaire sections
            sections_list = ""
            if rfi_data.get('rfi_questionnaire'):
                for section in rfi_data['rfi_questionnaire']:
                    sections_list += f"""

{section.get('section_title','')}
{section.get('section_description','')}
"""
                    if section.get('questions'):
                        for q in section['questions']:
                            sections_list += f"• {q.get('question','')}\n"

            status_map = {
                'C': 'Completed',
                'A': 'Active',
                'P': 'Pending',
                'D': 'Draft',
                'I': 'In Progress'
            }
            status_code = rfi_data.get('status','')
            status_desc = status_map.get(status_code, status_code)

            # Build PRE-formatted text - preserves all line breaks
            note_text = f"""
<pre style="font-family: inherit; white-space: pre-wrap; word-wrap: break-word; margin: 0; padding: 0; background: transparent; border: none;">
RFI Details (Updated from API)

RFI ID: {rfi_data.get('rfi_id','N/A')}
Status: {status_desc} ({status_code})
Title: {rfi_data.get('rfi_title','N/A')}
Category: {rfi_data.get('category_name','N/A')}
Start Date: {rfi_data.get('start_date','N/A')}
End Date: {rfi_data.get('end_date','N/A')}
Publish Type: {rfi_data.get('publish_type','N/A')}
User ID: {rfi_data.get('user_id','N/A')}

Suppliers
{suppliers_list or 'No suppliers listed'}

Milestones
{milestones_list or 'No milestones listed'}

Questionnaire
{sections_list or 'No questionnaire'}

Documents
{documents_list or 'No documents attached'}
</pre>
"""

            # Use Markup to ensure proper rendering
            vals = {
                'description': (lead.description or '') + Markup("<br/><br/>") + Markup(note_text)
            }

            if rfi_data.get('suppliers'):
                vals['probability'] = min((lead.probability or 0) + 15, 100)

            lead.write(vals)
            return True

        except Exception as e:
            _logger.error(f"Error updating lead with RFI data: {str(e)}", exc_info=True)
            return False