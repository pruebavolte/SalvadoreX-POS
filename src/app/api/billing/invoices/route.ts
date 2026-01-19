import { NextRequest, NextResponse } from "next/server";
import { withRBAC, isRBACEnabled } from "@/lib/rbac";
import { getUserIdsInTenant } from "@/lib/rbac/helpers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createFacturamaClient, FacturamaAPIError } from "@/lib/facturama/client";
import { CFDIBuilder, createCFDIBuilder } from "@/lib/facturama/cfdi-builder";
import type { BillingConfig, CreateInvoiceInput, Invoice } from "@/lib/facturama/types";

export async function GET(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['billing:view'],
      requireAll: false,
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { userId, tenantId } = rbacResult;
    const rbacEnabled = isRBACEnabled();

    const userIds = rbacEnabled && tenantId
      ? await getUserIdsInTenant(tenantId)
      : [userId];

    if (userIds.length === 0) {
      return NextResponse.json({ invoices: [] });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = (supabaseAdmin.from('invoices') as any)
      .select('*', { count: 'exact' })
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: invoices, error, count } = await query;

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('[Invoices GET] Table invoices does not exist. Migration required.');
        return NextResponse.json({
          invoices: [],
          total: 0,
          limit,
          offset,
          migrationRequired: true,
          message: 'Billing module not initialized. Please run migration 027_billing_invoicing.sql',
        });
      }
      console.error('[Invoices GET] Error:', error);
      throw error;
    }

    const formattedInvoices: Partial<Invoice>[] = (invoices || []).map((inv: any) => ({
      id: inv.id,
      tenantId: inv.tenant_id,
      userId: inv.user_id,
      orderId: inv.order_id,
      saleId: inv.sale_id,
      receptorRfc: inv.receptor_rfc,
      receptorNombre: inv.receptor_nombre,
      receptorUsoCfdi: inv.receptor_uso_cfdi,
      receptorRegimenFiscal: inv.receptor_regimen_fiscal,
      receptorEmail: inv.receptor_email,
      facturamaId: inv.facturama_id,
      uuidFiscal: inv.uuid_fiscal,
      serie: inv.serie,
      folio: inv.folio,
      subtotal: parseFloat(inv.subtotal),
      totalImpuestos: parseFloat(inv.total_impuestos || '0'),
      total: parseFloat(inv.total),
      moneda: inv.moneda,
      status: inv.status,
      pdfUrl: inv.pdf_url,
      xmlUrl: inv.xml_url,
      cancellationReason: inv.cancellation_reason,
      cancelledAt: inv.cancelled_at ? new Date(inv.cancelled_at) : undefined,
      createdAt: new Date(inv.created_at),
      updatedAt: new Date(inv.updated_at),
    }));

    return NextResponse.json({
      invoices: formattedInvoices,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Invoices GET] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener facturas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['billing:create'],
      requireAll: false,
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { userId, tenantId } = rbacResult;
    const body: CreateInvoiceInput = await request.json();

    const validation = CFDIBuilder.validateCFDIData(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Datos de factura inválidos', details: validation.errors },
        { status: 400 }
      );
    }

    const { data: config, error: configError } = await (supabaseAdmin.from('billing_configs') as any)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (configError) {
      if (configError.code === 'PGRST205') {
        return NextResponse.json(
          { error: 'Módulo de facturación no inicializado. Ejecute la migración 027_billing_invoicing.sql', migrationRequired: true },
          { status: 400 }
        );
      }
      if (configError.code !== 'PGRST116') {
        console.error('[Invoices POST] Config error:', configError);
        throw configError;
      }
    }

    if (!config) {
      return NextResponse.json(
        { error: 'Debe configurar los datos fiscales antes de emitir facturas' },
        { status: 400 }
      );
    }

    if (!config.enabled) {
      return NextResponse.json(
        { error: 'La facturación electrónica no está habilitada' },
        { status: 400 }
      );
    }

    if (!config.csd_uploaded) {
      return NextResponse.json(
        { error: 'Debe subir el CSD antes de emitir facturas' },
        { status: 400 }
      );
    }

    if (body.orderId) {
      const { data: existingInvoice } = await (supabaseAdmin.from('invoices') as any)
        .select('id')
        .eq('order_id', body.orderId)
        .eq('status', 'issued')
        .single();

      if (existingInvoice) {
        return NextResponse.json(
          { error: 'Ya existe una factura emitida para esta orden' },
          { status: 400 }
        );
      }
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
    const cfdiRequest = cfdiBuilder.buildFromInput(body);
    const totals = cfdiBuilder.calculateTotals(cfdiRequest.Items);

    const invoiceData = {
      tenant_id: tenantId || null,
      user_id: userId,
      order_id: body.orderId || null,
      sale_id: body.saleId || null,
      receptor_rfc: body.receptor.rfc.toUpperCase(),
      receptor_nombre: body.receptor.nombre,
      receptor_uso_cfdi: body.receptor.usoCfdi,
      receptor_regimen_fiscal: body.receptor.regimenFiscal,
      receptor_domicilio_fiscal_cp: body.receptor.domicilioFiscalCp,
      receptor_email: body.receptor.email || null,
      subtotal: totals.subtotal,
      total_impuestos: totals.totalImpuestos,
      total: totals.total,
      moneda: 'MXN',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: invoice, error: insertError } = await (supabaseAdmin.from('invoices') as any)
      .insert(invoiceData)
      .select()
      .single();

    if (insertError) {
      console.error('[Invoices POST] Insert error:', insertError);
      throw insertError;
    }

    let facturamaUser: string | null | undefined = config.facturama_user;
    let facturamaPassword: string | null | undefined = config.facturama_password_encrypted
      ? Buffer.from(config.facturama_password_encrypted, 'base64').toString()
      : null;

    if (!facturamaUser || !facturamaPassword) {
      facturamaUser = process.env.FACTURAMA_API_USER;
      facturamaPassword = process.env.FACTURAMA_API_PASSWORD;
    }

    if (!facturamaUser || !facturamaPassword) {
      await (supabaseAdmin.from('invoices') as any)
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', invoice.id);

      return NextResponse.json(
        { error: 'Credenciales de Facturama no configuradas' },
        { status: 400 }
      );
    }

    const facturamaClient = createFacturamaClient(facturamaUser, facturamaPassword);

    try {
      const cfdiResponse = await facturamaClient.createCFDI(cfdiRequest);

      const files = await facturamaClient.getCFDIFiles(cfdiResponse.Id);

      const { error: updateError } = await (supabaseAdmin.from('invoices') as any)
        .update({
          facturama_id: cfdiResponse.Id,
          uuid_fiscal: cfdiResponse.Complement?.TaxStamp?.Uuid,
          serie: cfdiResponse.Serie,
          folio: cfdiResponse.Folio,
          status: 'issued',
          pdf_url: `data:application/pdf;base64,${files.pdf.content}`,
          xml_url: `data:application/xml;base64,${files.xml.content}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      if (updateError) {
        console.error('[Invoices POST] Update error:', updateError);
      }

      if (body.receptor.email) {
        await facturamaClient.sendCFDIByEmail(cfdiResponse.Id, body.receptor.email);
      }

      return NextResponse.json({
        success: true,
        invoice: {
          id: invoice.id,
          facturamaId: cfdiResponse.Id,
          uuid: cfdiResponse.Complement?.TaxStamp?.Uuid,
          serie: cfdiResponse.Serie,
          folio: cfdiResponse.Folio,
          total: totals.total,
          status: 'issued',
        },
        message: 'Factura emitida exitosamente',
      });
    } catch (cfdiError) {
      console.error('[Invoices POST] CFDI creation error:', cfdiError);

      const errorMessage = cfdiError instanceof FacturamaAPIError
        ? cfdiError.message
        : 'Error al crear CFDI en Facturama';

      await (supabaseAdmin.from('invoices') as any)
        .update({
          status: 'error',
          cancellation_reason: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Invoices POST] Error:', error);
    return NextResponse.json(
      { error: 'Error al crear factura' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['billing:cancel'],
      requireAll: false,
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { userId } = rbacResult;
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');
    const motive = searchParams.get('motive') || '02';
    const uuidReplacement = searchParams.get('uuidReplacement');

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la factura' },
        { status: 400 }
      );
    }

    const { data: invoice, error: invoiceError } = await (supabaseAdmin.from('invoices') as any)
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'La factura ya está cancelada' },
        { status: 400 }
      );
    }

    if (invoice.status !== 'issued') {
      return NextResponse.json(
        { error: 'Solo se pueden cancelar facturas emitidas' },
        { status: 400 }
      );
    }

    const { data: config } = await (supabaseAdmin.from('billing_configs') as any)
      .select('*')
      .eq('user_id', userId)
      .single();

    let facturamaUser: string | null | undefined = config?.facturama_user;
    let facturamaPassword: string | null | undefined = config?.facturama_password_encrypted
      ? Buffer.from(config.facturama_password_encrypted, 'base64').toString()
      : null;

    if (!facturamaUser || !facturamaPassword) {
      facturamaUser = process.env.FACTURAMA_API_USER;
      facturamaPassword = process.env.FACTURAMA_API_PASSWORD;
    }

    if (!facturamaUser || !facturamaPassword || !invoice.facturama_id) {
      return NextResponse.json(
        { error: 'No se puede cancelar la factura: configuración incompleta' },
        { status: 400 }
      );
    }

    const facturamaClient = createFacturamaClient(facturamaUser, facturamaPassword);

    try {
      await facturamaClient.cancelCFDI({
        Id: invoice.facturama_id,
        Motive: motive,
        UuidReplacement: uuidReplacement || undefined,
      });

      await (supabaseAdmin.from('invoices') as any)
        .update({
          status: 'cancelled',
          cancellation_reason: `Motivo: ${motive}`,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      return NextResponse.json({
        success: true,
        message: 'Factura cancelada exitosamente',
      });
    } catch (cancelError) {
      console.error('[Invoices DELETE] Cancel error:', cancelError);

      const errorMessage = cancelError instanceof FacturamaAPIError
        ? cancelError.message
        : 'Error al cancelar CFDI en Facturama';

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Invoices DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Error al cancelar factura' },
      { status: 500 }
    );
  }
}
