import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const brevoApiKey = Deno.env.get('BREVO_API_KEY') ?? ''

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const payload = await req.json()
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Registrar log
    await supabase.from('webhook_gg').insert([{ payload }])

    const statusTransacao = (payload.payment?.status ?? payload.status ?? '').toLowerCase()

    if (['approved', 'paid', 'pago', 'aprovado'].includes(statusTransacao)) {
      const userNome = payload.customer?.name ?? payload.client_name ?? payload.name ?? 'Cliente'
      const userEmail = (payload.customer?.email ?? payload.client_email ?? payload.email ?? '').toLowerCase()
      const prodId = payload.product?.id ?? payload.products?.[0]?.id ?? payload.product_id ?? ''
      const prodTitle = (payload.product?.title ?? payload.products?.[0]?.title ?? '').toLowerCase()

      let userPlano = 'completo'
      if (prodTitle.includes('basico') || prodId.toString().toLowerCase().includes('basico')) {
        userPlano = 'basico'
      }

      if (userEmail) {
        await supabase
          .from('usuarios')
          .upsert({ nome: userNome, email: userEmail, plano: userPlano }, { onConflict: 'email' })

        // Enviar email via Brevo
        const emailSubject = 'Seu acesso ao Material Ilustrado de Soja'
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c3e2e; background-color: #f7f9f7; border: 1px solid #b8e2b9; border-radius: 8px; padding: 30px; font-size: 16px; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h2 style="color: #5c3a21; margin: 0; font-size: 24px;">Acesso Confirmado! 🌱</h2>
            </div>
            <p style="font-size: 16px;">Olá, <strong>${userNome}</strong>!</p>
            <p style="font-size: 16px;">Sua compra foi aprovada com sucesso! Seu plano contratado é o <strong>Plano ${userPlano.charAt(0).toUpperCase() + userPlano.slice(1)}</strong>.</p>
            <div style="background-color: #fdf2e9; border-left: 4px solid #d35400; padding: 20px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; font-weight: bold; color: #5c3a21; font-size: 16px;">⚠️ INFORMAÇÃO IMPORTANTE:</p>
              <p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.5;">
                Seu acesso à Área de Membros é realizado <strong>exclusivamente através do seu e-mail de compra</strong>. Não há necessidade de senha!
                <br><br>
                <span style="font-size: 17px; display: block; margin-top: 5px;">
                  <strong>Seu e-mail de acesso:</strong>
                  <span style="background-color: #ffffff; padding: 4px 10px; border: 1px solid #d35400; border-radius: 4px; font-family: monospace; font-weight: bold; color: #5c3a21; font-size: 18px;">${userEmail}</span>
                </span>
              </p>
            </div>
            <p style="text-align: center; margin: 35px 0;">
              <a href="https://www.sojailustrada.hyzencompra.shop/login" target="_blank" style="background-color: #d35400; color: white; text-decoration: none; padding: 16px 32px; font-weight: bold; border-radius: 50px; display: inline-block; box-shadow: 0 4px 10px rgba(211,84,0,0.3); font-size: 17px;">ENTRAR NA ÁREA DE MEMBROS</a>
            </p>
            <p style="font-size: 14px; color: #7d6b5e; text-align: center;">
              Caso o botão acima não funcione, copie e cole o link no seu navegador:<br>
              <a href="https://www.sojailustrada.hyzencompra.shop/login" style="color: #d35400; font-weight: bold;">https://www.sojailustrada.hyzencompra.shop/login</a>
            </p>
            <hr style="border: 0; border-top: 1px solid #e0d4c8; margin: 30px 0;">
            <div style="background-color: #ffe0b2; border-left: 4px solid #f57c00; padding: 15px; margin-bottom: 25px; border-radius: 6px; font-size: 15px; line-height: 1.5;">
              <p style="margin: 0; color: #e65100;"><strong>💡 Precisa de Suporte?</strong> O suporte técnico e de conteúdo é feito <strong>exclusivamente</strong> através do nosso Direct no Instagram: <a href="https://instagram.com/agroilustrado" target="_blank" style="color: #e65100; font-weight: bold; text-decoration: underline;">@agroilustrado</a>.</p>
            </div>
            <p style="font-size: 13px; color: #7d6b5e; text-align: center; margin: 0;">
              Soja Ilustrada · Todos os direitos reservados
            </p>
          </div>
        `

        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'content-type': 'application/json',
            'accept': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'Soja Ilustrada', email: 'contato@sojailustrada.hyzencompra.shop' },
            to: [{ email: userEmail, name: userNome }],
            subject: emailSubject,
            htmlContent: emailHtml
          })
        })
      }
    }

    return new Response(JSON.stringify({ status: 'success' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
