/** @odoo-module **/

import { Component, useState, onWillStart, markup } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { searchCompanies, getCompanyProfile } from "./mockApiService";

export class BizVibeSmartSearch extends Component {
    static template = "bizvibe_smart_ai_smart_search";

    setup() {

        
        this.orm = useService("orm");
        this.action = useService("action");
        this.notification = useService("notification");

        this.state = useState({

            //location toggle
            showAllLocations: false,
            locationLimit: 4,

            aiSummaryShortHtml: "",

            //aioverview show more/less
            showAllCompanies: false,
            companyLimit: 5,

            //active tab
            activeTab: "smartsearch",


            // Login state
            isLoggedIn: false,
            showLogin: true,
            showResults: false,
            
            // Login form fields
            email: "",
            emailError: "",
            spinner: false,
            
            // User data
            userId: "",
            apiKey: "",
            
            // Search state
            searchQuery: "",
            currentView: "search",  // "search", "results", or "profile"
            hasResults: false,
            aiSummary: "",
            aiOverviewExpanded: false,
            results: [],
            selectedCompany: null,
            companyProfile: null,
            isLoading: false,
            profileActiveTab: "overview",
            totalRecord: 0,
            rankedCompanyList: [],
            popularSearches: [
                "I need a specialized cold chain logistics provider for medical vaccines in Africa.",
                "Find me a supplier of laboratory equipment for biochemical research.",
                "I want a vendor that offers RFID tracking solutions for inventory management."
            ],
            
            // API URLs (Update these with your actual domains)
            sellerDomainUrl: "https://integration.bizvibe.com",
            domainUrl: "https://integration.bizvibe.com"
        });

        onWillStart(async () => {
            // Check login status on startup
            this._checkLoginStatus();
            
            const params = this.props.action?.params;
            if (params?.default_search_query && this.state.isLoggedIn) {
                this.state.searchQuery = params.default_search_query;
                setTimeout(() => this._onSearch(), 100);
            }
        });
        //event lisner
        window.addEventListener("message", (event) => {

            if (!event.data) return;
            if (event.data.type === "CREATE_LEAD") {
                this._createLeadFromIframeRFP(event.data.payload);
            }
             if (event.data.type === "CREATE_RFI_LEAD") {
                this._createLeadFromIframeRFI(event.data.payload);
            }
        });
    }

    _companyTypeView(profile){
        console.log(profile);
        
    }

   async _createLeadFromIframeRFP(data) {

    try {

        const supplier = data.suppliers?.[0] || {};

        // Format suppliers list
        const suppliersList = (data.suppliers || [])
            .map(s => `${s.name} (${s.email})`)
            .join("<br>");

        // Format milestones list
        const milestonesList = (data.milestones || [])
            .map(m => `${m.title} : ${m.date}`)
            .join("<br>");

        // Build formatted description
        const noteHtml = `
            <strong>RFP Details</strong><br><br>

            <strong>RFP ID:</strong> ${data.rfp_id}<br>
            <strong>Category:</strong> ${data.company_name}<br>
            <strong>Start Date:</strong> ${data.start_date}<br>
            <strong>End Date:</strong> ${data.end_date}<br><br>

            <strong>Suppliers</strong><br>
            ${suppliersList}<br><br>

            <strong>Milestones</strong><br>
            ${milestonesList}
        `;

        await this.orm.create("crm.lead", [{
            name: data.rfp_title || `Opportunity with ${data.company_name}`,
            partner_name: data.company_name,
            contact_name: supplier.name || "",
            email_from: supplier.email || "",
            description: noteHtml,
            probability: 20
        }]);

        this.notification.add("Lead created from RFP dashboard!", { type: "success" });

    } catch (error) {

        console.error("Lead creation error:", error);

        this.notification.add("Failed to create lead.", { type: "danger" });

    }

}

