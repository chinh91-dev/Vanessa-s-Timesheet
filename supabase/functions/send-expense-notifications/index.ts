import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const requestSchema = z.object({
  type: z.enum(['expense_submitted', 'expense_approved', 'expense_rejected', 'expense_reminder']),
  expenseId: z.string().uuid({ message: 'Invalid expense ID format' }),
  recipientEmail: z.string().email().optional(),
  message: z.string().max(500).optional()
})

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Create authenticated client to verify the user
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      console.error('Authentication failed:', userError?.message)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    console.log('Authenticated user:', user.id)

    // Validate input
    const rawBody = await req.json()
    const parseResult = requestSchema.safeParse(rawBody)
    
    if (!parseResult.success) {
      console.error('Input validation failed:', parseResult.error.errors)
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parseResult.error.errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { type, expenseId, recipientEmail, message } = parseResult.data

    // Create service role client for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch expense details
    const { data: expense, error: expenseError } = await supabaseClient
      .from('expenses')
      .select(`
        *,
        category:expense_categories(name),
        subcategory:expense_subcategories(name),
        user:profiles!expenses_user_id_fkey(full_name, email),
        approver:profiles!expenses_approved_by_fkey(full_name, email)
      `)
      .eq('id', expenseId)
      .single()

    if (expenseError || !expense) {
      console.error('Expense not found:', expenseId)
      return new Response(
        JSON.stringify({ error: 'Expense not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Check authorization: user must own the expense or be an admin
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    const isAdmin = userRoles?.some(r => r.role === 'admin')
    const isOwner = expense.user_id === user.id

    if (!isAdmin && !isOwner) {
      console.error('Access denied: user', user.id, 'is not owner or admin for expense', expenseId)
      return new Response(
        JSON.stringify({ error: 'Access denied: You do not have permission to send notifications for this expense' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    console.log('Authorization passed for user:', user.id, 'isAdmin:', isAdmin, 'isOwner:', isOwner)

    // Use designated admin email for notifications
    const adminEmail = 'HR-Payroll@comansservices.com.au'

    let emailData = {}
    let subject = ''
    let toEmails: string[] = []

    switch (type) {
      case 'expense_submitted':
        subject = `New Expense Submitted - ${expense.user.full_name}`
        toEmails = [adminEmail]
        emailData = {
          subject,
          expense_id: expense.id,
          employee_name: expense.user.full_name,
          expense_amount: new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD'
          }).format(expense.amount),
          expense_category: expense.category?.name || 'Unknown',
          expense_description: expense.description || 'No description',
          expense_date: new Date(expense.expense_date).toLocaleDateString('en-AU'),
          view_url: `${Deno.env.get('APP_BASE_URL')}/expenses`
        }
        break

      case 'expense_approved':
        subject = `Expense Approved - ${expense.category?.name || 'Expense'}`
        toEmails = [expense.user.email].filter(Boolean)
        emailData = {
          subject,
          expense_id: expense.id,
          expense_amount: new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD'
          }).format(expense.amount),
          expense_category: expense.category?.name || 'Unknown',
          expense_description: expense.description || 'No description',
          expense_date: new Date(expense.expense_date).toLocaleDateString('en-AU'),
          approver_name: expense.approver?.full_name || 'Administrator',
          approval_date: new Date(expense.approved_at).toLocaleDateString('en-AU'),
          notes: expense.notes || '',
          view_url: `${Deno.env.get('APP_BASE_URL')}/expenses`
        }
        break

      case 'expense_rejected':
        subject = `Expense Rejected - ${expense.category?.name || 'Expense'}`
        toEmails = [expense.user.email].filter(Boolean)
        emailData = {
          subject,
          expense_id: expense.id,
          expense_amount: new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD'
          }).format(expense.amount),
          expense_category: expense.category?.name || 'Unknown',
          expense_description: expense.description || 'No description',
          expense_date: new Date(expense.expense_date).toLocaleDateString('en-AU'),
          rejection_reason: expense.rejection_reason || 'No reason provided',
          rejector_name: expense.approver?.full_name || 'Administrator',
          notes: expense.notes || '',
          view_url: `${Deno.env.get('APP_BASE_URL')}/expenses`
        }
        break

      case 'expense_reminder':
        if (recipientEmail) {
          toEmails = [recipientEmail]
          subject = 'Pending Expense Approvals Reminder'
          emailData = {
            subject,
            message: message || 'You have pending expense approvals that require your attention.',
            view_url: `${Deno.env.get('APP_BASE_URL')}/expenses`
          }
        }
        break

      default:
        throw new Error('Invalid email type')
    }

    // Send emails using Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('Resend API key not configured')
    }

    // Prepare attachments from expense_attachments table
    const attachments: Array<{ filename: string; content: string; type: string }> = [];
    try {
      const { data: attachmentRows, error: attachmentError } = await supabaseClient
        .from('expense_attachments')
        .select('id, file_name, file_url, file_type')
        .eq('expense_id', expense.id);

      if (attachmentError) {
        console.error('Error fetching expense_attachments:', attachmentError);
      } else if (attachmentRows && attachmentRows.length > 0) {
        for (const row of attachmentRows) {
          try {
            const { data: urlData, error: urlError } = await supabaseClient.storage
              .from('expense-receipts')
              .createSignedUrl(row.file_url, 3600);

            if (urlError || !urlData?.signedUrl) {
              console.error('Error creating signed URL for attachment:', row.file_url, urlError);
              continue;
            }

            const receiptResponse = await fetch(urlData.signedUrl);
            if (!receiptResponse.ok) {
              console.log('Failed to fetch attachment:', row.file_url, receiptResponse.status);
              continue;
            }

            const receiptBuffer = await receiptResponse.arrayBuffer();
            const receiptBytes = new Uint8Array(receiptBuffer);
            let base64Receipt = '';
            const chunkSize = 8192;
            for (let i = 0; i < receiptBytes.length; i += chunkSize) {
              const chunk = receiptBytes.slice(i, i + chunkSize);
              base64Receipt += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
            }

            const fileExtension = row.file_url.split('.').pop()?.toLowerCase() || 'pdf';
            const mimeType = row.file_type || getMimeType(fileExtension);
            attachments.push({
              filename: row.file_name || `receipt-${row.id}.${fileExtension}`,
              content: base64Receipt,
              type: mimeType,
            });
          } catch (innerError) {
            console.error('Error processing single attachment:', innerError);
          }
        }
        console.log(`Prepared ${attachments.length} attachment(s) for expense ${expense.id}`);
      }
    } catch (error) {
      console.error('Error preparing attachments:', error);
    }

    const emailPromises = toEmails.map(email => {
      const emailPayload: any = {
        from: 'HR System <timesheet@comansservices.com.au>',
        to: [email],
        subject,
        html: generateEmailHTML(type, emailData, attachments.length > 0),
      }
      
      // Add attachments if available
      if (attachments.length > 0) {
        emailPayload.attachments = attachments
      }
      
      return fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      })
    })

    const results = await Promise.allSettled(emailPromises)
    const successCount = results.filter(result => result.status === 'fulfilled').length

    console.log('Emails sent:', successCount, 'of', toEmails.length)

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: successCount,
        totalRecipients: toEmails.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending expense notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    )
  }
})

