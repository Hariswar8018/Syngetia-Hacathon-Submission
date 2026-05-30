require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Gemini ONLY if a valid key is provided to prevent ADC browser popups
let ai = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

app.post('/api/generate-campaign', async (req, res) => {
    const requestData = req.body;
    
    // Default values if not provided
    const crop = requestData.crop || "Cotton";
    const state = requestData.state || "Maharashtra";
    const district = requestData.district || "Yavatmal";
    const pestRisk = requestData.pestRisk || "High - Pink Bollworm";
    const weather = "High Humidity, Intermittent Rain";
    const language = requestData.language || "Marathi";
    
    // 1. Call Python ML Service for Engagement Score
    let engagementScore = 76; // default
    let heuristics = ["General Campaign Template"];
    try {
        const mlPayload = {
            campaign_product: "Syngenta Recommended",
            campaign_crop: crop,
            state: state,
            district: district,
            language: language,
            device_type: "smartphone", // default assumption for prediction
            grower_age: 45,
            gender: "male",
            grower_farm_size: 2.5,
            month: new Date().getMonth() + 1,
            dayofweek: new Date().getDay()
        };
        
        // Ensure ML API URL is configurable, default to localhost for demo
        const mlApiUrl = process.env.ML_API_URL || 'http://localhost:8000/predict';
        const mlResponse = await axios.post(mlApiUrl, mlPayload, { timeout: 3000 });
        
        if (mlResponse.data && mlResponse.data.engagement_percentage) {
            engagementScore = mlResponse.data.engagement_percentage;
            if (mlResponse.data.heuristics_used) {
                heuristics = mlResponse.data.heuristics_used;
            }
        }
    } catch (mlError) {
        console.warn("ML Service unavailable, using default engagement score:", mlError.message);
    }

    // 2. Prompt Gemini with the ML Score
    const prompt = `
You are an expert AI agriculture marketing assistant for Syngenta. 
Generate a hyperlocal marketing campaign targeting farmers based on the following context:
- State: ${state}
- District: ${district}
- Crop: ${crop}
- Pest Risk: ${pestRisk}
- Language: ${language}
- Target Engagement Score: ${engagementScore}% (Optimize messaging to achieve this ML-predicted score)

Return your response ONLY as a raw JSON object (without Markdown formatting or \`\`\`json blocks) with the following exact structure:
{
    "personas": {
        "traditional": {
            "name": "Traditional Farmer",
            "profile": "Age 65+ | Prefers offline trust",
            "channel": "SMS",
            "content": "(Write a short SMS in ${language})",
            "engagement": ${engagementScore - 4}
        },
        "young": {
            "name": "Young Progressive Farmer",
            "profile": "Tech Savvy | Adopts new methods",
            "channel": "WhatsApp",
            "content": "(Write a modern WhatsApp message with emojis in ${language})",
            "engagement": ${engagementScore + 8}
        },
        "lowLiteracy": {
            "name": "Low Literacy Farmer",
            "profile": "Feature phone | Audio preferred",
            "channel": "Voice Call",
            "content": "(Write a 30-word voice script in ${language})",
            "engagement": ${engagementScore - 8}
        },
        "retailer": {
            "name": "Retailer",
            "profile": "Inventory Manager",
            "channel": "SMS / App",
            "content": "(Write an English message to the retailer to stock up)",
            "engagement": ${engagementScore + 5}
        },
        "largeFarm": {
            "name": "Large Farm Owner",
            "profile": "High scale | ROI focused",
            "channel": "Email / WhatsApp",
            "content": "(Write a professional message focused on ROI and yield protection in English or ${language})",
            "engagement": ${engagementScore + 12}
        }
    },
    "battleArena": [
        {
            "variant": "Variant A (Fear-based)",
            "message": "(Write a short 1-sentence English fear-based marketing message)",
            "score": ${Math.max(60, engagementScore - 12)},
            "color": "warning"
        },
        {
            "variant": "Variant B (Profit-based)",
            "message": "(Write a short 1-sentence English profit-based marketing message)",
            "score": ${Math.min(99, engagementScore + 10)},
            "color": "success"
        },
        {
            "variant": "Variant C (Community-based)",
            "message": "(Write a short 1-sentence English community-based marketing message)",
            "score": ${engagementScore - 4},
            "color": "primary"
        }
    ]
}
`;

    try {
        let aiGeneratedContent;
        
        if (ai) {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            // Clean up the response if it has markdown formatting
            let text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            aiGeneratedContent = JSON.parse(text);
        } else {
            // Fallback if API key is not set
            console.warn("GEMINI_API_KEY not set. Using fallback mock data.");
            aiGeneratedContent = {
                personas: {
                    traditional: { name: "Traditional Farmer", profile: "Age 65+ | Prefers offline trust", channel: "SMS", content: "[Mock] नमस्कार! गुलाबी बोंडअळीचा धोका वाढला आहे.", engagement: engagementScore - 4 },
                    young: { name: "Young Progressive Farmer", profile: "Tech Savvy | Adopts new methods", channel: "WhatsApp", content: "[Mock] 🚨 High Risk Alert 🚨", engagement: engagementScore + 8 },
                    lowLiteracy: { name: "Low Literacy Farmer", profile: "Feature phone | Audio preferred", channel: "Voice Call", content: "[Mock] नमस्कार शेतकरी मित्रांनो! त्वरीत फवारणी करा.", engagement: engagementScore - 8 },
                    retailer: { name: "Retailer", profile: "Inventory Manager", channel: "SMS", content: "[Mock] Restock alert for Amplego.", engagement: engagementScore + 5 },
                    largeFarm: { name: "Large Farm Owner", profile: "High scale | ROI focused", channel: "WhatsApp", content: "[Mock] Protect your ROI. Secure yield against Pink Bollworm.", engagement: engagementScore + 12 }
                },
                battleArena: [
                    { variant: "Variant A (Fear-based)", message: "[Mock] Risk is critical.", score: 68, color: "warning" },
                    { variant: "Variant B (Profit-based)", message: "[Mock] Protect your yield.", score: 84, color: "success" },
                    { variant: "Variant C (Community-based)", message: "[Mock] Farmers are acting.", score: 72, color: "primary" }
                ]
            };
        }

        const mockResponse = {
            status: "success",
            campaignDetails: {
                id: "CMP-" + Math.floor(Math.random() * 10000),
                crop: crop,
                state: state,
                district: district,
                pestRisk: pestRisk,
                weather: weather,
            },
            personas: aiGeneratedContent.personas,
            battleArena: aiGeneratedContent.battleArena,
            explainabilityFlow: [
                {
                    step: "Signal Detection",
                    icon: "fa-cloud-rain",
                    title: "Weather Signal",
                    desc: "High humidity & rain in " + district
                },
                {
                    step: "Risk Prediction",
                    icon: "fa-bug",
                    title: "Pest Risk",
                    desc: "70% probability of " + pestRisk
                },
                {
                    step: "ML Engagement Prediction",
                    icon: "fa-brain",
                    title: `Expected: ${engagementScore}%`,
                    desc: "Predicted by ML Model (.pkl)"
                },
                {
                    step: "AI Strategy",
                    icon: "fa-bullseye",
                    title: "Campaign Strategy",
                    desc: "Targeting tailored per Persona via Gemini"
                }
            ],
            // Include heuristics for the frontend to display
            mlIntelligence: {
                score: engagementScore,
                heuristics: heuristics
            }
        };

        if (db.hasDb()) {
            const campaignName = pestRisk.split('-')[1]?.trim() + " Alert" || "Campaign " + mockResponse.campaignDetails.id;
            const region = `${district}, ${state}`;
            
            db.query(
                `INSERT INTO campaigns (campaign_name, crop, region, language, engagement_prediction) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [campaignName, crop, region, language, engagementScore]
            ).catch(err => console.error("DB Insert Error:", err));
        }

        res.json(mockResponse);

    } catch (error) {
        console.error("API Generation Error:", error);
        res.status(500).json({ status: "error", message: "Failed to generate AI content" });
    }
});

app.get('/api/campaigns', async (req, res) => {
    try {
        if (!db.hasDb()) {
            return res.json([
                { id: 1, campaign_name: "Pink Bollworm Alert", crop: "Cotton", region: "Yavatmal, Maharashtra", language: "Marathi", engagement_prediction: 74, created_at: new Date().toISOString() },
                { id: 2, campaign_name: "Blast Control - Kharif", crop: "Rice", region: "Rourkela, Odisha", language: "Odia", engagement_prediction: 68, created_at: new Date(Date.now() - 86400000).toISOString() }
            ]);
        }

        const result = await db.query('SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 10');
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching campaigns:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

