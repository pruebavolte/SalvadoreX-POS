import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/factory";
import { randomUUID } from "crypto";

function generateTestData(userId: string) {
  const catIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const prodIds = Array.from({ length: 15 }, () => randomUUID());
  const custIds = Array.from({ length: 5 }, () => randomUUID());
  const saleIds = Array.from({ length: 5 }, () => randomUUID());
  const saleItemIds = Array.from({ length: 10 }, () => randomUUID());
  const timestamp = Date.now();

  const categories = [
    { id: catIds[0], name: "Bebidas", user_id: userId, active: true },
    { id: catIds[1], name: "Comida Rapida", user_id: userId, active: true },
    { id: catIds[2], name: "Postres", user_id: userId, active: true },
    { id: catIds[3], name: "Entradas", user_id: userId, active: true },
    { id: catIds[4], name: "Platos Fuertes", user_id: userId, active: true },
  ];

  const products = [
    { id: prodIds[0], name: "Coca Cola 600ml", price: 25, cost: 12, category_id: catIds[0], user_id: userId, sku: `BEB-001-${timestamp}`, product_type: "simple", stock: 100, min_stock: 10, max_stock: 200, active: true },
    { id: prodIds[1], name: "Agua Natural 500ml", price: 15, cost: 5, category_id: catIds[0], user_id: userId, sku: `BEB-002-${timestamp}`, product_type: "simple", stock: 150, min_stock: 20, max_stock: 300, active: true },
    { id: prodIds[2], name: "Cafe Americano", price: 35, cost: 8, category_id: catIds[0], user_id: userId, sku: `BEB-003-${timestamp}`, product_type: "simple", stock: 50, min_stock: 5, max_stock: 100, active: true },
    { id: prodIds[3], name: "Jugo de Naranja", price: 30, cost: 10, category_id: catIds[0], user_id: userId, sku: `BEB-004-${timestamp}`, product_type: "simple", stock: 40, min_stock: 5, max_stock: 80, active: true },
    { id: prodIds[4], name: "Hamburguesa Clasica", price: 85, cost: 35, category_id: catIds[1], user_id: userId, sku: `COM-001-${timestamp}`, product_type: "simple", stock: 30, min_stock: 5, max_stock: 50, active: true },
    { id: prodIds[5], name: "Hamburguesa Doble", price: 120, cost: 50, category_id: catIds[1], user_id: userId, sku: `COM-002-${timestamp}`, product_type: "simple", stock: 25, min_stock: 5, max_stock: 40, active: true },
    { id: prodIds[6], name: "Hot Dog", price: 45, cost: 15, category_id: catIds[1], user_id: userId, sku: `COM-003-${timestamp}`, product_type: "simple", stock: 35, min_stock: 5, max_stock: 60, active: true },
    { id: prodIds[7], name: "Tacos (3 pzas)", price: 55, cost: 20, category_id: catIds[1], user_id: userId, sku: `COM-004-${timestamp}`, product_type: "simple", stock: 40, min_stock: 5, max_stock: 70, active: true },
    { id: prodIds[8], name: "Papas Fritas", price: 40, cost: 12, category_id: catIds[3], user_id: userId, sku: `ENT-001-${timestamp}`, product_type: "simple", stock: 60, min_stock: 10, max_stock: 100, active: true },
    { id: prodIds[9], name: "Nachos con Queso", price: 65, cost: 25, category_id: catIds[3], user_id: userId, sku: `ENT-002-${timestamp}`, product_type: "simple", stock: 30, min_stock: 5, max_stock: 50, active: true },
    { id: prodIds[10], name: "Alitas BBQ (6 pzas)", price: 95, cost: 40, category_id: catIds[3], user_id: userId, sku: `ENT-003-${timestamp}`, product_type: "simple", stock: 25, min_stock: 5, max_stock: 40, active: true },
    { id: prodIds[11], name: "Pastel de Chocolate", price: 55, cost: 20, category_id: catIds[2], user_id: userId, sku: `POS-001-${timestamp}`, product_type: "simple", stock: 15, min_stock: 3, max_stock: 30, active: true },
    { id: prodIds[12], name: "Helado (2 bolas)", price: 45, cost: 15, category_id: catIds[2], user_id: userId, sku: `POS-002-${timestamp}`, product_type: "simple", stock: 20, min_stock: 5, max_stock: 40, active: true },
    { id: prodIds[13], name: "Filete de Res", price: 185, cost: 80, category_id: catIds[4], user_id: userId, sku: `PLT-001-${timestamp}`, product_type: "simple", stock: 10, min_stock: 2, max_stock: 20, active: true },
    { id: prodIds[14], name: "Pollo a la Plancha", price: 125, cost: 45, category_id: catIds[4], user_id: userId, sku: `PLT-002-${timestamp}`, product_type: "simple", stock: 15, min_stock: 3, max_stock: 25, active: true },
  ];

  const customers = [
    { id: custIds[0], name: "Juan Perez", email: "juan.perez@email.com", phone: "5551234567", user_id: userId },
    { id: custIds[1], name: "Maria Garcia", email: "maria.garcia@email.com", phone: "5559876543", user_id: userId },
    { id: custIds[2], name: "Carlos Lopez", email: "carlos.lopez@email.com", phone: "5552468135", user_id: userId },
    { id: custIds[3], name: "Ana Martinez", email: "ana.martinez@email.com", phone: "5551357924", user_id: userId },
    { id: custIds[4], name: "Roberto Sanchez", email: "roberto.sanchez@email.com", phone: "5558642097", user_id: userId },
  ];

  const sales = [
    { id: saleIds[0], sale_number: `V-${timestamp}-001`, customer_id: custIds[0], user_id: userId, subtotal: 195, discount: 0, tax: 31.2, total: 226.2, payment_method: "cash" as const, status: "completed" as const },
    { id: saleIds[1], sale_number: `V-${timestamp}-002`, customer_id: custIds[1], user_id: userId, subtotal: 310, discount: 10, tax: 48, total: 348, payment_method: "card" as const, status: "completed" as const },
    { id: saleIds[2], sale_number: `V-${timestamp}-003`, customer_id: custIds[2], user_id: userId, subtotal: 85, discount: 0, tax: 13.6, total: 98.6, payment_method: "cash" as const, status: "completed" as const },
    { id: saleIds[3], sale_number: `V-${timestamp}-004`, customer_id: null, user_id: userId, subtotal: 185, discount: 0, tax: 29.6, total: 214.6, payment_method: "cash" as const, status: "completed" as const },
    { id: saleIds[4], sale_number: `V-${timestamp}-005`, customer_id: custIds[3], user_id: userId, subtotal: 420, discount: 20, tax: 64, total: 464, payment_method: "card" as const, status: "completed" as const },
  ];

  const saleItems = [
    { id: saleItemIds[0], sale_id: saleIds[0], product_id: prodIds[4], quantity: 2, unit_price: 85, subtotal: 170 },
    { id: saleItemIds[1], sale_id: saleIds[0], product_id: prodIds[0], quantity: 1, unit_price: 25, subtotal: 25 },
    { id: saleItemIds[2], sale_id: saleIds[1], product_id: prodIds[5], quantity: 2, unit_price: 120, subtotal: 240 },
    { id: saleItemIds[3], sale_id: saleIds[1], product_id: prodIds[8], quantity: 1, unit_price: 40, subtotal: 40 },
    { id: saleItemIds[4], sale_id: saleIds[1], product_id: prodIds[2], quantity: 1, unit_price: 35, subtotal: 35 },
    { id: saleItemIds[5], sale_id: saleIds[2], product_id: prodIds[4], quantity: 1, unit_price: 85, subtotal: 85 },
    { id: saleItemIds[6], sale_id: saleIds[3], product_id: prodIds[13], quantity: 1, unit_price: 185, subtotal: 185 },
    { id: saleItemIds[7], sale_id: saleIds[4], product_id: prodIds[14], quantity: 2, unit_price: 125, subtotal: 250 },
    { id: saleItemIds[8], sale_id: saleIds[4], product_id: prodIds[11], quantity: 2, unit_price: 55, subtotal: 110 },
    { id: saleItemIds[9], sale_id: saleIds[4], product_id: prodIds[3], quantity: 2, unit_price: 30, subtotal: 60 },
  ];

  return { categories, products, customers, sales, saleItems };
}

