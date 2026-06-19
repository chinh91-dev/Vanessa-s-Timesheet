import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Verify Webflow webhook signature using timestamp:body format
async function verifyWebflowSignature(rawBody: string, signature: string, timestamp: string, secret: string): Promise<boolean> {
  try {
    // Webflow signs the content as: timestamp:body
    const signedContent = `${timestamp}:${rawBody}`
    
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedContent))
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    console.log('Signed content format: timestamp:body')
    console.log('Timestamp:', timestamp)
    console.log('Computed signature:', computedSignature)
    console.log('Received signature:', signature)
    
    return computedSignature === signature
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

// Send email notification to sales team
async function sendSalesNotification(
  contactData: { id: string; contact_name: string; phone: string | null; email: string | null; source: string; notes: string | null }
) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email notification')
    return
  }

  const resend = new Resend(resendApiKey)

  try {
    const emailResponse = await resend.emails.send({
      from: 'CRM Notifications <crm@comansservices.com.au>',
      to: ['sales@comansservices.com.au'],
      subject: `🚀 New Contact: ${contactData.contact_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hi Team,</h2>
          <p style="color: #666; font-size: 16px;">A new contact just came in from the website!</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Contact Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Name:</td>
                <td style="padding: 8px 0; color: #333;">${contactData.contact_name}</td>
              </tr>
              ${contactData.phone ? `
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Phone:</td>
                <td style="padding: 8px 0; color: #333;">${contactData.phone}</td>
              </tr>
              ` : ''}
              ${contactData.email ? `
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0; color: #333;">${contactData.email}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Source:</td>
                <td style="padding: 8px 0; color: #333;">${contactData.source}</td>
              </tr>
              ${contactData.notes ? `
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Notes:</td>
                <td style="padding: 8px 0; color: #333;">${contactData.notes}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <p style="color: #666;">Don't let this one get away - follow up quickly!</p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This is an automated notification from your CRM system.
          </p>
        </div>
      `,
    })

    console.log('Sales notification email sent to sales@comansservices.com.au:', emailResponse)
  } catch (error) {
    console.error('Failed to send sales notification email:', error)
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('Received Webflow form submission')
    
    // Get the raw body for signature verification
    const rawBody = await req.text()
    console.log('Raw body received:', rawBody)

    // Verify webhook signature if secret is configured
    const webhookSecret = Deno.env.get('WEBFLOW_WEBHOOK_SECRET')
    const receivedSignature = req.headers.get('X-Webflow-Signature') || req.headers.get('x-webflow-signature')
    const timestamp = req.headers.get('X-Webflow-Timestamp') || req.headers.get('x-webflow-timestamp')
    
    if (webhookSecret) {
      if (!receivedSignature || !timestamp) {
        console.error('Missing webhook signature or timestamp header')
        console.log('Received signature header:', receivedSignature)
        console.log('Received timestamp header:', timestamp)
        return new Response(
          JSON.stringify({ error: 'Missing webhook signature or timestamp' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const isValid = await verifyWebflowSignature(rawBody, receivedSignature, timestamp, webhookSecret)
      if (!isValid) {
        console.error('Invalid webhook signature')
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('Webhook signature verified successfully')
    } else {
      console.log('No webhook secret configured, skipping signature verification')
    }

    // Parse the request body - handle both JSON and form-urlencoded
    const contentType = req.headers.get('content-type') || ''
    let formData: Record<string, string> = {}

    if (contentType.includes('application/json')) {
      formData = JSON.parse(rawBody)
      console.log('Parsed JSON data:', JSON.stringify(formData))
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(rawBody)
      params.forEach((value, key) => {
        formData[key] = value
      })
      console.log('Parsed form-urlencoded data:', JSON.stringify(formData))
    } else {
      // Try to parse as JSON anyway
      try {
        formData = JSON.parse(rawBody)
        console.log('Parsed data (no content-type):', JSON.stringify(formData))
      } catch {
        console.error('Failed to parse request body')
        return new Response(
          JSON.stringify({ error: 'Invalid request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Extract fields from form data - handle Webflow's nested structure (payload.data)
    // Webflow sends: { triggerType: "form_submission", payload: { data: { Name: "...", Email: "...", Phone: "..." } } }
    let extractedData = formData
    if (formData.payload && formData.payload.data) {
      extractedData = formData.payload.data
      console.log('Extracted data from payload.data:', JSON.stringify(extractedData))
    }
    
    const name = extractedData.name || extractedData.Name || extractedData['contact-name'] || extractedData.contact_name || ''
    const phone = extractedData.phone || extractedData.Phone || extractedData.tel || extractedData.telephone || ''
    const email = extractedData.email || extractedData.Email || extractedData['e-mail'] || ''

    console.log('Extracted fields - name:', name, 'phone:', phone, 'email:', email)

    // Validate required field
    if (!name || name.trim().length === 0) {
      console.error('Validation failed: name is required')
      return new Response(
        JSON.stringify({ error: 'Name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate input lengths
    if (name.length > 255 || phone.length > 50 || email.length > 255) {
      console.error('Validation failed: field length exceeded')
      return new Response(
        JSON.stringify({ error: 'Field length exceeded maximum allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Insert the contact
    const contactData = {
      contact_name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      company_name: null,
      source: 'Website',
      notes: 'Contact from Comans Digital',
    }

    console.log('Inserting contact:', JSON.stringify(contactData))

    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error.message, error.details)
      return new Response(
        JSON.stringify({ error: 'Failed to create contact', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Contact created successfully:', data.id)

    // Send email notification to sales team in the background
    EdgeRuntime.waitUntil(
      sendSalesNotification({
        id: data.id,
        contact_name: data.contact_name,
        phone: data.phone,
        email: data.email,
        source: 'Website',
        notes: 'Contact from Comans Digital',
      })
    )

    return new Response(
      JSON.stringify({ success: true, contact_id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
