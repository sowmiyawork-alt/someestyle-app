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
            
            // Match the exact style from training images
            prompt: `SomeeStyle, pure black and white graphite pencil portrait sketch, hand-drawn with pencil on white paper, detailed crosshatching shading, visible pencil strokes, realistic pencil texture, monochrome grayscale drawing, traditional pencil art, sketch lines, no color, ${prompt || ''}`,
            
            // Aggressively block ALL color and non-pencil styles
            negative_prompt: 'color, colored, any color, brown, sepia, beige, tan, orange, red, blue, green, yellow, purple, pink, warm tones, cool tones, tinted, toned, painting, oil painting, acrylic, watercolor, digital painting, digital art, airbrush, smooth painting, rendered, 3d, photorealistic, photograph, modern art, abstract, cartoon, anime, comic, illustration, vector art, flat colors, gradients, soft brush, polished, glossy, shiny',
            
            // Settings optimized for pencil sketch transformation
            num_inference_steps: 50,        // High quality
            guidance_scale: 10.0,           // VERY strict - force B&W pencil style
            strength: 0.75,                 // Balance likeness and transformation
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
