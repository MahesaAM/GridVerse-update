
/**
 * MetadataAI Service
 * Handles interactions with Gemini, OpenAI, and Ollama APIs for image analysis.
 */

/**
 * MetadataAI Service
 * Handles interactions with Gemini, OpenAI, and Ollama APIs for image analysis.
 */

const getSystemPrompt = (config) => {
    const titleLength = config.titleLength || 10;
    const descLength = config.descriptionLength || 30;
    const kwCount = config.keywordCount || 49;

    return `
Analyze the provided image/video and generate high-quality metadata for Adobe Stock.
Your goal is to maximize SEO and commercial conversion.

**METADATA SPECIFICATIONS:**
- **Title**: A compelling, natural sentence. Max ${titleLength} words or ~150 characters.
  - DO NOT use colons (:).
  - DO NOT use generic phrases like "photo of", "image includes", "this is a picture of".
  - Think like a buyer searching for this content. Use action words and emotional triggers.
- **Description**: Detailed and benefit-focused. Max ${descLength} words or ~150 characters.
  - Explain the mood, atmosphere, and potential commercial uses.
  - DO NOT mention technical file info (vector, SVG, JPG, etc.).
- **Keywords**: Approximately ${kwCount} highly relevant single-word keywords.
  - NO compound words or phrases.
  - NO dashes or hyphens.
  - Prioritize search volume and buyer intent.
  - EACH KEYWORD MUST BE SEPARATED BY A COMMA AND A SPACE.

**CRITICAL RULES:**
- NO reference to "image", "vector", "graphic", "illustration" unless it's the subject.
- NO technical jargon about file formats.
- STRICTLY return raw JSON based on the structure below.

Output MUST be valid JSON with this structure:
{
  "title": "Natural stone bridge in autumn forest with golden light",
  "description": "Stunning natural stone bridge crossing a peaceful stream during peak autumn foliage, perfect for travel and nature concepts.",
  "keywords": "autumn, forest, bridge, stream, nature, landscape, travel, golden, light, peace, etc",
  "category": "11"
}
Do not include markdown formatting like \`\`\`json. Just return the raw JSON string.
`;
};

export const MetadataAI = {
    /**
     * Generate metadata for a single file
     * @param {File} file - The file object
     * @param {string} fileData - Base64 data of the file (or text if testing)
     * @param {object} config - { provider, apiKey, model, endpoint, titleLength, descriptionLength, keywordCount }
     */
    async generate(file, fileData, config) {
        // Strip data URL prefix if present for APIs that need raw base64
        const base64Clean = fileData.split(',')[1];

        switch (config.provider) {
            case 'gemini':
                return this.callGemini(base64Clean, config, file.mimeType || file.type);
            case 'gpt':
                return this.callGPT(fileData, config); // GPT usually handles data URI automatically or we parse it
            case 'ollama':
                return this.callOllama(base64Clean, config);
            case 'groq':
                return this.callGroq(fileData, config); // Groq mimics OpenAI API
            case 'mock': // For testing/dev
                return this.callMock();
            default:
                throw new Error('Unknown AI Provider');
        }
    },

    async callMock() {
        return new Promise(resolve => setTimeout(() => resolve({
            title: "Mock Title " + Date.now(),
            description: "This is a simulated description for development purposes.",
            keywords: "test, mock, dev, simulation, ai"
        }), 1000));
    },

    async callGemini(base64Image, config, mimeType) {
        const apiKey = config.apiKey;
        if (!apiKey) throw new Error("Gemini API Key is required");

        const model = config.model || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Generate dynamic prompt
        const prompt = getSystemPrompt(config);

        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: mimeType || "image/jpeg", // Assuming JPEG for now, or detect from file
                            data: base64Image
                        }
                    }
                ]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Gemini API Error');
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        const result = this.parseJSON(text);

        return {
            title: result.title,
            description: result.description,
            keywords: result.keywords,
            category: result.category || ""
        };
    },

    async callGPT(dataUrl, config) {
        const apiKey = config.apiKey;
        if (!apiKey) throw new Error("OpenAI API Key is required");

        const model = config.model || 'gpt-4o';
        const url = 'https://api.openai.com/v1/chat/completions';

        const prompt = getSystemPrompt(config);

        const payload = {
            model: model,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: dataUrl } }
                    ]
                }
            ],
            max_tokens: 300
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'OpenAI API Error');
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        const result = this.parseJSON(text);

        return {
            title: result.title,
            description: result.description,
            keywords: result.keywords,
            category: result.category || ""
        };
    },

    async callGroq(dataUrl, config) {
        const apiKey = config.apiKey;
        if (!apiKey) throw new Error("Groq API Key is required");

        let model = config.model || 'meta-llama/llama-4-scout-17b-16e-instruct';

        // Ensure meta-llama/ prefix for llama models if missing
        if (model.startsWith('llama-4') || model.startsWith('llama-3')) {
            model = 'meta-llama/' + model;
        }

        const url = 'https://api.groq.com/openai/v1/chat/completions';

        const prompt = getSystemPrompt(config);

        const payload = {
            model: model,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: dataUrl } }
                    ]
                }
            ],
            max_tokens: 1024
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Groq API Error');
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        const result = this.parseJSON(text);

        return {
            title: result.title,
            description: result.description,
            keywords: result.keywords,
            category: result.category || ""
        };
    },

    async callOllama(base64Image, config) {
        const model = config.model || 'llava';
        const endpoint = config.endpoint || 'http://localhost:11434';

        // Ollama generate endpoint is simpler usually
        const url = `${endpoint}/api/generate`;

        const prompt = getSystemPrompt(config);

        const payload = {
            model: model,
            prompt: prompt,
            images: [base64Image],
            stream: false,
            format: "json" // Force JSON mode if model supports it
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Ollama Error: ${response.statusText}`);
        }

        const data = await response.json();
        const result = this.parseJSON(data.response);

        return {
            title: result.title,
            description: result.description,
            keywords: result.keywords,
            category: result.category || ""
        };
    },

    parseJSON(text) {
        try {
            // Clean markdown code blocks if present
            const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(clean);
        } catch (e) {
            console.error("JSON Parse Error", e, text);
            // Fallback: simple text extraction if JSON fails?
            // For now, assume strict compliance or throw
            throw new Error("Failed to parse AI response as JSON");
        }
    }
};
