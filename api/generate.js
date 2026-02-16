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
            
            // Strong prompt for pencil sketch style
            prompt: `SomeeStyle graphite pencil sketch, hand-drawn portrait, detailed pencil shading, black and white sketch art, realistic pencil texture, monochrome drawing, visible pencil strokes, ${prompt || ''}`,
            
            // Prevent photorealistic output
            negative_prompt: 'color, colored, photograph, realistic photo, digital art, painting, oil painting, watercolor, 3d render, cartoon, anime, vibrant, colorful, modern art, smooth, photorealistic',
            
            // img2img specific parameters
            num_inference_steps: 40,        // Higher for better quality
            guidance_scale: 7.5,            // How closely to follow the prompt
            strength: 0.75,                 // How much to transform (0.6-0.9)
                                           // 0.75 = good balance between preserving face and adding sketch effect
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
