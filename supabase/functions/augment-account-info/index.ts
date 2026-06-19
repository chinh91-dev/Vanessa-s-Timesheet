import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function scrapeWebsite(url: string): Promise<string | null> {
  if (!firecrawlApiKey) {
    console.log('FIRECRAWL_API_KEY not configured, skipping website scrape');
    return null;
  }

  try {
    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping website with Firecrawl:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: false, // Include footer/header for contact info
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Firecrawl API error:', response.status, JSON.stringify(errorData));
      return null;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown;
    
    if (markdown) {
      console.log('Successfully scraped website, content length:', markdown.length);
      // Truncate to avoid token limits (keep first 25000 chars)
      return markdown.slice(0, 25000);
    }
    
    console.log('No markdown content returned from Firecrawl');
    return null;
  } catch (error) {
    console.error('Error scraping website:', error);
    return null;
  }
}

async function searchCompanyInfo(companyName: string): Promise<string | null> {
  if (!firecrawlApiKey) {
    console.log('FIRECRAWL_API_KEY not configured, skipping web search');
    return null;
  }

  try {
    const query = `${companyName} company headquarters contact information employees revenue annual report`;
    console.log('Searching web for company info:', query);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 5,
        scrapeOptions: { formats: ['markdown'] }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Firecrawl search API error:', response.status, JSON.stringify(errorData));
      return null;
    }

    const data = await response.json();
    console.log('Search returned', data.data?.length || 0, 'results');

    if (data.data && data.data.length > 0) {
      // Combine search results into a single context
      const combinedContent = data.data
        .map((result: any, index: number) => {
          const content = result.markdown || result.content || '';
          const title = result.title || result.url || `Result ${index + 1}`;
          return `=== Source: ${title} ===\n${content}`;
        })
        .join('\n\n---\n\n');
      
      console.log('Combined search content length:', combinedContent.length);
      // Truncate to avoid token limits
      return combinedContent.slice(0, 25000);
    }

    console.log('No search results returned from Firecrawl');
    return null;
  } catch (error) {
    console.error('Error searching for company info:', error);
    return null;
  }
}

// Check if scraped content has key contact information
function hasKeyContactInfo(parsedData: any): boolean {
  const hasPhone = parsedData?.phone && parsedData.phone !== null;
  const hasEmail = parsedData?.email && parsedData.email !== null;
  const hasAddress = parsedData?.billing_address && parsedData.billing_address !== null;
  const hasEmployeeCount = parsedData?.employee_count && parsedData.employee_count !== null;
  const hasRevenue = parsedData?.annual_revenue && parsedData.annual_revenue !== null;
  
  // Consider it complete if we have at least 3 of these 5 key fields
  const fieldsFound = [hasPhone, hasEmail, hasAddress, hasEmployeeCount, hasRevenue].filter(Boolean).length;
  console.log('Key fields found:', fieldsFound, '(phone:', hasPhone, 'email:', hasEmail, 'address:', hasAddress, 'employees:', hasEmployeeCount, 'revenue:', hasRevenue, ')');
  return fieldsFound >= 3;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, website } = await req.json();

    if (!name && !website) {
      return new Response(
        JSON.stringify({ error: 'Either name or website is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TIER 1: Try to scrape the website if provided
    let scrapedContent: string | null = null;
    if (website) {
      scrapedContent = await scrapeWebsite(website);
    }

    // TIER 2: Search for company info if no website or insufficient scraped content
    let searchContent: string | null = null;
    if (name) {
      // Always do web search to supplement data for well-known companies
      searchContent = await searchCompanyInfo(name);
    }

    console.log('Processing company info:', name, website);
    console.log('Has scraped content:', !!scrapedContent, 'Has search content:', !!searchContent);

    // Build prompt based on available content
    let systemPrompt: string;
    let userPrompt: string;

    if (scrapedContent || searchContent) {
      // We have content - use it as the source
      systemPrompt = `You are a business research assistant. Analyze the provided content and extract structured company data.

CRITICAL INSTRUCTIONS:
- Extract information from the provided content
- For phone numbers: look for formats like +61, 1300, 1800, (02), mobile numbers, or international formats
- For email: look for info@, contact@, enquiries@, sales@, or general contact emails
- For addresses: look for physical office locations, headquarters, registered business address
- For annual_revenue and employee_count: Include if mentioned in the content (e.g., "We employ 50+ staff", "$10M revenue", "1.5 million employees")
- For well-known public companies, you may use publicly available information if it's commonly known and verified
- If information is not present, return null for that field

Return a JSON object with the following fields (use null for any field not found):
- industry: string - The industry/sector the company operates in
- description: string - A brief 2-3 sentence description of what the company does
- phone: string - Company's phone number (look in contact sections, footers)
- email: string - Company's contact email
- billing_address: string - Company physical address/headquarters
- shipping_address: string - Shipping/warehouse address if different, otherwise same as billing_address
- employee_count: number - Number of employees if mentioned or commonly known
- annual_revenue: number - Annual revenue in USD if mentioned or commonly known (for public companies)
- segment: string - One of: "enterprise", "mid_market", "small_business", "startup"

IMPORTANT: Return ONLY valid JSON, no markdown or explanation.`;

      let contentSection = '';
      if (scrapedContent) {
        contentSection += `=== WEBSITE CONTENT ===\n${scrapedContent}\n=== END WEBSITE ===\n\n`;
      }
      if (searchContent) {
        contentSection += `=== WEB SEARCH RESULTS ===\n${searchContent}\n=== END SEARCH ===`;
      }

      userPrompt = `Extract company information for: ${name || 'Unknown'}
${website ? `Website: ${website}` : ''}

${contentSection}

Return structured JSON with all available company details. Combine information from website and search results. For well-known companies like Amazon, Google, Microsoft, etc., you may include commonly known public data.`;
    } else {
      // TIER 3: No content available - fall back to AI knowledge
      systemPrompt = `You are a business research assistant. Based on your knowledge, provide structured data about the specified company.

IMPORTANT: 
- For well-known companies (Fortune 500, major tech companies, etc.), provide accurate publicly known information
- For unknown companies, return null for fields you cannot verify
- Do not confuse similarly-named companies

Return a JSON object with the following fields (use null for uncertain fields):
- industry: string - The industry/sector the company operates in
- description: string - A brief 2-3 sentence description of what the company does
- phone: string - Company's main phone number (if known)
- email: string - Company's general contact email (if known)
- billing_address: string - Company headquarters/main address
- shipping_address: string - Shipping/warehouse address if different
- employee_count: number - Number of employees (for public companies, use latest known figures)
- annual_revenue: number - Annual revenue in USD (for public companies, use latest known figures)
- segment: string - One of: "enterprise", "mid_market", "small_business", "startup"

IMPORTANT: Return ONLY valid JSON, no markdown or explanation.`;

      userPrompt = `Provide information about this company:
${name ? `Company Name: ${name}` : ''}
${website ? `Website: ${website}` : ''}

Return the structured JSON with company details. For well-known public companies, include accurate publicly available information like employee count and revenue.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('Payment required - out of credits');
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorData = await response.json().catch(() => ({}));
      console.error('Lovable AI Gateway error:', response.status, JSON.stringify(errorData));
      return new Response(
        JSON.stringify({ error: errorData.error?.message || 'Failed to search for company information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Raw AI response:', content);

    // Parse the JSON response - handle markdown code blocks if present
    let parsedData;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      parsedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Content was:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsed company data:', parsedData);

    return new Response(
      JSON.stringify(parsedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in augment-account-info function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
