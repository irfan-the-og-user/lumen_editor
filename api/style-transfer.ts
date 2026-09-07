import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { image, stylePrompt, iccProfile } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Missing source image' });
    }

    const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;

    if (!HF_TOKEN) {
      return res.status(500).json({ 
        error: 'HF_TOKEN environment variable not set on server. Using client-side neural style fallback.' 
      });
    }

    // Call Hugging Face Style Transfer / Img2Img Model (e.g. runwayml/stable-diffusion-v1-5 or timbrooks/instruct-pix2pix)
    const response = await fetch(
      'https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: image,
          parameters: {
            prompt: `Transform this image into style: ${stylePrompt}`,
            num_inference_steps: 20,
            image_guidance_scale: 1.5,
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
      model: 'timbrooks/instruct-pix2pix',
      status: 'success'
    });
  } catch (error: any) {
    console.error('Style transfer API error:', error);
    return res.status(500).json({ 
      error: error?.message || 'Internal server error during style transfer' 
    });
  }
}
