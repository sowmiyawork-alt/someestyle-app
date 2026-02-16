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
            // img2img - preserve the uploaded image structure
            image: image,
            
            // Emphasis on preserving face + adding pencil texture
            prompt: `SomeeStyle, black and white graphite pencil sketch, hand-drawn portrait, realistic pencil drawing, detailed shading, crosshatching, monochrome, grayscale, pencil texture, sketch on white paper, ${prompt || ''}`,
            
            // Block cartoon, illustration, and color
            negative_prompt: 'cartoon, comic, illustration, animated, stylized, caricature, exaggerated features, distorted face, color, colored, painting, digital art, airbrush, smooth, vector art, flat shading, cel shading, anime, manga, brown, sepia, orange, red, blue, warm tones',
            
            // CRITICAL: Lower strength to preserve facial features
            strength: 0.55,                 // LOWER = more face preservation (try 0.5-0.65)
            guidance_scale: 8.5,            // Balanced
            num_inference_steps: 50,        // High quality
            
            // Additional settings for better results
            num_outputs: 1,
            scheduler: "DPMSolverMultistep",
            
            // Try to preserve composition
            guess_mode: false
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
