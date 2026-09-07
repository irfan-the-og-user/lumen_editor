import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' https://api-inference.huggingface.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';");

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { image, mask, prompt = 'high quality background texture, seamless inpaint' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Missing base image' });
    }

    const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;

    if (!HF_TOKEN) {
      return res.status(500).json({ 
        error: 'HF_TOKEN environment variable not set on server. Using edge client inpainting fallback.' 
      });
    }

    // Call Hugging Face Inpainting Model
    // Model: runwayml/stable-diffusion-inpainting or stabilityai/stable-diffusion-2-inpainting
    const response = await fetch(
      'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            image: image,
            mask_image: mask,
            prompt: prompt,
          },
          parameters: {
            num_inference_steps: 25,
            guidance_scale: 7.5,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `Hugging Face inference error: ${errorText}` 
      });
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/png';

    return res.status(200).json({
      image: `data:${mimeType};base64,${base64}`,
      model: 'runwayml/stable-diffusion-inpainting',
      status: 'success'
    });
  } catch (error: any) {
    console.error('Inpainting API error:', error);
    return res.status(500).json({ 
      error: error?.message || 'Internal server error during inpainting' 
    });
  }
}
