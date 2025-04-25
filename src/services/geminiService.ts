import axios from 'axios';

export const geminiApiRequest = async (base64Image: string) => {
  try {
    const response = await axios.post('https://gemini-api.com/extract', {
      image: base64Image,
      api_key: process.env.GEMINI_API_KEY,
    });

    return {
      image_url: response.data.image_url,
      measure_value: response.data.measure_value,
      measure_uuid: response.data.measure_uuid,
    };
  } catch (error) {
    console.error('Erro ao comunicar com a Gemini API:', error);
    throw new Error('Erro ao comunicar com a Gemini API');
  }
};