 async _createLeadFromIframeRFI(data) {

    try {

        const supplier = data.suppliers?.[0] || {};

        // Suppliers
        const suppliersList = (data.suppliers || [])
            .map(s => `${s.name} (${s.email})`)
            .join("<br>");

        // Milestones
        const milestonesList = (data.milestone?.milestones || [])
            .map(m => `${m.ms_title} : ${m.ms_date}`)
            .join("<br>");

        // Questionnaire Sections + Questions
        const sectionsList = (data.rfi_questionnaire || [])
            .map(section => {

                const questions = (section.questions || [])
                    .map(q => `• ${q.question}`)
                    .join("<br>");

                return `
<strong>${section.section_title}</strong><br>
${section.section_description || ""}<br>
${questions || "No questions"}<br><br>
`;

            }).join("");

        const noteHtml = `
<strong>RFI Details</strong><br><br>

<strong>RFI ID:</strong> ${data.rfi_id}<br>
<strong>Category:</strong> ${data.category_name}<br>
<strong>Start Date:</strong> ${data.start_date}<br>
<strong>End Date:</strong> ${data.end_date}<br><br>

<strong>Suppliers</strong><br>
${suppliersList}<br><br>

<strong>Milestones</strong><br>
${milestonesList}<br><br>

<strong>Questionnaire</strong><br><br>
${sectionsList}
`;

        await this.orm.create("crm.lead", [{
            name: data.rfi_title || `Opportunity with ${data.category_name}`,
            partner_name: data.category_name,
            contact_name: supplier.name || "",
            email_from: supplier.email || "",
            description: noteHtml,
            probability: 20
        }]);

        this.notification.add("Lead created from RFI dashboard!", { type: "success" });

    } catch (error) {

        console.error("Lead creation error:", error);

        this.notification.add("Failed to create lead.", { type: "danger" });

    }

}
   


    //location filter function 
    getVisibleLocations() {

        const locations = this.state.companyProfile?.basics?.additional_locations || [];

        return this.state.showAllLocations
            ? locations
            : locations.slice(0, this.state.locationLimit);
    }

    toggleLocations() {
        this.state.showAllLocations = !this.state.showAllLocations;
    }

    //aioverview show more/less
    getVisibleCompanies() {
        if (!this.state.rankedCompanyList) return [];

        return this.state.showAllCompanies
            ? this.state.rankedCompanyList
            : this.state.rankedCompanyList.slice(0, this.state.companyLimit);
    }
    //toggle for show more/less
    toggleCompanies() {
        this.state.showAllCompanies = !this.state.showAllCompanies;
    }

    //============switch function =======

    switchTab(tab) {
        this.state.activeTab = tab;
    }

    

    // ========== LOGIN METHODS ==========

    _checkLoginStatus() {
        const storedEmail = localStorage.getItem("email");
        const storedUserId = localStorage.getItem("userId");
        const storedAPIKey = localStorage.getItem("APIKey");
        
        if (storedEmail && storedUserId && storedAPIKey) {
            // Decode stored values
            try {
                this.state.email = atob(storedEmail);
                this.state.userId = atob(storedUserId);
                this.state.apiKey = storedAPIKey;
                this.state.isLoggedIn = true;
                this.state.showLogin = false;
                this.state.showResults = true;
            } catch (e) {
                console.error("Error decoding stored data:", e);
                this._clearLoginData();
            }
        }
    }

    _clearLoginData() {
        localStorage.removeItem("email");
        localStorage.removeItem("userId");
        localStorage.removeItem("APIKey");
        this.state.isLoggedIn = false;
        this.state.showLogin = true;
        this.state.showResults = false;
    }

    _handleLogout() {
        this._clearLoginData();
        // Reset state
        this.state.email = "";
        this.state.emailError = "";
        this.state.userId = "";
        this.state.apiKey = "";
        this.state.searchQuery = "";
        this.state.currentView = "search";
        this.state.hasResults = false;
        this.state.results = [];
        this.state.companyProfile = null;
        
        this.notification.add("Logged out successfully", { type: "info" });
    }

