# Screenshots Directory

This directory should contain screenshots of your BizVibe Smart AI module for the Odoo Apps Store.

## Required Screenshots

Add 3-5 high-quality screenshots showing:

1. **screenshot_1_search_interface.png** - Smart Search main interface
2. **screenshot_2_results_page.png** - Search results with AI overview
3. **screenshot_3_company_profile.png** - Detailed company profile view
4. **screenshot_4_enrichment.png** - Enrichment from Contact or Lead record
5. **screenshot_5_settings.png** - Configuration settings page

## Specifications

- **Format**: PNG or JPG
- **Resolution**: 1200x800px (or similar high quality)
- **Quality**: Clear, professional, showing real features
- **Content**: Use actual Odoo interface screenshots

## How to Capture Screenshots

1. Install the module on your Odoo instance
2. Navigate to each feature
3. Use your OS screenshot tool:
   - **Mac**: Cmd + Shift + 4
   - **Windows**: Windows + Shift + S
   - **Linux**: Use Screenshot tool or Ctrl + Print Screen
4. Crop and save to this directory

## Updating index.html

After adding screenshots, update `/static/description/index.html`:

Replace the placeholder sections with:

```html
<div class="screenshot-grid">
    <img src="screenshots/screenshot_1_search_interface.png" alt="Smart Search Interface" />
    <img src="screenshots/screenshot_2_results_page.png" alt="Search Results" />
    <img src="screenshots/screenshot_3_company_profile.png" alt="Company Profile" />
    <!-- etc -->
</div>
```

---

**PLACEHOLDER - Add your screenshots before final submission!**
