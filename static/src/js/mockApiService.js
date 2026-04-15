/** @odoo-module **/

export async function searchCompanies(query) {
    console.log("🔍 Calling BizVibe API with query:", query);
    
    const payload = {
        "question": query,
        "country_code": [],
        "industries": [],
        "revenue_reference": [],
        "employees_reference": [],
        "productservices": [],
        "company_type": "Any",
        "risk_score": "Any",
        "from": 0,
        "size": 10,
        "user_id": 27,
        "_debug": 2
    };

    try {
        const response = await fetch('https://integration.bizvibe.com/api/buyer/services/smartsearch/3.0', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ API Response received:", data);
        
        // Check if response has empty data
        const hasEmptyResults = !data.search_results || data.search_results.length === 0;
        const hasEmptyAiResponse = !data.ai_response || data.ai_response.trim() === "";
        const hasEmptyRankedList = !data.Ranked_Company_List || data.Ranked_Company_List.length === 0;
        
        // If all are empty, return a "no information found" response
        if (hasEmptyResults && hasEmptyAiResponse && hasEmptyRankedList) {
            console.log("ℹ️ No information found for query:", query);
            return {
                status: 1,
                data: {
                    companies: [],
                    ai_response: "No information found for your search query. Please try different keywords or refine your search.",
                    ai_sources: [],
                    followup_question: "Try searching with different terms or add more specific details about what you're looking for.",
                    suggestions_section: "Consider using more specific keywords, adding location, industry, or company size filters.",
                    total_record: 0,
                    ranked_company_list: [],
                    no_results: true
                }
            };
        }
        
        // Extract AI response and suggestions
        const aiResponse = data.ai_response || "";
        const followupQuestion = data.followup_question || "";
        const suggestionsSection = data.Suggestions_Section || "";
        const totalRecord = data.total_record || 0;
        const rankedCompanyList = data.Ranked_Company_List || [];
        const aiSources = data.ai_sources || [];
        
        // Extract companies from search_results
        let companies = [];
        if (data.search_results && data.search_results.length > 0) {
            companies = data.search_results.map((result, index) => {
                const apiData = result.api_data || {};
                const basics = apiData.basics || {};
                
                return {
                    id: index + 1,
                    organization_reference_id: apiData.organization_reference_id || `ref_${index}`,
                    name: apiData.organization_name || result.domain || "Unknown Company",
                    type: basics.company_type || "Private",
                    employees: basics.employee_range || "N/A",
                    revenue: basics.revenue_range || "N/A",
                    city: basics.city || "",
                    country: basics.country || "",
                    headquarters: basics.headquarters || "",
                    location: basics.city ? `${basics.city}, ${basics.country || "India"}` : (basics.headquarters || "India"),
                    website: apiData.organization_website || result.domain || "",
                    description: basics.overview || "No description available",
                    domain: result.domain,
                    score: apiData.score || { risk_score: 0 },
                    industries: apiData.industries || [],
                    powerPhrase: apiData.powerPhrase || [],
                    rank: index + 1,
                    ranked_list_text: rankedCompanyList[index] || ""
                };
            });
        }
        
        return {
            status: 1,
            data: {
                companies: companies,
                ai_response: aiResponse,
                ai_sources: aiSources,
                followup_question: followupQuestion,
                suggestions_section: suggestionsSection,
                total_record: totalRecord,
                ranked_company_list: rankedCompanyList,
                no_results: companies.length === 0
            }
        };
        
    } catch (error) {
        console.error("❌ API call failed:", error);
        
        // Return error message
        return {
            status: 1,
            data: {
                companies: [],
                ai_response: "Unable to connect to BizVibe service. Please try again later.",
                ai_sources: [],
                followup_question: "Check your internet connection and try again.",
                suggestions_section: "If the problem persists, please contact support.",
                total_record: 0,
                ranked_company_list: [],
                no_results: true,
                is_error: true
            }
        };
    }
}

export async function getCompanyProfile(companyId) {
    console.log("📊 Getting profile for company ID:", companyId);
    
    // Default user_id - you can make this configurable
    const USER_ID = "27";
    
    const payload = {
        "user_id": USER_ID,
        "organization_reference_id": companyId,
        "_debug": 2
    };

    try {
        console.log("📤 Calling Company Details API with payload:", payload);
        console.log("🔗 API URL: https://integration.bizvibe.com/api/buyer/services/getCompanyDetails/3.0");
        
        const response = await fetch('https://integration.bizvibe.com/api/buyer/services/getCompanyDetails/3.0', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        console.log("📥 Response status:", response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Profile API returned ${response.status}`);
        }

        const responseData = await response.json();
        console.log("✅ Profile API Response received");
        
        // Check if the response contains company data in _source
        if (responseData && responseData._source) {
            console.log("✅ Valid response detected! Processing _source data...");
            
            const source = responseData._source;
            const basics = source.basics || {};
            const address = source.address || [];
            
            console.log("📍 Found address count:", address.length);
            
            // Find headquarters address (is_hq === "1")
            const hqAddress = address.find(addr => addr.is_hq === "1") || address[0] || {};
            
            // Format the data to match your component's expected structure
            const formattedData = {
                status: 1,
                data: {
                    profile_completeness: source.profile_completeness || "70",
                    risk_score: source.score?.risk_score || 0,  
                    basics: {
                        organization_name: source.organization_name || basics.organization_name || "Unknown Company",
                        organization_website: source.organization_website || basics.organization_website || "",
                        businessTypes: basics.businessTypes || ["Private"],
                        employees: basics.employees || basics.employee_range || source.employee_range || "N/A",
                        revenue_range: basics.revenue_range || source.revenue_range || "N/A",
                        city: hqAddress.city || basics.city || "",
                        country: hqAddress.country || basics.country || "",
                        company_type:basics.company_type || "Private",
                        headquarters: basics.headquarters || (hqAddress.city ? `${hqAddress.city}, ${hqAddress.country}` : "N/A"),
                        overview: basics.overview || source.overview || "No overview available",
                        address1: hqAddress.address1 || basics.address1 || "",
                        address2: hqAddress.address2 || basics.address2 || "",
                        state: hqAddress.state || basics.state || "",
                        pincode: hqAddress.pincode || basics.pincode || "",
                        email: basics.email || [],
                        phone: basics.phone || [],
                        logo_url: basics.logo_url || "",
                        region: hqAddress.region || basics.region || "",
                        sub_region: hqAddress.sub_region || basics.sub_region || "",
                        latitude: hqAddress.latitude || basics.latitude || (hqAddress.geo_points ? hqAddress.geo_points[0] : "") || "",
                        longitude: hqAddress.longitude || basics.longitude || (hqAddress.geo_points ? hqAddress.geo_points[1] : "") || "",
                        additional_locations: address.filter(addr => addr.is_hq !== "1") || []
                    },
                    powerPhrase: source.powerPhrase || [],
                    industries: source.industries || [],
                    social: source.social || [],
                    keyexecutives: source.keyexecutives || []
                }
            };
            
            console.log("✅ Formatted data ready for company:", formattedData.data.basics.organization_name);
            return formattedData;
            
        } else {
            console.warn("⚠️ No valid company data found for ID:", companyId);
            
            // Fallback to mock data
            console.log("📋 Falling back to mock data for company ID:", companyId);
            return getMockCompanyProfile(companyId);
        }
        
    } catch (error) {
        console.error("❌ Profile API call failed:", error);
        
        // Fallback to mock data on error
        console.log("📋 Falling back to mock data due to error for company ID:", companyId);
        return getMockCompanyProfile(companyId);
    }
}

// Helper function for mock profile data (fallback)
function getMockCompanyProfile(companyId) {
    console.log("📋 Using mock profile data for company ID:", companyId);
    
    const mockProfiles = {
        "cb776b4d43dfe1040776fcd88f1ba3c4": {
            profile_completeness: "85",
            risk_score: 1.5,
            basics: {
                organization_name: "Razorpay Software Private Limited",
                organization_website: "razorpay.com",
                businessTypes: ["Private"],
                employees: "1001+",
                revenue_range: "USD 101-500 million",
                city: "Bangalore",
                country: "India",
                headquarters: "Bangalore, India",
                overview: "Razorpay is a leading payment gateway company in India that offers a comprehensive suite of payment solutions for online businesses. They provide payment gateway services, subscription management, international payments, and more.",
                address1: "No. 62, 3rd Floor, 13th A Main Road",
                city: "Bangalore",
                state: "Karnataka",
                pincode: "560076",
                country: "India",
                email: ["support@razorpay.com", "sales@razorpay.com"],
                phone: ["080 4666 6999", "080 4666 6000"]
            },
            powerPhrase: [
                { keyword: "Payment Gateway", keywordId: "7e7614f1f17236479004d1029a33d5c4" },
                { keyword: "Subscription Management", keywordId: "c65ad2685e76d4fac1eac7e99ae023fe" },
                { keyword: "International Payments", keywordId: "952fc397fd54c29e8721afdbc12be678" },
                { keyword: "UPI Payments", keywordId: "899e9d2e9ce59dfaf8660442f091d936" },
                { keyword: "Fraud Detection", keywordId: "cbf91b9ef9669d67a59ee6d12fd21148" }
            ],
            industries: [
                { bv_l3_name: "Financial Transactions Processing", bv_l3_nacis_id: "522320" },
                { bv_l3_name: "Software Publishers", bv_l3_nacis_id: "513210" }
            ],
            social: [
                { social_type: "linkedin", link: "https://linkedin.com/company/razorpay" },
                { social_type: "twitter", link: "https://twitter.com/Razorpay" },
                { social_type: "facebook", link: "https://facebook.com/Razorpay" }
            ],
            keyexecutives: [
                { name: "Harshil Mathur", designation: "CEO & Co-founder", email: "harshil@razorpay.com" },
                { name: "Shashank Kumar", designation: "CTO & Co-founder", email: "shashank@razorpay.com" }
            ]
        },
        "78173266ef24e1e4515a08eef9a8523b": {
            profile_completeness: "80",
            risk_score: 2.3,
            basics: {
                organization_name: "PayU Payments Private Limited",
                organization_website: "payu.in",
                businessTypes: ["Private"],
                employees: "1001+",
                revenue_range: "USD 501 million-1 billion",
                city: "Mumbai",
                country: "India",
                headquarters: "Mumbai, India",
                overview: "PayU is a leading payment gateway provider in India, offering payment processing solutions for online businesses. They provide a wide range of payment options including credit cards, debit cards, net banking, UPI, and wallets.",
                address1: "801, 8th Floor, Tower B, Unitech Cyber Park",
                city: "Gurugram",
                state: "Haryana",
                pincode: "122002",
                country: "India",
                email: ["support@payu.in", "sales@payu.in"],
                phone: ["0124 679 9000"]
            },
            powerPhrase: [
                { keyword: "Payment Gateway Solutions", keywordId: "d0ee511a773db5747904b51dfe64a9e4" },
                { keyword: "Gateway Solutions", keywordId: "78358f519e8496d6aad34e587159ca62" }
            ],
            industries: [
                { bv_l3_name: "Financial Transactions Processing", bv_l3_nacis_id: "522320" }
            ],
            social: [
                { social_type: "linkedin", link: "https://linkedin.com/company/payu" },
                { social_type: "twitter", link: "https://twitter.com/PayU" }
            ],
            keyexecutives: [
                { name: "Anirban Mukherjee", designation: "CEO", email: "anirban.mukherjee@payu.in" }
            ]
        },
        "3838e7cb5d089fdbb774ad95ac118f9f": {
            profile_completeness: "75",
            risk_score: 1.8,
            basics: {
                organization_name: "CtrlS Datacenters Ltd",
                organization_website: "ctrls.in",
                businessTypes: ["Private"],
                employees: "1001+",
                revenue_range: "USD 101-500 million",
                city: "Hyderabad",
                country: "India",
                headquarters: "Hyderabad, India",
                overview: "CtrlS is Asia's largest Rated-4 data center company, offering hyperscale data center solutions, cloud services, managed hosting, and disaster recovery services.",
                address1: "Plot No 13, 6-3-1192/1/1, Kundanbhagya, Begumpet",
                city: "Hyderabad",
                state: "Telangana",
                pincode: "500016",
                country: "India",
                email: ["sales@ctrls.in", "support@ctrls.in"],
                phone: ["040 6633 3333", "040 6633 3300"]
            },
            powerPhrase: [
                { keyword: "Data Center Services", keywordId: "07f5630d8f6f9478f5854ec96b94525c" },
                { keyword: "Cloud Solutions", keywordId: "869479ec98dced515dd0bcf5630e85c3" },
                { keyword: "Managed Hosting", keywordId: "3437cf3b358d01f0f7e3a9069a1b8bd9" },
                { keyword: "Disaster Recovery", keywordId: "ee8cd2e07c86f71608605ce9ec23d4b4" },
                { keyword: "Colocation", keywordId: "16912572208c04dcd2648559e3bb09e0" }
            ],
            industries: [
                { bv_l3_name: "Data Processing, Hosting, and Related Services", bv_l3_nacis_id: "518210" },
                { bv_l3_name: "Computer Systems Design Services", bv_l3_nacis_id: "541512" }
            ],
            social: [
                { social_type: "linkedin", link: "https://linkedin.com/company/ctrls" },
                { social_type: "twitter", link: "https://twitter.com/ctrlshq" },
                { social_type: "facebook", link: "https://facebook.com/ctrlshq" }
            ],
            keyexecutives: [
                { name: "Sridhar Pinnapureddy", designation: "CEO & Founder", email: "sridhar@ctrls.in" }
            ]
        }
    };
    
    // Return mock profile if we have it, otherwise return generic profile
    if (mockProfiles[companyId]) {
        return {
            status: 1,
            data: mockProfiles[companyId]
        };
    } else {
        // Return generic profile based on companyId
        return {
            status: 1,
            data: {
                profile_completeness: "70",
                risk_score: 3.2,
                basics: {
                    organization_name: `Company Profile`,
                    organization_website: "example.com",
                    businessTypes: ["Private"],
                    employees: "201-500",
                    revenue_range: "USD 11-100 million",
                    city: "Mumbai",
                    country: "India",
                    headquarters: "Mumbai, India",
                    overview: "Leading provider of business solutions in India.",
                    address1: "Business Park",
                    city: "Mumbai",
                    state: "Maharashtra",
                    pincode: "400001",
                    country: "India",
                    email: ["contact@example.com"],
                    phone: ["022 1234 5678"]
                },
                powerPhrase: [
                    { keyword: "Business Solutions", keywordId: "b2fe440cb7a0b127f1a90ffea296313b" }
                ],
                industries: [
                    { bv_l3_name: "Computer Systems Design Services", bv_l3_nacis_id: "541512" }
                ],
                social: [
                    { social_type: "linkedin", link: "https://linkedin.com/company/example" }
                ],
                keyexecutives: [
                    { name: "John Doe", designation: "CEO", email: "john@example.com" }
                ]
            }
        };
    }
}