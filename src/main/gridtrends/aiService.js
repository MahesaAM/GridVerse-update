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
        You are a Senior Portfolio Manager for a top Microstock Agency (like Stocksy or Getty Images).
        Your goal is to guide contributors to create HIGH-SELLING COMMERCIAL CONTENT.
        
        Analyze the current date and global context.
        Provide a "Microstock Success Radar" with:
        1. 4 MAJOR VISUAL TRENDS that will be in high demand for advertising/marketing in 3-4 months.
        2. 5 KEY EVENTS/SEASONS that creators must shoot for NOW (e.g., if it's Oct, shoot for Xmas/NewYear).

        For each Trend/Event, providing actionable "Commercial Guidance" is critical.
        
        Output JSON:
        {
            "predictions": [
                {
                    "title": "Trend Name",
                    "conviction": 90, 
                    "description": "Brief description in Indonesian.",
                    "commercial_advice": "Why it sells.",
                    "technical_tips": "e.g., 'Natural light'."
                }
            ],
            "upcoming_events": [
                {
                    "date": "YYYY-MM-DD", // EXACT ISO FORMAT (2024-10-25). If unsure of day, use 01.
                    "event": "Event Name",
                    "niche": "Killer Keyword",
                    "strategy": "Detailed strategy in Indonesian",
                    "buyer_needs": "Who is buying?",
                    "visual_cues": "Props/Colors",
                    "keywords": "comma, separated"
                }
            ]
        }
        `;

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + apiKey,
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
                        commercial_advice: "Tech companies need green-tech visuals.",
                        technical_tips: "Use gel lighting on plants."
                    }
                ]
            };
        }
    }

    async chatDiscussion(history, context, apiKey, image = null) {
        if (!apiKey) return { error: 'No API Key' };

        const systemPrompt = `
        You are "GridMentor", the intelligent AI assistant inside the **GridVerse** application.
        You are an expert on Microstock, AI Art, and specifically HOW to use GridVerse to automate the workflow.

        **YOUR KNOWLEDGE BASE (About GridVerse):**
        GridVerse is an all-in-one automation suite for Microstock Contributors & AI Artists.
        
        **1. GridTrends (Current Module)**
        - **Function**: Market intelligence & trend prediction.
        - **Features**: "Future Radar" (predicts next month's trends), "Deep Market Analysis" (analyzes why images sell), and Global Event Calendar.
        
        **2. GridPrompt**
        - **Function**: Advanced AI Prompt Generator.
        - **Models**: Uses Gemini & Llama (via Groq) to craft high-converting prompts.
        - **Key Feature**: "Image to Prompt" (uses Llama 4 Scout) to reverse-engineer prompts from reference images.
        
        **3. GridMeta**
        - **Function**: AI Metadata Generator (Titles, Descriptions, Keywords).
        - **Key Feature**: Drag & drop an image, and it uses Vision AI (Llama 4 Scout) to generate SEO-optimized metadata for stock sites (Adobe Stock, Shutterstock).
        
        **4. GridVector**
        - **Function**: Vectorization Automation.
        - **Features**: Integrates with Vectorizer.ai to bulk convert images (PNG/JPG) into SVGs for vector contributors. Supports auto-login and cookie management.
        
        **5. GridBot (Automation)**
        - **Function**: The engine for browser automation.
        - **Features**: Manages anti-detect browser profiles (Chromium) to safely upload/submit to multiple accounts without getting banned.
        
        **6. GridVid (VIDEO GENERATION)**
        - **Function**: AI Video Generator Studio.
        - **Features**: 
            - **Text-to-Video**: Generate videos from prompts.
            - **Image-to-Video**: Animate static images.
            - **Models**: Supports Google Veo 3, Hailuo/Minimax, and Luma Dream Machine.
            - **Headless Mode**: Can generate in background while you do other tasks.

        **7. GridBrowser**
        - **Function**: Built-in multi-profile browser.
        - **Features**: Isolated cookies/storage for managing hundreds of microstock accounts simultaneously.

        **Your Goal**:
        - Guide the user on how to use these tools together (e.g., "Use GridTrends to find a niche, generate prompts in GridPrompt, then upscale/vectorize in GridVector").
        - Troubleshoot basic issues (e.g., "Check your API keys in Settings if generation fails").
        - Provide commercial advice based on this ecosystem.
        - **Language**: Reply in conversational, helpful **Bahasa Indonesia**.
        
        Context of current trends passed by user:
        ${JSON.stringify(context || {})}
        
        Answer short, punchy, and actionable.
        `;

        try {
            // Determine model based on image presence
            // Llama 3.3 70B is text-only. 
            // User requested Llama 4 Scout for Vision matching GridPrompt/Meta.
            const model = image ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

            const messages = [
                { role: "system", content: systemPrompt },
                ...history
            ];

            // If image is present, properly attach it to the LAST user message
            // or create a new message if the last one isn't user (unlikely in this flow)
            if (image) {
                const lastMsgIndex = messages.length - 1;
                if (messages[lastMsgIndex].role === 'user') {
                    // Convert simple text content to array content for multimodal
                    const textContent = messages[lastMsgIndex].content;
                    messages[lastMsgIndex].content = [
                        { type: "text", text: textContent },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${image.mimeType};base64,${image.base64}`
                            }
                        }
                    ];
                }
            }

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey} `,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: messages,
                    model: model,
                    temperature: 0.7,
                    max_tokens: 1024
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            return { role: 'assistant', content: data.choices[0].message.content };
        } catch (e) {
            console.error("Chat Error:", e);
            return { role: 'assistant', content: "Maaf, saya sedang kehilangan koneksi ke server inspirasi. Coba lagi ya!" };
        }
    }
    async generatePrompts(topic, style, count = 3, apiKey) {
        if (!apiKey) return { error: 'No API Key' };

        const prompt = `
        You are an Expert AI Art Prompt Engineer(Midjourney v6 & DALL - E 3 Specialist).
        
        Generate ${count} HIGH - CONVERTING stock photography prompts for the topic: "${topic}".
            Style: ${style}
        
        The prompts must be commercially viable for stock sites(Adobe Stock, Shutterstock).
        Include technical details(lighting, camera, lens, settings).
        
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
                    "Authorization": `Bearer ${apiKey} `,
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
