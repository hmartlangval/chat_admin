import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

interface AnalyzeRequestBody {
  orderNumber: string;
  parcelAccount: string;
  fullAddress: string; 
  county: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as AnalyzeRequestBody;

    // Validate required fields
    if (!body.orderNumber || !body.fullAddress || !body.county) {
      return res.status(400).json({
        error: 'Missing required fields',
        requiredFields: ['orderNumber', 'fullAddress', 'county']
      });
    }

    const prompt = `Analyze this property information and extract the following details:
    Address: ${body.fullAddress}
    County: ${body.county}
    Parcel/Account: ${body.parcelAccount}
    Order Number: ${body.parcelAccount}

    Format the response as a JSON object with these fields:
    - order_number (generate a random string)
    - s_data containing:
      - x_county (lowercase)
      - x_property_address (full address)
      - x_account_number
      - x_parcel_id
      - x_house_number
      - x_street_name
      - x_city
      - x_zip_code`;
      
    // Call OpenAI API to analyze the address
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });


    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a property data analyzer. Extract and format property details from the given information."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message?.content ?? ""
    let llmResponse:any = {}

    if(content)
        llmResponse = JSON.parse(content)

    // Validate and clean the LLM response
    const cleanedResponse = {
      order_number: body.orderNumber,
      s_data: {
        x_county: (llmResponse.s_data?.x_county || body.county).toLowerCase(),
        x_property_address: llmResponse.s_data?.x_property_address || body.fullAddress,
        x_account_number: llmResponse.s_data?.x_account_number || body.parcelAccount || '',
        x_parcel_id: llmResponse.s_data?.x_parcel_id || '',
        x_house_number: llmResponse.s_data?.x_house_number || '',
        x_street_name: llmResponse.s_data?.x_street_name || '',
        x_city: llmResponse.s_data?.x_city || '',
        x_zip_code: llmResponse.s_data?.x_zip_code || ''
      }
    };

    // Mock analysis response
    const analysisResult = {
      parcelAccount: body.parcelAccount,
      fullAddress: body.fullAddress,
      county: body.county,
      status: 'analyzed',
      timestamp: new Date().toISOString(),
      results: cleanedResponse
    };

    return res.status(200).json(analysisResult);

  } catch (error) {
    console.error('Error analyzing property:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