    formatEmailAndClearError() {
        // Convert to lowercase and remove whitespaces
        this.state.email = this.state.email.toLowerCase().replace(/\s/g, '');
        this.state.emailError = '';
    }

    validateEmail() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(this.state.email);
    }

    async submitForm() {
        if (this.validateEmail()) {
            console.log("Form submitted with email:", this.state.email);
            await this._showFormDetails();
        } else {
            this.state.emailError = 'Please enter a valid email address.';
        }
    }

    async _showFormDetails() {
        this.state.spinner = true;
        
        let emailVal = this.state.email;
        let fname = emailVal.substring(0, emailVal.indexOf("@"));
        
        if (emailVal.trim() === '') {
            this.state.spinner = false;
            return;
        }
        
        let randomTimestamp = new Date().getTime();
        let encryptemail = btoa(emailVal);
        localStorage.setItem("email", encryptemail);

        // Open authentication window
        const redirect_url = this.state.domainUrl + "/Bizvibe_MSword/src/taskpane/success.html?email=" + encryptemail + "&ts=" + randomTimestamp;
        window.open(this.state.sellerDomainUrl + '/clientsso/sign-in/integration/authenticate.php?login_hint=' + emailVal + '&ppid=0055e000006QM2HAAW&fname=' + fname + '&lname=&account=S&plan=&ptype=&cname=&cwebsite=&country=&organization_reference_id=&source_type=intergration', '_blank');
        
        // Start polling for authentication
        await this._makeApiCall(emailVal, randomTimestamp);
    }

    async _makeApiCall(emailVal, timestamp) {
        let response = null;
        let encodedEmail = btoa(emailVal.trim());

        const requestOptions = {
            method: 'POST',
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: JSON.stringify({
                "user_email": encodedEmail
            }),
            redirect: 'follow'
        };

        // Poll for authentication
        while (response === null || response.status === 0) {
            try {
                const apiResponse = await fetch(this.state.sellerDomainUrl + "/api/integration/services/getAuthCode", requestOptions);
                response = await apiResponse.json();
                
                if (response.status == 1) {
                    this.state.userId = response.data.user_id;
                    await this._getAPIToken(response.data);
                    break;
                }
            } catch (error) {
                console.error(error);
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    async _getAPIToken(responseData) {
        const requestOptions = {
            method: 'GET',
            redirect: 'follow'
        };

        try {
            let result = await fetch(this.state.sellerDomainUrl + "/api/integration/services/apitoken/" + responseData.auth_code, requestOptions);
            result = await result.json();
            this.state.apiKey = result.api_token;
            
            // Store user info in localStorage
            const userInfo = {
                email: btoa(this.state.email),
                userId: btoa(this.state.userId),
                APIKey: this.state.apiKey
            };

            localStorage.setItem("email", userInfo.email);
            localStorage.setItem("userId", userInfo.userId);
            localStorage.setItem("APIKey", userInfo.APIKey);
            
            // Update login state
            this.state.isLoggedIn = true;
            this.state.showLogin = false;
            this.state.showResults = true;
            this.state.spinner = false;
            
            this.notification.add("Successfully logged in!", { type: "success" });
            
        } catch (error) {
            console.error("Error getting API token:", error);
            this.notification.add("Login failed. Please try again.", { type: "danger" });
            this.state.spinner = false;
        }
    }

    // ========== EXISTING SEARCH METHODS ==========

    _onSearchKeydown(ev) {
        if (ev.key === "Enter") {
            this._onSearch();
        }
    }

    async _onSearch() {
        if (!this.state.searchQuery) return;

        this.state.isLoading = true;
        this.state.currentView = "results";
        this._autoScrollToTop();

        try {
            this.notification.add("Connecting to BizVibe Intelligence...", { type: "info" });

            const searchResult = await searchCompanies(this.state.searchQuery, this.state.apiKey, this.state.userId);

            this.notification.add("Analyzing company profiles...", { type: "info" });

            if (searchResult.status === 1 && searchResult.data?.companies) {
                this.state.results = searchResult.data.companies.map((company, index) => ({
                    id: index + 1,
                    organization_reference_id: company.organization_reference_id,
                    name: company.name || company.organization_name,
                    type: company.type || company.company_type || "Private",
                    employees: company.employees || company.employee_range || "N/A",
                    revenue: company.revenue || company.revenue_range || "N/A",
                    location: company.location || `${company.city || ""}, ${company.country || "India"}`,
                    city: company.city || "",
                    country: company.country || "India",
                    website: company.website || company.organization_website || "",
                    description: company.description || company.overview || "No description available",
                    domain: company.domain || "",
                    rank: company.rank || index + 1,
                    ranked_list_text: searchResult.data.ranked_company_list?.[index] || "",
                    score: company.score || { risk_score: 0 }
                }));

                this.state.hasResults = true;
                this.state.totalRecord = searchResult.data.total_record || this.state.results.length;
                this.state.rankedCompanyList = searchResult.data.ranked_company_list || [];
                
                if (searchResult.data.ai_response) {
                    this.state.aiSummary = this._formatAISummary(
                        searchResult.data.ai_response,
                        searchResult.data.followup_question,
                        searchResult.data.suggestions_section,
                        searchResult.data.ai_sources,
                        searchResult.data.ranked_company_list
                    );
                } else {
                    this.state.aiSummary = this._generateAISummary(this.state.searchQuery, this.state.results);
                }
                
               // full summary
                this.state.aiSummaryHtml = markup(
                    this._renderMarkdown(this.state.aiSummary)
                );

                // create short summary (first half)
                const words = this.state.aiSummary.split(" ");
                const shortSummary = words.slice(0, 100).join(" ") + "...";

                this.state.aiSummaryShortHtml = markup(
                    this._renderMarkdown(shortSummary)
                );

                
                this.notification.add(`Found ${this.state.results.length} companies!`, { type: "success" });
                this._autoScrollToTop();
            } else {
                this.notification.add("No companies found. Try a different search.", { type: "warning" });
                this.state.hasResults = false;
            }
        } catch (error) {
            console.error("Search error:", error);
            this.notification.add("Search failed. Please try again.", { type: "danger" });
            this.state.hasResults = false;
        } finally {
            this.state.isLoading = false;
        }
    }

    _formatAISummary(aiResponse, followupQuestion, suggestionsSection, aiSources, rankedCompanyList) {

        let summary = "";

        if (aiResponse) {
            summary += aiResponse + "\n\n";
        }

        if (rankedCompanyList?.length > 0) {
            summary += "**Top Companies:**\n\n";

            rankedCompanyList.forEach((company) => {

                let companyText = company.replace(/\[|\]\([^)]*\)/g, '');

                summary += `• ${companyText}\n`;

            });

            summary += "\n";
        }

        return summary;
    }

    

    _generateAISummary(query, results) {
        if (!results?.length) {
            return "No companies found matching your search criteria.";
        }

        const topCompanies = results.slice(0, 5);
        let summary = `I have compiled a list of **${results.length} companies** matching "${query}", based on publicly available information. These companies are ranked based on their relevance and market presence.\n\n`;

        topCompanies.forEach(company => {
            summary += `**${company.name}**: ${company.description} ${company.website}\n\n`;
        });

        return summary;
    }

    _setQuery(query) {
        this.state.searchQuery = query;
        this._onSearch();
    }

    async _viewCompanyProfile(company) {
        this.state.isLoading = true;
        this.state.selectedCompany = company;
        this._autoScrollToTop();

        try {
            this.notification.add(`Loading profile for ${company.name}...`, { type: "info" });

            const profileData = await getCompanyProfile(company.organization_reference_id, this.state.apiKey, this.state.userId);
            console.log("profileData Fetch Result!!!!!!!");
            console.log(profileData);
            
            
            if (profileData.status === 1 && profileData.data) {
                this.state.companyProfile = profileData.data;
                
                if (!this.state.companyProfile.risk_score && company.score) {
                    this.state.companyProfile.risk_score = company.score.risk_score || 0;
                }
                
                this.state.currentView = "profile";
                this.state.profileActiveTab = "overview";
                this._initRiskScore(this.state.companyProfile.risk_score);
                this.notification.add("Profile loaded successfully!", { type: "success" });
                this._autoScrollToTop();
            } else {
                this.notification.add("Could not load company profile. Using sample data.", { type: "warning" });
                this.state.currentView = "profile";
                this._autoScrollToTop();
            }
        } catch (error) {
            console.error("Profile load error:", error);
            this.notification.add("Failed to load profile. Please try again.", { type: "danger" });
        } finally {
            this.state.isLoading = false;
        }
    }

    _getScrollPosition() {
        const container = document.querySelector('.bizvibe_results, .bizvibe_profile_new');
        return container ? container.scrollTop : 0;
    }

    _scrollToTop() {
        const container = document.querySelector('.bizvibe_results, .bizvibe_profile_new');
        if (container) {
            container.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }

    _autoScrollToTop() {
        setTimeout(() => this._scrollToTop(), 100);
    }

    _backToResults() {
        this.state.currentView = "results";
        this.state.selectedCompany = null;
        this.state.companyProfile = null;
        this._autoScrollToTop();
    }

    _openGoogleMaps(locationData) {
        if (!locationData) return;
        
        if (locationData.latitude && locationData.longitude) {
            const mapsUrl = `https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`;
            window.open(mapsUrl, '_blank');
            this.notification.add("Opening location in Google Maps...", { type: "info" });
            return;
        }
        
        let addressParts = [];
        if (locationData.address1) addressParts.push(locationData.address1);
        if (locationData.address2) addressParts.push(locationData.address2);
        if (locationData.city) addressParts.push(locationData.city);
        if (locationData.state) addressParts.push(locationData.state);
        if (locationData.pincode) addressParts.push(locationData.pincode);
        if (locationData.country) addressParts.push(locationData.country);
        
        if (addressParts.length > 0) {
            const addressString = addressParts.join(', ');
            const encodedAddress = encodeURIComponent(addressString);
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
            window.open(mapsUrl, '_blank');
            this.notification.add("Opening location in Google Maps...", { type: "info" });
        } else {
            this.notification.add("No location data available", { type: "warning" });
        }
    }

    async _importCompany(company, type) {
        try {
            if (type === 'contact') {
                await this.orm.create("res.partner", [{
                    name: company.name,
                    function: company.type,
                    comment: `Imported from BizVibe search. Revenue: ${company.revenue}`,
                    city: company.city,
                    country_id: company.country ? await this._getCountryId(company.country) : false,
                    website: company.website
                }]);
                this.notification.add(`${company.name} added to Contacts!`, { type: "success" });
            } else if (type === 'lead') {
                await this.orm.create("crm.lead", [{
                    name: `Opportunity with ${company.name}`,
                    partner_name: company.name,
                    description: `BizVibe Insight: ${company.description}`,
                    probability: 20,
                    website: company.website
                }]);
                this.notification.add(`Lead created for ${company.name}!`, { type: "success" });
            }
        } catch (error) {
            console.error("Import error:", error);
            this.notification.add("Failed to import. Please try again.", { type: "danger" });
        }
    }

    async _getCountryId(countryName) {
        if (!countryName) return false;
        
        try {
            const countries = await this.orm.searchRead(
                "res.country",
                [["name", "ilike", countryName]],
                ["id"],
                { limit: 1 }
            );
            
            return countries.length ? countries[0].id : false;
        } catch (error) {
            console.error("Error getting country ID:", error);
            return false;
        }
    }

    _setProfileTab(tab) {
        this.state.profileActiveTab = tab;
    }

    _getProfileScore(profile) {
        if (!profile) return 0;
        
        if (profile.risk_score !== undefined && profile.risk_score !== null) {
            return this._convertRiskScoreToPercentage(profile.risk_score);
        }
        
        if (profile.profile_completeness) {
            return parseInt(profile.profile_completeness) || 0;
        }
        
        return 0;
    }

    _convertRiskScoreToPercentage(riskScore) {
        const score = parseFloat(riskScore);
        if (isNaN(score)) return 0;
        
        if (score <= 2.0) {
            return 100 - ((score / 2.0) * 40);
        } else if (score <= 4.0) {
            return 60 - (((score - 2.0) / 2.0) * 30);
        } else {
            return 30 - (((score - 4.0) / 1.0) * 30);
        }
    }

    _getRiskScoreColor(riskScore) {
        const score = parseFloat(riskScore);
        if (isNaN(score)) return 'secondary';
        
        if (score <= 2.0) return 'success';
        if (score <= 4.0) return 'warning';
        return 'danger';
    }

    _getRiskLevelLabel(riskScore) {
        const score = parseFloat(riskScore);
        if (isNaN(score)) return 'Unknown';
        
        if (score <= 2.0) return 'Low Risk';
        if (score <= 4.0) return 'Medium Risk';
        return 'High Risk';
    }

    _getScoreColor(score) {
        if (score >= 60) return 'success';
        if (score >= 30) return 'warning';
        return 'danger';
    }

    _getScoreStrokeDasharray(score) {
        const circumference = 2 * Math.PI * 54;
        return `${circumference} ${circumference}`;
    }

    _getScoreStrokeDashoffset(score) {
        const circumference = 2 * Math.PI * 54;
        return circumference - (score / 100) * circumference;
    }

    _getSocialIcon(socialType) {
        const icons = {
            facebook: "fa-facebook",
            linkedin: "fa-linkedin",
            twitter: "fa-twitter",
            youtube: "fa-youtube",
            instagram: "fa-instagram"
        };
        return icons[socialType?.toLowerCase()] || "fa-link";
    }

    _getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    // _renderMarkdown(text) {
    //     if (!text) return '';

    //     let html = text;

    //     html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong style="color: #1e293b; font-weight: 600;">$1</strong>');

    //     html = html.split('\n\n').map(para => {
    //         const lines = para.split('\n').join('<br>');
    //         return `<p style="margin-bottom: 1rem; color: #334155; line-height: 1.8;">${lines}</p>`;
    //     }).join('');

    //     return html;
    // }

    _renderMarkdown(text) {

    if (!text) return '';

    let html = text;

    // Bold markdown
    html = html.replace(/\*\*([^\*]+)\*\*/g,
        '<strong style="color:#1e293b;font-weight:600;">$1</strong>'
    );

    // Remove markdown links
    html = html.replace(/\[[^\]]*\]\([^)]*\)/g, '');

    // Paragraph formatting
    html = html.split('\n\n').map(para => {

        const lines = para.split('\n').join('<br>');

        return `<p style="margin-bottom:1rem;color:#334155;line-height:1.8;">${lines}</p>`;

    }).join('');

    return html;
    }

    _initRiskScore(score) {
        if (!score && score !== 0) return;
        
        setTimeout(() => {
            const needle = document.getElementById("risk-meter-needle");
            if (needle) {
                needle.classList.add("needle-animation");
                setTimeout(() => {
                    needle.classList.remove("needle-animation");
                }, 1000);
            }
        }, 100);
    }
}

registry.category("actions").add("bizvibe_smart_search", BizVibeSmartSearch);