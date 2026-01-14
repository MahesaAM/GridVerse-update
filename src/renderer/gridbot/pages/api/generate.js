import { NextResponse } from "next/server";

// API URL for Google's AI Sandbox
const API_URL = "https://aisandbox-pa.googleapis.com/v1:runImageFx";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_KEY || "";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { prompt, aspectRatio } = body;

    // Accept numImages parameter, default to 4
    let numImages = body.numImages;
    if (typeof numImages !== "number" || numImages < 1 || numImages > 4) {
      numImages = 4;
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt harus diisi!" }, { status: 400 });
    }

    // Get bearer token from authorization header
    const authHeader = request.headers.get("authorization");
    let bearerToken = "";

    if (authHeader && authHeader.startsWith("Bearer ")) {
      bearerToken = authHeader.substring(7);
    }

    if (!bearerToken) {
      // Fetch BEARER_TOKEN from Supabase settings table as fallback
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "BEARER_TOKEN")
        .single();

      if (error || !data || !data.value) {
        console.error("Failed to fetch BEARER_TOKEN from Supabase:", error);
        return NextResponse.json({ error: "API token not configured" }, { status: 500 });
      }

      bearerToken = data.value;
    }

    console.log(`Processing prompt: ${prompt}`);

    // Prepare the request body for the external API
    const requestBody = {
      userInput: {
        candidatesCount: numImages, // Use requested number of images
        prompts: [prompt],
        seed: 602603,
      },
      clientContext: {
        sessionId: `;${Date.now()}`,
        tool: "IMAGE_FX",
      },
      modelInput: {
        modelNameType: "IMAGEN_3_1",
      },
      aspectRatio: aspectRatio,
    };

    // Set up AbortController for request timeout (20 seconds for Vercel)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      console.log(`Sending request to external API for prompt: ${prompt}`);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          accept: "*/*",
          authorization: `Bearer REDACTED_SECRET`,
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();

      if (!response.ok) {
        // Try to parse error details from response body
        let errorMessage = `Failed to generate image: ${response.status} ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // ignore JSON parse errors
        }

        // Map common error status codes to specific messages
        if (response.status === 401) {
          errorMessage = "Invalid or expired bearer token.";
        } else if (response.status === 429) {
          // Check if API returned a more specific rate limit message
          if (errorMessage.toLowerCase().includes("rate limit")) {
            errorMessage = `Rate limit exceeded by Google Labs API. Please try again later. Details: ${errorMessage}`;
          } else {
            errorMessage = "Rate limit exceeded by Google Labs API. Please try again later.";
          }
        } else if (response.status === 408) {
          errorMessage = "Request to external API timed out.";
        }

        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);

      if (!data.imagePanels || data.imagePanels.length === 0) {
        throw new Error("No images were generated.");
      }

      // Get the first image panel for this prompt
      const panel = data.imagePanels[0];
      const images = panel.generatedImages.map((img, index) => {
        const dataUrl = `data:image/jpeg;base64,${img.encodedImage}`;
        const sanitizedPrompt = prompt.replace(/[^a-z0-9]/gi, "_").substring(0, 20);
        const filename = `${sanitizedPrompt}_${Date.now()}_${index + 1}.jpg`;
        return { filename, url: dataUrl };
      });

      console.log(`Finished processing prompt: ${prompt}`);

      return NextResponse.json({ prompt, images });
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Request timeout for prompt: " + prompt);
        return NextResponse.json({ error: "Request to external API timed out (20 seconds)." }, { status: 408 });
      } else {
        console.error(`Error for prompt ${prompt}: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
