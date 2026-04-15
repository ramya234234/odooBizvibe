{
    'name': 'BizVibe Smart AI',
    'version': '19.0.1.0.0',  # Updated version for Odoo 19
    'category': 'Sales/CRM',
    'summary': 'BizVibe Dynamics Smart Search Integration',
    'depends': ['base', 'crm'],
    'data': [
        'views/client_action_view.xml',
        'views/crm_lead_views.xml',
        'views/res_partner_views.xml',
        'views/menu_views.xml',
       # 'views/res_config_settings_view.xml',  # Added missing view
    ],
    'assets': {
        'web.assets_backend': [
            'bizvibe_smart_ai/static/src/js/smart_search.js',
            'bizvibe_smart_ai/static/src/js/mockApiService.js',
            'bizvibe_smart_ai/static/src/xml/smart_search.xml',
            'bizvibe_smart_ai/static/src/css/smart_search.css',
            'bizvibe_smart_ai/static/src/css/sidebar.css',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}