import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createFacturamaClient, FacturamaAPIError } from "@/lib/facturama/client";
import { CFDIBuilder, createCFDIBuilder } from "@/lib/facturama/cfdi-builder";
import type { BillingConfig, InvoiceRequestInput } from "@/lib/facturama/types";
import crypto from "crypto";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_IP = 10;
const TOKEN_SECRET = process.env.INVOICE_REQUEST_SECRET || 'default-secret-change-me';

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

function generateToken(orderId: string, tenantId: string): string {
  const data = `${orderId}:${tenantId}:${Date.now()}`;
  return crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex');
}

function validateToken(token: string, orderId: string, tenantId: string): boolean {
  return token.length === 64;
}

async function checkRateLimit(ip: string, tenantId: string): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  const { count, error } = await (supabaseAdmin.from('invoice_requests') as any)
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('tenant_id', tenantId)
    .gte('created_at', windowStart);

  if (error) {
    console.error('[Rate Limit] Error checking rate limit:', error);
    return { allowed: true, remaining: MAX_REQUESTS_PER_IP };
  }

  const requestCount = count || 0;
  const remaining = Math.max(0, MAX_REQUESTS_PER_IP - requestCount);

  return {
    allowed: requestCount < MAX_REQUESTS_PER_IP,
    remaining,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la orden' },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await (supabaseAdmin
      .from('orders') as any)
      .select('id, user_id, total, currency, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    const { data: userTenant } = await (supabaseAdmin.from('user_tenants') as any)
      .select('tenant_id')
      .eq('user_id', order.user_id)
      .single();

    const tenantId = userTenant?.tenant_id || order.user_id;

    const { data: config } = await (supabaseAdmin.from('billing_configs') as any)
      .select('enabled, allow_public_invoicing, razon_social')
      .eq('user_id', order.user_id)
      .single();

    if (!config || !config.enabled || !config.allow_public_invoicing) {
      return NextResponse.json(
        { error: 'Facturación pública no disponible para este negocio' },
        { status: 403 }
      );
    }

    const { data: existingInvoice } = await (supabaseAdmin.from('invoices') as any)
      .select('id, status, uuid_fiscal, pdf_url')
      .eq('order_id', orderId)
      .eq('status', 'issued')
      .single();

    if (existingInvoice) {
      return NextResponse.json({
        status: 'already_invoiced',
        invoice: {
          id: existingInvoice.id,
          uuid: existingInvoice.uuid_fiscal,
          pdfUrl: existingInvoice.pdf_url,
        },
        message: 'Esta orden ya tiene una factura emitida',
      });
    }

    const { data: pendingRequest } = await (supabaseAdmin.from('invoice_requests') as any)
      .select('id, status, created_at')
      .eq('order_id', orderId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (pendingRequest) {
      return NextResponse.json({
        status: 'pending',
        requestId: pendingRequest.id,
        message: 'Ya existe una solicitud en proceso para esta orden',
      });
    }

    const token = generateToken(orderId, tenantId);

    return NextResponse.json({
      status: 'available',
      order: {
        id: order.id,
        total: order.total,
        currency: order.currency,
      },
      business: {
        name: config.razon_social,
      },
      token,
      message: 'Puede solicitar factura para esta orden',
    });
  } catch (error) {
    console.error('[Invoice Request GET] Error:', error);
    return NextResponse.json(
      { error: 'Error al verificar estado de facturación' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la orden' },
        { status: 400 }
      );
    }

    const body: InvoiceRequestInput = await request.json();

    if (!body.token) {
      return NextResponse.json(
        { error: 'Token de solicitud requerido' },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await (supabaseAdmin
      .from('orders') as any)
      .select(`
        id, 
        user_id, 
        total, 
        currency, 
        status,
        order_items (
          product_name,
          quantity,
          price
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    const { data: userTenant } = await (supabaseAdmin.from('user_tenants') as any)
      .select('tenant_id')
      .eq('user_id', order.user_id)
      .single();

    const tenantId = userTenant?.tenant_id || order.user_id;

    if (!validateToken(body.token, orderId, tenantId)) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 403 }
      );
    }

    const clientIP = getClientIP(request);
    const rateLimit = await checkRateLimit(clientIP, tenantId);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Límite de solicitudes excedido. Intente más tarde.',
          retryAfter: 3600,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '3600',
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const { data: config, error: configError } = await (supabaseAdmin.from('billing_configs') as any)
      .select('*')
      .eq('user_id', order.user_id)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Configuración de facturación no encontrada' },
        { status: 400 }
      );
    }

    if (!config.enabled || !config.allow_public_invoicing) {
      return NextResponse.json(
        { error: 'Facturación pública no disponible' },
        { status: 403 }
      );
    }

    if (!config.csd_uploaded) {
      return NextResponse.json(
        { error: 'El negocio no ha configurado su certificado de facturación' },
        { status: 400 }
      );
    }

    const orderItems = (order as any).order_items || [];
    const validation = CFDIBuilder.validateCFDIData({
      receptor: body.receptor,
      items: orderItems.map((item: { product_name: string; price: number; quantity: number }) => ({
        description: item.product_name,
        unitPrice: item.price,
        quantity: item.quantity,
      })),
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Datos fiscales inválidos', details: validation.errors },
        { status: 400 }
      );
    }

    const requestToken = crypto.randomBytes(32).toString('hex');

    const { data: invoiceRequest, error: insertError } = await (supabaseAdmin.from('invoice_requests') as any)
      .insert({
        order_id: orderId,
        tenant_id: tenantId,
        request_token: requestToken,
        receptor_rfc: body.receptor.rfc.toUpperCase(),
        receptor_nombre: body.receptor.nombre,
        receptor_uso_cfdi: body.receptor.usoCfdi,
        receptor_regimen_fiscal: body.receptor.regimenFiscal,
        receptor_domicilio_fiscal_cp: body.receptor.domicilioFiscalCp,
        receptor_email: body.receptor.email,
        status: 'processing',
        ip_address: clientIP,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Invoice Request POST] Insert error:', insertError);
      throw insertError;
    }

    const billingConfig: BillingConfig = {
      id: config.id,
      tenantId: config.tenant_id,
      userId: config.user_id,
      rfc: config.rfc,
      razonSocial: config.razon_social,
      regimenFiscal: config.regimen_fiscal,
      domicilioFiscalCp: config.domicilio_fiscal_cp,
      csdUploaded: config.csd_uploaded,
      enabled: config.enabled,
      allowPublicInvoicing: config.allow_public_invoicing,
      createdAt: new Date(config.created_at),
      updatedAt: new Date(config.updated_at),
    };

    const cfdiBuilder = createCFDIBuilder(billingConfig);
    const items = orderItems.map((item: { product_name: string; price: number; quantity: number }) => ({
      description: item.product_name,
      unitPrice: item.price,
      quantity: item.quantity,
    }));

    const cfdiRequest = cfdiBuilder.buildFromInput({
      orderId,
      receptor: body.receptor,
      items,
    });

    const totals = cfdiBuilder.calculateTotals(cfdiRequest.Items);

    let facturamaUser: string | null | undefined = config.facturama_user;
    let facturamaPassword: string | null | undefined = config.facturama_password_encrypted
      ? Buffer.from(config.facturama_password_encrypted, 'base64').toString()
      : null;

    if (!facturamaUser || !facturamaPassword) {
      facturamaUser = process.env.FACTURAMA_API_USER;
      facturamaPassword = process.env.FACTURAMA_API_PASSWORD;
    }

    if (!facturamaUser || !facturamaPassword) {
      await (supabaseAdmin.from('invoice_requests') as any)
        .update({
          status: 'error',
          error_message: 'Credenciales de Facturama no configuradas',
        })
        .eq('id', invoiceRequest.id);

      return NextResponse.json(
        { error: 'Configuración de facturación incompleta' },
        { status: 400 }
      );
    }

    const facturamaClient = createFacturamaClient(facturamaUser, facturamaPassword);

    try {
      const cfdiResponse = await facturamaClient.createCFDI(cfdiRequest);
      const files = await facturamaClient.getCFDIFiles(cfdiResponse.Id);

      const { data: invoice, error: invoiceError } = await (supabaseAdmin.from('invoices') as any)
        .insert({
          tenant_id: tenantId,
          user_id: order.user_id,
          order_id: orderId,
          receptor_rfc: body.receptor.rfc.toUpperCase(),
          receptor_nombre: body.receptor.nombre,
          receptor_uso_cfdi: body.receptor.usoCfdi,
          receptor_regimen_fiscal: body.receptor.regimenFiscal,
          receptor_domicilio_fiscal_cp: body.receptor.domicilioFiscalCp,
          receptor_email: body.receptor.email,
          facturama_id: cfdiResponse.Id,
          uuid_fiscal: cfdiResponse.Complement?.TaxStamp?.Uuid,
          serie: cfdiResponse.Serie,
          folio: cfdiResponse.Folio,
          subtotal: totals.subtotal,
          total_impuestos: totals.totalImpuestos,
          total: totals.total,
          moneda: 'MXN',
          status: 'issued',
          pdf_url: `data:application/pdf;base64,${files.pdf.content}`,
          xml_url: `data:application/xml;base64,${files.xml.content}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('[Invoice Request POST] Invoice insert error:', invoiceError);
      }

      await (supabaseAdmin.from('invoice_requests') as any)
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          invoice_id: invoice?.id,
        })
        .eq('id', invoiceRequest.id);

      if (body.receptor.email) {
        await facturamaClient.sendCFDIByEmail(cfdiResponse.Id, body.receptor.email);
      }

      return NextResponse.json({
        success: true,
        invoice: {
          id: invoice?.id,
          uuid: cfdiResponse.Complement?.TaxStamp?.Uuid,
          serie: cfdiResponse.Serie,
          folio: cfdiResponse.Folio,
          total: totals.total,
          pdfUrl: invoice?.pdf_url,
        },
        message: 'Factura emitida exitosamente',
      }, {
        headers: {
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      });
    } catch (cfdiError) {
      console.error('[Invoice Request POST] CFDI error:', cfdiError);

      const errorMessage = cfdiError instanceof FacturamaAPIError
        ? cfdiError.message
        : 'Error al generar la factura';

      await (supabaseAdmin.from('invoice_requests') as any)
        .update({
          status: 'error',
          error_message: errorMessage,
          processed_at: new Date().toISOString(),
        })
        .eq('id', invoiceRequest.id);

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Invoice Request POST] Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar solicitud de factura' },
      { status: 500 }
    );
  }
}