function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'tiff': 'image/tiff',
    'tif': 'image/tiff'
  }
  return mimeTypes[extension] || 'application/octet-stream'
}

function generateEmailHTML(type: string, data: any, hasAttachment: boolean = false): string {
  const baseStyle = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
      .content { padding: 20px 0; }
      .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0; }
      .expense-details { background: #f8f9fa; padding: 16px; border-radius: 4px; margin: 16px 0; }
      .expense-details h3 { margin-top: 0; }
      .footer { border-top: 1px solid #ddd; padding-top: 16px; margin-top: 24px; color: #666; font-size: 14px; }
    </style>
  `

  switch (type) {
    case 'expense_submitted':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>New Expense Submitted</h1>
          </div>
          <div class="content">
            <p>A new expense has been submitted and requires your review.</p>
            
            <div class="expense-details">
              <h3>Expense Details</h3>
              <p><strong>Employee:</strong> ${data.employee_name}</p>
              <p><strong>Amount:</strong> ${data.expense_amount}</p>
              <p><strong>Category:</strong> ${data.expense_category}</p>
              <p><strong>Date:</strong> ${data.expense_date}</p>
              <p><strong>Description:</strong> ${data.expense_description}</p>
              ${hasAttachment ? '<p><strong>📎 Receipt:</strong> Attached to this email</p>' : ''}
            </div>
            
            <a href="${data.view_url}" class="button">Review Expense</a>
          </div>
          <div class="footer">
            <p>This is an automated message from your expense management system.</p>
          </div>
        </div>
      `

    case 'expense_approved':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Expense Approved ✅</h1>
          </div>
          <div class="content">
            <p>Good news! Your expense has been approved.</p>
            
            <div class="expense-details">
              <h3>Expense Details</h3>
              <p><strong>Amount:</strong> ${data.expense_amount}</p>
              <p><strong>Category:</strong> ${data.expense_category}</p>
              <p><strong>Date:</strong> ${data.expense_date}</p>
              <p><strong>Description:</strong> ${data.expense_description}</p>
              <p><strong>Approved by:</strong> ${data.approver_name}</p>
              <p><strong>Approval Date:</strong> ${data.approval_date}</p>
              ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
            </div>
            
            <a href="${data.view_url}" class="button">View Expense</a>
          </div>
          <div class="footer">
            <p>This is an automated message from your expense management system.</p>
          </div>
        </div>
      `

    case 'expense_rejected':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Expense Rejected ❌</h1>
          </div>
          <div class="content">
            <p>Your expense has been rejected. Please review the details below.</p>
            
            <div class="expense-details">
              <h3>Expense Details</h3>
              <p><strong>Amount:</strong> ${data.expense_amount}</p>
              <p><strong>Category:</strong> ${data.expense_category}</p>
              <p><strong>Date:</strong> ${data.expense_date}</p>
              <p><strong>Description:</strong> ${data.expense_description}</p>
              <p><strong>Rejected by:</strong> ${data.rejector_name}</p>
              <p><strong>Reason:</strong> ${data.rejection_reason}</p>
              ${data.notes ? `<p><strong>Additional Notes:</strong> ${data.notes}</p>` : ''}
            </div>
            
            <a href="${data.view_url}" class="button">View Expense</a>
          </div>
          <div class="footer">
            <p>This is an automated message from your expense management system.</p>
          </div>
        </div>
      `

    case 'expense_reminder':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Pending Expense Approvals</h1>
          </div>
          <div class="content">
            <p>${data.message}</p>
            <a href="${data.view_url}" class="button">Review Expenses</a>
          </div>
          <div class="footer">
            <p>This is an automated message from your expense management system.</p>
          </div>
        </div>
      `

    default:
      return '<p>Email content not available</p>'
  }
}
