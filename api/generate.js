// Vercel Serverless Function to handle Replicate API calls
// This avoids CORS issues by making API calls from the server

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, predictionId, apiKey, modelVersion, image, prompt } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Create new prediction
    if (action === 'create') {
      if (!modelVersion || !image) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: modelVersion,
          input: {
            // img2img - transform the uploaded image
            image: image,
            
            // VERY STRONG pencil sketch prompt
            prompt: `SomeeStyle, black and white pencil sketch, graphite drawing, hand-drawn portrait, pencil art, monochrome sketch, detailed pencil shading, crosshatching, sketch lines, pencil texture, traditional drawing, grayscale art, no color, ${prompt || ''}`,
            
            // STRONG negative prompt to prevent color and painting
            negative_prompt: 'color, colored, painting, oil painting, acrylic painting, watercolor, digital painting, vibrant, colorful, realistic photo, photograph, digital art, 3d render, smooth, polished, modern art, abstract art, cartoon, anime, airbrush, soft painting, colored pencil, pastel, brown tones, sepia, warm colors, orange, red, blue, green, yellow, purple, painted, artistic painting',
            
            // Stronger transformation for pencil effect
            num_inference_steps: 45,        // Higher for better quality
            guidance_scale: 9.0,            // HIGHER - follow prompt more strictly
            strength: 0.80,                 // HIGHER - more transformation to sketch
            num_outputs: 1,
            scheduler: "DPMSolverMultistep"
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      return res.status(200).json(data);
    }

    // Check prediction status
    if (action === 'status') {
      if (!predictionId) {
        return res.status(400).json({ error: 'Prediction ID is required' });
      }

      const response = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json',
          }
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
