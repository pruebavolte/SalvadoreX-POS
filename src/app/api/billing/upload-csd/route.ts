import { NextRequest, NextResponse } from "next/server";
import { withRBAC } from "@/lib/rbac";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createFacturamaClient } from "@/lib/facturama/client";

export async function POST(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['billing:upload_csd'],
      requireAll: false,
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { userId } = rbacResult;

    const { data: config, error: configError } = await (supabaseAdmin.from('billing_configs') as any)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Debe configurar los datos fiscales antes de subir el CSD' },
        { status: 400 }
      );
    }

    let certificateBase64: string;
    let privateKeyBase64: string;
    let password: string;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      certificateBase64 = body.Certificate;
      privateKeyBase64 = body.PrivateKey;
      password = body.PrivateKeyPassword;

      if (!certificateBase64 || !privateKeyBase64 || !password) {
        return NextResponse.json(
          { error: 'Se requieren: Certificate, PrivateKey y PrivateKeyPassword' },
          { status: 400 }
        );
      }
    } else {
      const formData = await request.formData();
      const certificateFile = formData.get('certificate') as File | null;
      const privateKeyFile = formData.get('privateKey') as File | null;
      password = formData.get('password') as string || '';

      if (!certificateFile || !privateKeyFile || !password) {
        return NextResponse.json(
          { error: 'Se requieren: certificate (.cer), privateKey (.key) y password' },
          { status: 400 }
        );
      }

      if (!certificateFile.name.endsWith('.cer')) {
        return NextResponse.json(
          { error: 'El archivo de certificado debe tener extensión .cer' },
          { status: 400 }
        );
      }

      if (!privateKeyFile.name.endsWith('.key')) {
        return NextResponse.json(
          { error: 'El archivo de llave privada debe tener extensión .key' },
          { status: 400 }
        );
      }

      const certificateBuffer = await certificateFile.arrayBuffer();
      const privateKeyBuffer = await privateKeyFile.arrayBuffer();

      certificateBase64 = Buffer.from(certificateBuffer).toString('base64');
      privateKeyBase64 = Buffer.from(privateKeyBuffer).toString('base64');
    }

    const facturamaUser = process.env.FACTURAMA_API_USER;
    const facturamaPassword = process.env.FACTURAMA_API_PASSWORD;

    if (!facturamaUser || !facturamaPassword) {
      return NextResponse.json(
        { error: 'Credenciales de Facturama no configuradas en el servidor' },
        { status: 500 }
      );
    }

    console.log(`[Upload CSD] Using platform credentials for RFC: ${config.rfc}`);
    const facturamaClient = createFacturamaClient(facturamaUser, facturamaPassword);

    const csdResult = await facturamaClient.uploadCSD({
      Certificate: certificateBase64,
      PrivateKey: privateKeyBase64,
      PrivateKeyPassword: password,
      Rfc: config.rfc,
    });

    if (!csdResult.Success) {
      return NextResponse.json(
        { error: csdResult.Message || 'Error al subir CSD a Facturama' },
        { status: 400 }
      );
    }

    const { error: updateError } = await (supabaseAdmin.from('billing_configs') as any)
      .update({
        csd_uploaded: true,
        csd_certificate_number: csdResult.CertificateNumber,
        csd_valid_from: csdResult.ValidFrom,
        csd_valid_until: csdResult.ValidTo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id);

    if (updateError) {
      console.error('[Upload CSD] Error updating config:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'CSD subido exitosamente',
      csd: {
        certificateNumber: csdResult.CertificateNumber,
        validFrom: csdResult.ValidFrom,
        validTo: csdResult.ValidTo,
        rfc: csdResult.Rfc || config.rfc,
      },
    });
  } catch (error) {
    console.error('[Upload CSD] Error:', error);
    return NextResponse.json(
      { error: 'Error al subir certificado CSD' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['billing:upload_csd'],
      requireAll: false,
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { userId } = rbacResult;

    const { data: config, error: configError } = await (supabaseAdmin.from('billing_configs') as any)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Configuración de facturación no encontrada' },
        { status: 404 }
      );
    }

    const facturamaUser = process.env.FACTURAMA_API_USER;
    const facturamaPassword = process.env.FACTURAMA_API_PASSWORD;

    if (facturamaUser && facturamaPassword && config.rfc) {
      console.log(`[Delete CSD] Using platform credentials for RFC: ${config.rfc}`);
      const facturamaClient = createFacturamaClient(facturamaUser, facturamaPassword);
      await facturamaClient.deleteCSD(config.rfc);
    }

    const { error: updateError } = await (supabaseAdmin.from('billing_configs') as any)
      .update({
        csd_uploaded: false,
        csd_certificate_number: null,
        csd_valid_from: null,
        csd_valid_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id);

    if (updateError) {
      console.error('[Delete CSD] Error updating config:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'CSD eliminado exitosamente',
    });
  } catch (error) {
    console.error('[Delete CSD] Error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar certificado CSD' },
      { status: 500 }
    );
  }
}
