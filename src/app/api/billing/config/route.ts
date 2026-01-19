import { NextRequest, NextResponse } from "next/server";
import { withRBAC } from "@/lib/rbac";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { BillingConfig } from "@/lib/facturama/types";

export async function GET(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['billing:settings'],
      requireAll: false,
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { userId, tenantId } = rbacResult;

    const { data: config, error } = await (supabaseAdmin
      .from('billing_configs') as any)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('[Billing Config GET] Table billing_configs does not exist. Migration required.');
        return NextResponse.json({
          config: null,
          message: 'Billing module not initialized. Please run migration 027_billing_invoicing.sql',
          migrationRequired: true,
        });
      }
      if (error.code !== 'PGRST116') {
        console.error('[Billing Config GET] Error:', error);
        throw error;
      }
    }

    if (!config) {
      return NextResponse.json({
        config: null,
        message: 'No billing configuration found',
      });
    }

    const safeConfig: Partial<BillingConfig> = {
      id: config.id,
      tenantId: config.tenant_id,
      userId: config.user_id,
      rfc: config.rfc,
      razonSocial: config.razon_social,
      regimenFiscal: config.regimen_fiscal,
      domicilioFiscalCp: config.domicilio_fiscal_cp,
      facturamaUser: config.facturama_user,
      csdUploaded: config.csd_uploaded,
      csdCertificateNumber: config.csd_certificate_number,
      csdValidFrom: config.csd_valid_from ? new Date(config.csd_valid_from) : undefined,
      csdValidUntil: config.csd_valid_until ? new Date(config.csd_valid_until) : undefined,
      enabled: config.enabled,
      allowPublicInvoicing: config.allow_public_invoicing,
      createdAt: new Date(config.created_at),
      updatedAt: new Date(config.updated_at),
    };

    return NextResponse.json({ config: safeConfig });
  } catch (error) {
    console.error('[Billing Config GET] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración de facturación' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['billing:settings'],
      requireAll: false,
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { userId, tenantId } = rbacResult;
    const body = await request.json();

    const {
      rfc,
      razonSocial,
      regimenFiscal,
      domicilioFiscalCp,
      facturamaUser,
      facturamaPassword,
      enabled,
      allowPublicInvoicing,
    } = body;

    if (!rfc || !razonSocial || !regimenFiscal || !domicilioFiscalCp) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: rfc, razonSocial, regimenFiscal, domicilioFiscalCp' },
        { status: 400 }
      );
    }

    const rfcPattern = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$/;
    if (!rfcPattern.test(rfc.toUpperCase())) {
      return NextResponse.json(
        { error: 'Formato de RFC inválido' },
        { status: 400 }
      );
    }

    const cpPattern = /^\d{5}$/;
    if (!cpPattern.test(domicilioFiscalCp)) {
      return NextResponse.json(
        { error: 'Código postal debe ser de 5 dígitos' },
        { status: 400 }
      );
    }

    const { data: existingConfig } = await (supabaseAdmin
      .from('billing_configs') as any)
      .select('id')
      .eq('user_id', userId)
      .single();

    const configData = {
      user_id: userId,
      tenant_id: tenantId || null,
      rfc: rfc.toUpperCase(),
      razon_social: razonSocial,
      regimen_fiscal: regimenFiscal,
      domicilio_fiscal_cp: domicilioFiscalCp,
      enabled: enabled ?? false,
      allow_public_invoicing: allowPublicInvoicing ?? true,
      updated_at: new Date().toISOString(),
      ...(facturamaUser ? { facturama_user: facturamaUser } : {}),
      ...(facturamaPassword ? { facturama_password_encrypted: Buffer.from(facturamaPassword).toString('base64') } : {}),
    };

    let result;

    if (existingConfig) {
      const { data, error } = await (supabaseAdmin
        .from('billing_configs') as any)
        .update(configData)
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const insertData = {
        ...configData,
        created_at: new Date().toISOString(),
      };
      
      const { data, error } = await (supabaseAdmin
        .from('billing_configs') as any)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    const safeConfig: Partial<BillingConfig> = {
      id: result.id,
      tenantId: result.tenant_id,
      userId: result.user_id,
      rfc: result.rfc,
      razonSocial: result.razon_social,
      regimenFiscal: result.regimen_fiscal,
      domicilioFiscalCp: result.domicilio_fiscal_cp,
      facturamaUser: result.facturama_user,
      csdUploaded: result.csd_uploaded,
      enabled: result.enabled,
      allowPublicInvoicing: result.allow_public_invoicing,
    };

    return NextResponse.json({
      success: true,
      config: safeConfig,
      message: existingConfig ? 'Configuración actualizada' : 'Configuración creada',
    });
  } catch (error) {
    console.error('[Billing Config POST] Error:', error);
    return NextResponse.json(
      { error: 'Error al guardar configuración de facturación' },
      { status: 500 }
    );
  }
}
