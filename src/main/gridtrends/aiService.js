const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

class AIService {
    async analyzeTrends(trends, apiKey, model = 'meta-llama/llama-3.3-70b-versatile') {
        if (!apiKey) {
            return { error: 'No API Key provided' };
        }

        const prompt = `
        You are a Senior Stock Market Strategist & Data Analyst.
        
        Analyze the following raw trending stock data (images/topics) and generate a "DEEP MARKET INTELLIGENCE" report.
        Do NOT just list the trends. Analyze WHY they are selling, WHO is buying, and HOW to compete.

        Raw Data:
        ${JSON.stringify(trends.slice(0, 15), null, 2)}
        
        Output a COMPREHENSIVE JSON object with this exact structure:
        {
            "market_sentiment": "Bullish/Bearish/Saturated/Emerging",
            "sentiment_score": 85, (0-100)
            "market_summary": "2-3 sentence executive summary of the current visual market landscape.",
            "buyer_intelligence": [
                {
                    "persona": "e.g., Digital Agencies / Health Tech Startups",
                    "needs": "What specific visuals do they essentially need?",
                    "pain_points": "What are they tired of seeing (cliches)?"
                }
            ],
            "commercial_viability": {
                "demand_level": "High/Medium/Low",
                "competition_level": "High/Medium/Low",
                "avg_pricing_potential": "$$ - $$$"
            },
            "content_gaps": [
                "Specific descriptions of content that is in demand but under-supplied."
            ],
            "technical_recommendations": {
                "lighting": "e.g., Natural, Studio, Neon",
                "composition": "e.g., Minimalist, Copy-space centered",
                "color_palette": "Hex codes or descriptive names"
            },
            "top_niches": [
                {
                    "title": "Niche Title",
                    "commercial_score": 92, (0-100)
                    "reason": "Why it sells",
                    "keywords": "comma, separated, keywords",
                    "suggested_prompt": "Detailed AI image prompt"
                }
            ]
        }
        `;

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: [{
                        role: "user",
                        content: prompt
                    }],
                    model: model,
                    temperature: 0.6, // Lower temperature for more analytical precision
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();

            if (data.error) {
                console.error("Groq API Error:", data.error);
                return { error: data.error.message };
            }

            const content = data.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            console.error("AI Analysis Failed:", error);
            // Fallback for demo
            return {
                market_sentiment: "Emerging",
                sentiment_score: 75,
                market_summary: "Market is shifting towards authentic, unedited lifestyle imagery mixed with high-tech abstract concepts.",
                buyer_intelligence: [{ persona: "Tech Startups", needs: "Modern, clean, diverse teams", pain_points: "Overly staged 'handshake' photos" }],
                content_gaps: ["Authentic remote work setups in small apartments"],
                top_niches: []
            };
        }
    }

    async predictTrends(currentTrends, apiKey) {
        if (!apiKey) return { error: 'No API Key' };

        // "Predict Next Big Thing" prompt
        const prompt = `
        You are a Market Intelligence Expert for Microstock (Stock Photography/Video).
        User wants to know COMPREHENSIVE upcoming global events and detailed content strategy.

        Based on current date and global calendar, PREDICT:
        1. 4 MAJOR UPCOMING VISUAL TRENDS (The Next Big Thing).
        2. 5 IMPORTANT GLOBAL EVENTS (Content Calendar) for the next 3-4 months that stock creators MUST prepare for.

        For each Event, provide a "Content Strategy" explaining exactly what to create.

        Output JSON:
        {
            "predictions": [
                {
                    "title": "Trend Name (Creative)",
                    "conviction": 95, 
                    "description": "Short description in Indonesian language.",
                    "reasoning": "Why this will boom."
                }
            ],
            "upcoming_events": [
                {
                    "date": "DD MMM",
                    "event": "Event Name",
                    "niche": "Target Keyword",
                    "strategy": "Explanation of what content to create (in Indonesian). Focus on visual concepts, costumes, props, and setting.",
                    "visual_cues": "Specific objects/colors to include",
                    "keywords": "comma, separated, high, value, keywords"
                }
            ]
        }
        `;

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    model: "openai/gpt-oss-120b", // User requested specific model
                    temperature: 1,
                    max_completion_tokens: 8192,
                    top_p: 1,
                    stream: false,
                    reasoning_effort: "medium",
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            return JSON.parse(data.choices[0].message.content);
        } catch (e) {
            console.error("Prediction Error:", e);
            return {
                predictions: [
                    {
                        title: "Neon-Nature Synthesis",
                        conviction: 85,
                        description: "Penggabungan elemen alam organik dengan cahaya neon futuristik.",
                        reasoning: "Market saturation of plain nature requires a tech twist."
                    },
                    {
                        title: "Eco-Punk Reconstruction",
                        conviction: 92,
                        description: "Visual DIY daur ulang dengan estetika punk yang kasar.",
                        reasoning: "Sustainability moving from clean/corporate to raw/activist."
                    }
                ]
            };
        }
    }
    async generatePrompts(topic, style, count = 3, apiKey) {
        if (!apiKey) return { error: 'No API Key' };

        const prompt = `
        You are an Expert AI Art Prompt Engineer (Midjourney v6 & DALL-E 3 Specialist).
        
        Generate ${count} HIGH-CONVERTING stock photography prompts for the topic: "${topic}".
        Style: ${style}
        
        The prompts must be commercially viable for stock sites (Adobe Stock, Shutterstock).
        Include technical details (lighting, camera, lens, settings).
        
        Output JSON:
        {
            "prompts": [
                {
                    "type": "Photorealistic", // or Creative, Commercial, etc. vary the types
                    "prompt": "Detailed prompt here...",
                    "tips": "Brief tip for best result"
                }
            ]
        }
        (Ensure you provide exactly ${count} prompts in the array)
        `;

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.7,
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            const content = JSON.parse(data.choices[0].message.content);
            return content.prompts || []; // Return array of prompts
        } catch (e) {
            console.error("Prompt Gen Error:", e);
            return [{ type: "Error", prompt: "Failed to generate prompt. Please try again.", tips: "Check API Key" }];
        }
    }
}

module.exports = new AIService();