export async function POST(request: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    if (!isDevelopment) {
      return NextResponse.json({ error: "Solo disponible en desarrollo" }, { status: 403 });
    }

    const supabase = getSupabaseAdmin("secondary");
    const results: { table: string; inserted: number; error?: string }[] = [];

    const { data: existingUsers } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    let userId: string;
    
    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id;
      results.push({ table: "users", inserted: 0, error: "Using existing user: " + userId });
    } else {
      userId = randomUUID();
      const { error: userError } = await supabase.from("users").insert({
        id: userId,
        clerk_id: "dev_clerk_" + Date.now(),
        email: "dev@salvadorex.com",
        first_name: "Usuario",
        last_name: "de Prueba",
        role: "ADMIN",
      });

      if (userError) {
        results.push({ table: "users", inserted: 0, error: userError.message });
        return NextResponse.json({ success: false, error: "Failed to create user", results }, { status: 500 });
      } else {
        results.push({ table: "users", inserted: 1 });
      }
    }

    const testData = generateTestData(userId);

    const { error: catError, data: catData } = await supabase.from("categories").insert(testData.categories).select();
    if (catError) {
      results.push({ table: "categories", inserted: 0, error: catError.message });
    } else {
      results.push({ table: "categories", inserted: catData?.length || 0 });
    }

    const { error: prodError, data: prodData } = await supabase.from("products").insert(testData.products).select();
    if (prodError) {
      results.push({ table: "products", inserted: 0, error: prodError.message });
    } else {
      results.push({ table: "products", inserted: prodData?.length || 0 });
    }

    const { error: custError, data: custData } = await supabase.from("customers").insert(testData.customers).select();
    if (custError) {
      results.push({ table: "customers", inserted: 0, error: custError.message });
    } else {
      results.push({ table: "customers", inserted: custData?.length || 0 });
    }

    const { error: saleError, data: saleData } = await supabase.from("sales").insert(testData.sales).select();
    if (saleError) {
      results.push({ table: "sales", inserted: 0, error: saleError.message });
    } else {
      results.push({ table: "sales", inserted: saleData?.length || 0 });
    }

    const { error: siError, data: siData } = await supabase.from("sale_items").insert(testData.saleItems).select();
    if (siError) {
      results.push({ table: "sale_items", inserted: 0, error: siError.message });
    } else {
      results.push({ table: "sale_items", inserted: siData?.length || 0 });
    }

    const totalInserted = results.reduce((acc, r) => acc + r.inserted, 0);
    const hasErrors = results.some(r => r.error && !r.error.startsWith("Using existing"));

    return NextResponse.json({
      success: !hasErrors || totalInserted > 0,
      message: hasErrors 
        ? `Datos parcialmente creados: ${totalInserted} registros`
        : `Datos de prueba creados exitosamente: ${totalInserted} registros`,
      userId,
      results,
    });
  } catch (error) {
    console.error("[API] Error seeding test data:", error);
    return NextResponse.json(
      { error: "Error al crear datos de prueba", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin("secondary");
  
  const { data: users } = await supabase.from("users").select("id, email, first_name, last_name, role");
  const { count: catCount } = await supabase.from("categories").select("*", { count: "exact", head: true });
  const { count: prodCount } = await supabase.from("products").select("*", { count: "exact", head: true });
  const { count: custCount } = await supabase.from("customers").select("*", { count: "exact", head: true });
  const { count: saleCount } = await supabase.from("sales").select("*", { count: "exact", head: true });
  const { count: siCount } = await supabase.from("sale_items").select("*", { count: "exact", head: true });

  return NextResponse.json({
    message: "Use POST para crear datos de prueba",
    currentData: {
      users: users || [],
      categories: catCount || 0,
      products: prodCount || 0,
      customers: custCount || 0,
      sales: saleCount || 0,
      saleItems: siCount || 0,
    }
  });
}
