-- Migration: Insert All Business Verticals (250+)
-- Description: Complete catalog of business types with modules and terminology

-- ============================================
-- HELPER: Get category and module IDs
-- ============================================

-- Create temporary function to insert vertical with config
CREATE OR REPLACE FUNCTION temp_insert_vertical(
  p_category_name TEXT,
  p_name TEXT,
  p_slug TEXT,
  p_display_name TEXT,
  p_display_name_en TEXT,
  p_description TEXT,
  p_icon TEXT,
  p_suggested_system_name TEXT,
  p_suggested_domain_prefix TEXT,
  p_popularity INTEGER,
  p_sort INTEGER,
  -- Terminology
  p_customer_singular TEXT DEFAULT 'Cliente',
  p_customer_plural TEXT DEFAULT 'Clientes',
  p_product_singular TEXT DEFAULT 'Producto',
  p_product_plural TEXT DEFAULT 'Productos',
  p_order_singular TEXT DEFAULT 'Orden',
  p_order_plural TEXT DEFAULT 'Órdenes',
  -- Modules (keys)
  p_required_modules TEXT[] DEFAULT ARRAY['pos', 'inventory', 'customers', 'reports'],
  p_recommended_modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_optional_modules TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID AS $$
DECLARE
  v_category_id UUID;
  v_vertical_id UUID;
  v_module_id UUID;
  v_module_key TEXT;
BEGIN
  -- Get category ID
  SELECT id INTO v_category_id FROM vertical_categories WHERE name = p_category_name;
  
  -- Insert or update vertical
  INSERT INTO verticals (name, slug, display_name, display_name_en, description, icon, category_id, 
    suggested_system_name, suggested_domain_prefix, popularity_score, sort_order, active)
  VALUES (p_name, p_slug, p_display_name, p_display_name_en, p_description, p_icon, v_category_id,
    p_suggested_system_name, p_suggested_domain_prefix, p_popularity, p_sort, true)
  ON CONFLICT (name) DO UPDATE SET
    slug = EXCLUDED.slug,
    display_name = EXCLUDED.display_name,
    display_name_en = EXCLUDED.display_name_en,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category_id = EXCLUDED.category_id,
    suggested_system_name = EXCLUDED.suggested_system_name,
    suggested_domain_prefix = EXCLUDED.suggested_domain_prefix,
    popularity_score = EXCLUDED.popularity_score,
    sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_vertical_id;
  
  -- Insert terminology
  INSERT INTO vertical_terminology (vertical_id, customer_singular, customer_plural, 
    product_singular, product_plural, order_singular, order_plural)
  VALUES (v_vertical_id, p_customer_singular, p_customer_plural, 
    p_product_singular, p_product_plural, p_order_singular, p_order_plural)
  ON CONFLICT (vertical_id) DO UPDATE SET
    customer_singular = EXCLUDED.customer_singular,
    customer_plural = EXCLUDED.customer_plural,
    product_singular = EXCLUDED.product_singular,
    product_plural = EXCLUDED.product_plural,
    order_singular = EXCLUDED.order_singular,
    order_plural = EXCLUDED.order_plural;
  
  -- Insert required modules
  FOREACH v_module_key IN ARRAY p_required_modules
  LOOP
    SELECT id INTO v_module_id FROM system_modules WHERE key = v_module_key;
    IF v_module_id IS NOT NULL THEN
      INSERT INTO vertical_module_configs (vertical_id, module_id, enabled_by_default, is_required, is_recommended)
      VALUES (v_vertical_id, v_module_id, true, true, false)
      ON CONFLICT (vertical_id, module_id) DO UPDATE SET
        enabled_by_default = true, is_required = true;
    END IF;
  END LOOP;
  
  -- Insert recommended modules
  FOREACH v_module_key IN ARRAY p_recommended_modules
  LOOP
    SELECT id INTO v_module_id FROM system_modules WHERE key = v_module_key;
    IF v_module_id IS NOT NULL THEN
      INSERT INTO vertical_module_configs (vertical_id, module_id, enabled_by_default, is_required, is_recommended)
      VALUES (v_vertical_id, v_module_id, true, false, true)
      ON CONFLICT (vertical_id, module_id) DO UPDATE SET
        enabled_by_default = true, is_recommended = true;
    END IF;
  END LOOP;
  
  -- Insert optional modules
  FOREACH v_module_key IN ARRAY p_optional_modules
  LOOP
    SELECT id INTO v_module_id FROM system_modules WHERE key = v_module_key;
    IF v_module_id IS NOT NULL THEN
      INSERT INTO vertical_module_configs (vertical_id, module_id, enabled_by_default, is_required, is_recommended)
      VALUES (v_vertical_id, v_module_id, false, false, false)
      ON CONFLICT (vertical_id, module_id) DO UPDATE SET
        enabled_by_default = false;
    END IF;
  END LOOP;
  
  RETURN v_vertical_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. ABARROTES Y ALIMENTOS (37 giros)
-- ============================================
SELECT temp_insert_vertical('grocery', 'tienda_abarrotes', 'tienda-abarrotes', 'Tienda de Abarrotes', 'Grocery Store', 'Tienda de productos básicos y abarrotes', 'Store', 'AbarrotesPos', 'abarrotes', 100, 1);
SELECT temp_insert_vertical('grocery', 'mini_super', 'mini-super', 'Mini Super', 'Mini Mart', 'Pequeño supermercado de barrio', 'ShoppingCart', 'MiniSuperPos', 'minisuper', 95, 2);
SELECT temp_insert_vertical('grocery', 'supermercado', 'supermercado', 'Supermercado', 'Supermarket', 'Supermercado con múltiples departamentos', 'ShoppingBag', 'SuperPos', 'super', 90, 3, 'Cliente', 'Clientes', 'Producto', 'Productos', 'Compra', 'Compras', ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], ARRAY['loyalty_program', 'suppliers'], ARRAY['delivery', 'online_ordering']);
SELECT temp_insert_vertical('grocery', 'hipermercado', 'hipermercado', 'Hipermercado', 'Hypermarket', 'Gran almacén con todo tipo de productos', 'Building2', 'HiperPos', 'hiper', 70, 4);
SELECT temp_insert_vertical('grocery', 'tienda_conveniencia', 'tienda-conveniencia', 'Tienda de Conveniencia', 'Convenience Store', 'Tienda 24 horas tipo OXXO', 'Clock', 'ConveniencePos', 'tienda24', 85, 5);
SELECT temp_insert_vertical('grocery', 'fruteria', 'fruteria', 'Frutería', 'Fruit Shop', 'Venta de frutas frescas', 'Apple', 'FruteriaPos', 'fruteria', 80, 6, 'Cliente', 'Clientes', 'Fruta', 'Frutas', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['expiry_tracking'], ARRAY['delivery']);
SELECT temp_insert_vertical('grocery', 'verduleria', 'verduleria', 'Verdulería', 'Vegetable Shop', 'Venta de verduras y hortalizas', 'Carrot', 'VerduriaPos', 'verduleria', 78, 7, 'Cliente', 'Clientes', 'Verdura', 'Verduras', 'Venta', 'Ventas');
SELECT temp_insert_vertical('grocery', 'mercado_barrio', 'mercado-barrio', 'Mercado de Barrio', 'Neighborhood Market', 'Mercado tradicional de la comunidad', 'Store', 'MercadoPos', 'mercado', 75, 8);
SELECT temp_insert_vertical('grocery', 'bodega_alimentos', 'bodega-alimentos', 'Bodega de Alimentos', 'Food Warehouse', 'Venta mayorista de alimentos', 'Warehouse', 'BodegaPos', 'bodega', 60, 9);
SELECT temp_insert_vertical('grocery', 'ultramarinos', 'ultramarinos', 'Víveres y Ultramarinos', 'General Store', 'Tienda tradicional de víveres', 'Package', 'ViveresPos', 'viveres', 55, 10);
SELECT temp_insert_vertical('grocery', 'carniceria', 'carniceria', 'Carnicería', 'Butcher Shop', 'Venta de carnes frescas', 'Beef', 'CarnePos', 'carniceria', 85, 11, 'Cliente', 'Clientes', 'Corte', 'Cortes', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['expiry_tracking', 'batch_tracking'], ARRAY['delivery']);
SELECT temp_insert_vertical('grocery', 'polleria', 'polleria', 'Pollería', 'Poultry Shop', 'Venta de pollo y aves', 'Bird', 'PolleriaPos', 'polleria', 80, 12);
SELECT temp_insert_vertical('grocery', 'pescaderia', 'pescaderia', 'Pescadería', 'Fish Market', 'Venta de pescados y mariscos frescos', 'Fish', 'PescaderiaPos', 'pescaderia', 75, 13);
SELECT temp_insert_vertical('grocery', 'cremeria', 'cremeria', 'Cremería', 'Dairy Shop', 'Venta de lácteos y quesos', 'Milk', 'CremeriaPos', 'cremeria', 70, 14);
SELECT temp_insert_vertical('grocery', 'salchichoneria', 'salchichoneria', 'Salchichonería', 'Deli', 'Embutidos y carnes frías', 'Ham', 'SalchichoneriaPos', 'salchichoneria', 65, 15);
SELECT temp_insert_vertical('grocery', 'tortilleria', 'tortilleria', 'Tortillería', 'Tortilla Shop', 'Elaboración y venta de tortillas', 'Circle', 'TortillaPos', 'tortilleria', 90, 16);
SELECT temp_insert_vertical('grocery', 'panaderia', 'panaderia', 'Panadería', 'Bakery', 'Pan y productos de panadería', 'Croissant', 'PanaderiaPos', 'panaderia', 88, 17, 'Cliente', 'Clientes', 'Pan', 'Panes', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['ingredients', 'expiry_tracking'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('grocery', 'pasteleria', 'pasteleria', 'Pastelería', 'Pastry Shop', 'Pasteles y repostería fina', 'Cake', 'PasteleriaPos', 'pasteleria', 85, 18, 'Cliente', 'Clientes', 'Pastel', 'Pasteles', 'Pedido', 'Pedidos', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['ingredients', 'reservations'], ARRAY['online_ordering', 'delivery']);
SELECT temp_insert_vertical('grocery', 'reposteria', 'reposteria', 'Repostería', 'Confectionery', 'Postres y dulces artesanales', 'Cookie', 'ReposteriaPos', 'reposteria', 80, 19);
SELECT temp_insert_vertical('grocery', 'dulceria', 'dulceria', 'Dulcería', 'Candy Store', 'Dulces, chocolates y golosinas', 'Candy', 'DulceriaPos', 'dulceria', 75, 20);
SELECT temp_insert_vertical('grocery', 'dulces_granel', 'dulces-granel', 'Dulces a Granel', 'Bulk Candy', 'Distribución de dulces por mayoreo', 'Package', 'DulcesGranelPos', 'dulcesgranel', 60, 21);
SELECT temp_insert_vertical('grocery', 'tienda_naturista', 'tienda-naturista', 'Tienda Naturista', 'Health Food Store', 'Productos naturales y suplementos', 'Leaf', 'NaturistaPos', 'naturista', 70, 22);
SELECT temp_insert_vertical('grocery', 'tienda_vegana', 'tienda-vegana', 'Tienda Vegana', 'Vegan Store', 'Productos 100% veganos', 'Vegan', 'VeganoPos', 'vegano', 65, 23);
SELECT temp_insert_vertical('grocery', 'sin_gluten', 'sin-gluten', 'Productos Sin Gluten', 'Gluten-Free Store', 'Especialidad en productos sin gluten', 'Wheat', 'SinGlutenPos', 'singluten', 55, 24);
SELECT temp_insert_vertical('grocery', 'organicos', 'organicos', 'Productos Orgánicos', 'Organic Store', 'Alimentos orgánicos certificados', 'Sprout', 'OrganicPos', 'organico', 60, 25);
SELECT temp_insert_vertical('grocery', 'semillas_granos', 'semillas-granos', 'Semillas y Granos', 'Seeds & Grains', 'Venta de semillas, granos y cereales', 'Wheat', 'SemillasPos', 'semillas', 50, 26);
SELECT temp_insert_vertical('grocery', 'especias', 'especias', 'Tienda de Especias', 'Spice Shop', 'Especias, condimentos y hierbas', 'Flame', 'EspeciasPos', 'especias', 55, 27);
SELECT temp_insert_vertical('grocery', 'tienda_gourmet', 'tienda-gourmet', 'Tienda Gourmet', 'Gourmet Store', 'Productos gourmet y delicatessen', 'Star', 'GourmetPos', 'gourmet', 65, 28);
SELECT temp_insert_vertical('grocery', 'cafe_grano', 'cafe-grano', 'Tienda de Café en Grano', 'Coffee Bean Shop', 'Café de especialidad y granos selectos', 'Coffee', 'CafeGranoPos', 'cafegrano', 70, 29);
SELECT temp_insert_vertical('grocery', 'tes_infusiones', 'tes-infusiones', 'Tés e Infusiones', 'Tea Shop', 'Tés, infusiones y accesorios', 'CupSoda', 'TePos', 'tiendadete', 55, 30);
SELECT temp_insert_vertical('grocery', 'productos_importados', 'productos-importados', 'Productos Importados', 'Import Store', 'Bodega de productos internacionales', 'Globe', 'ImportadosPos', 'importados', 50, 31);
SELECT temp_insert_vertical('grocery', 'congelados', 'congelados', 'Tienda de Congelados', 'Frozen Food Store', 'Alimentos congelados y hielo', 'Snowflake', 'CongeladosPos', 'congelados', 55, 32);
SELECT temp_insert_vertical('grocery', 'huevos_lacteos', 'huevos-lacteos', 'Huevos y Lácteos', 'Eggs & Dairy', 'Venta especializada en lácteos y huevos', 'Egg', 'LacteosPos', 'lacteos', 60, 33);
SELECT temp_insert_vertical('grocery', 'miel_derivados', 'miel-derivados', 'Miel y Derivados', 'Honey Shop', 'Miel, polen y productos apícolas', 'Hexagon', 'MielPos', 'miel', 45, 34);
SELECT temp_insert_vertical('grocery', 'abarrotes_mayoreo', 'abarrotes-mayoreo', 'Abarrotes Mayoristas', 'Wholesale Grocery', 'Venta de abarrotes al mayoreo', 'Boxes', 'MayoreoPos', 'mayoreo', 65, 35);
SELECT temp_insert_vertical('grocery', 'snacks_saludables', 'snacks-saludables', 'Snacks Saludables', 'Healthy Snacks', 'Botanas y snacks nutritivos', 'Apple', 'SnacksPos', 'snackssanos', 50, 36);
SELECT temp_insert_vertical('grocery', 'productos_diabeticos', 'productos-diabeticos', 'Productos para Diabéticos', 'Diabetic Products', 'Productos especiales sin azúcar', 'Heart', 'DiabeticosPos', 'diabeticos', 45, 37);

-- ============================================
-- 2. BEBIDAS, VINOS Y TABACO (11 giros)
-- ============================================
SELECT temp_insert_vertical('beverages', 'vinateria', 'vinateria', 'Vinatería', 'Wine Shop', 'Venta de vinos y licores', 'Wine', 'VinateriaPos', 'vinateria', 80, 1, 'Cliente', 'Clientes', 'Botella', 'Botellas', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['age_verification', 'loyalty_program'], ARRAY['delivery']);
SELECT temp_insert_vertical('beverages', 'licoreria', 'licoreria', 'Licorería', 'Liquor Store', 'Venta de licores y destilados', 'GlassWater', 'LicoreriaPos', 'licoreria', 85, 2);
SELECT temp_insert_vertical('beverages', 'cerveza_artesanal', 'cerveza-artesanal', 'Cerveza Artesanal', 'Craft Beer Shop', 'Cervecería artesanal y local', 'Beer', 'CervezaPos', 'cervezaartesanal', 75, 3);
SELECT temp_insert_vertical('beverages', 'distribuidor_vinos', 'distribuidor-vinos', 'Distribuidor de Vinos', 'Wine Distributor', 'Distribución mayorista de vinos', 'Truck', 'VinosDistPos', 'vinosdist', 60, 4);
SELECT temp_insert_vertical('beverages', 'mezcaleria', 'mezcaleria', 'Mezcalería', 'Mezcal Shop', 'Especialidad en mezcales artesanales', 'Flask', 'MezcalPos', 'mezcaleria', 70, 5);
SELECT temp_insert_vertical('beverages', 'vinos_premium', 'vinos-premium', 'Boutique de Vinos Premium', 'Premium Wine Boutique', 'Vinos de alta gama y colección', 'Crown', 'VinosPremiumPos', 'vinospremium', 55, 6);
SELECT temp_insert_vertical('beverages', 'whisky', 'whisky', 'Tienda de Whisky', 'Whisky Shop', 'Especialidad en whiskys del mundo', 'GlassWater', 'WhiskyPos', 'whisky', 50, 7);
SELECT temp_insert_vertical('beverages', 'cigarreria', 'cigarreria', 'Cigarrería', 'Tobacco Shop', 'Venta de cigarros y tabaco', 'Cigarette', 'CigarreriaPos', 'cigarreria', 65, 8);
SELECT temp_insert_vertical('beverages', 'puros', 'puros', 'Tienda de Puros', 'Cigar Shop', 'Puros y accesorios premium', 'Flame', 'PurosPos', 'puros', 50, 9);
SELECT temp_insert_vertical('beverages', 'vape_shop', 'vape-shop', 'Vape Shop', 'Vape Shop', 'Cigarros electrónicos y líquidos', 'Cloud', 'VapePos', 'vapeshop', 70, 10);
SELECT temp_insert_vertical('beverages', 'hookah', 'hookah', 'Hookah / Shisha', 'Hookah Shop', 'Accesorios y tabaco para hookah', 'Droplets', 'HookahPos', 'hookah', 45, 11);

-- ============================================
-- 3. RESTAURANTES Y COMIDA (34 giros)
-- ============================================
SELECT temp_insert_vertical('restaurants', 'restaurante', 'restaurante', 'Restaurante', 'Restaurant', 'Restaurante de servicio completo', 'UtensilsCrossed', 'RestaurantePos', 'restaurante', 100, 1, 'Comensal', 'Comensales', 'Platillo', 'Platillos', 'Orden', 'Órdenes', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['digital_menu', 'table_management', 'kitchen_display', 'ingredients', 'reservations'], ARRAY['voice_ordering', 'delivery', 'online_ordering']);
SELECT temp_insert_vertical('restaurants', 'taqueria', 'taqueria', 'Taquería', 'Taco Shop', 'Tacos y antojitos mexicanos', 'Beef', 'TaqueriaPos', 'taqueria', 95, 2, 'Cliente', 'Clientes', 'Taco', 'Tacos', 'Orden', 'Órdenes');
SELECT temp_insert_vertical('restaurants', 'torteria', 'torteria', 'Tortería', 'Sandwich Shop', 'Tortas y sandwiches', 'Sandwich', 'TorteriaPos', 'torteria', 80, 3);
SELECT temp_insert_vertical('restaurants', 'loncheria', 'loncheria', 'Lonchería', 'Lunch Counter', 'Comida casera y económica', 'Soup', 'LoncheriaPos', 'loncheria', 75, 4);
SELECT temp_insert_vertical('restaurants', 'comida_rapida', 'comida-rapida', 'Comida Rápida', 'Fast Food', 'Servicio rápido de alimentos', 'Zap', 'FastFoodPos', 'comidarapida', 90, 5, 'Cliente', 'Clientes', 'Combo', 'Combos', 'Orden', 'Órdenes', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['kitchen_display', 'queue_management'], ARRAY['delivery', 'online_ordering']);
SELECT temp_insert_vertical('restaurants', 'cafeteria', 'cafeteria', 'Cafetería', 'Coffee Shop', 'Café y bebidas calientes', 'Coffee', 'CafePos', 'cafeteria', 95, 6, 'Cliente', 'Clientes', 'Bebida', 'Bebidas', 'Orden', 'Órdenes', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['loyalty_program', 'digital_menu'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('restaurants', 'heladeria', 'heladeria', 'Heladería', 'Ice Cream Shop', 'Helados y postres fríos', 'IceCream', 'HeladeriaPos', 'heladeria', 85, 7);
SELECT temp_insert_vertical('restaurants', 'paleteria', 'paleteria', 'Paletería', 'Popsicle Shop', 'Paletas y nieves artesanales', 'Popsicle', 'PaleteriaPos', 'paleteria', 75, 8);
SELECT temp_insert_vertical('restaurants', 'smoothie_bar', 'smoothie-bar', 'Smoothie Bar', 'Smoothie Bar', 'Smoothies y bebidas saludables', 'Glass', 'SmoothiePos', 'smoothiebar', 70, 9);
SELECT temp_insert_vertical('restaurants', 'jugueria', 'jugueria', 'Juguería', 'Juice Bar', 'Jugos naturales y licuados', 'Apple', 'JugueriaPos', 'jugueria', 75, 10);
SELECT temp_insert_vertical('restaurants', 'bar_ensaladas', 'bar-ensaladas', 'Bar de Ensaladas', 'Salad Bar', 'Ensaladas frescas y saludables', 'Salad', 'EnsaladasPos', 'ensaladas', 65, 11);
SELECT temp_insert_vertical('restaurants', 'buffet', 'buffet', 'Restaurante Buffet', 'Buffet Restaurant', 'Servicio de buffet libre', 'UtensilsCrossed', 'BuffetPos', 'buffet', 70, 12);
SELECT temp_insert_vertical('restaurants', 'cocina_economica', 'cocina-economica', 'Cocina Económica', 'Budget Kitchen', 'Comida corrida y económica', 'Utensils', 'CocinaEcoPos', 'cocinaeco', 80, 13);
SELECT temp_insert_vertical('restaurants', 'marisqueria', 'marisqueria', 'Marisquería', 'Seafood Restaurant', 'Mariscos y pescados frescos', 'Fish', 'MarisqueriaPos', 'marisqueria', 80, 14);
SELECT temp_insert_vertical('restaurants', 'pizzeria', 'pizzeria', 'Pizzería', 'Pizzeria', 'Pizzas artesanales', 'Pizza', 'PizzeriaPos', 'pizzeria', 90, 15, 'Cliente', 'Clientes', 'Pizza', 'Pizzas', 'Orden', 'Órdenes', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['delivery', 'online_ordering', 'ingredients'], ARRAY['voice_ordering']);
SELECT temp_insert_vertical('restaurants', 'hamburgueseria', 'hamburgueseria', 'Hamburguesería', 'Burger Joint', 'Hamburguesas gourmet', 'Hamburger', 'BurgerPos', 'burgers', 88, 16);
SELECT temp_insert_vertical('restaurants', 'alitas', 'alitas', 'Alitas y Boneless', 'Wings Shop', 'Alitas de pollo y boneless', 'Drumstick', 'AlitasPos', 'alitas', 75, 17);
SELECT temp_insert_vertical('restaurants', 'sushi', 'sushi', 'Sushi Bar', 'Sushi Bar', 'Sushi y comida japonesa', 'Fish', 'SushiPos', 'sushi', 85, 18);
SELECT temp_insert_vertical('restaurants', 'comida_china', 'comida-china', 'Comida China', 'Chinese Restaurant', 'Comida china tradicional', 'Soup', 'ChinaPos', 'comidachina', 80, 19);
SELECT temp_insert_vertical('restaurants', 'comida_italiana', 'comida-italiana', 'Comida Italiana', 'Italian Restaurant', 'Pastas y cocina italiana', 'Wheat', 'ItalianoPos', 'italiano', 75, 20);
SELECT temp_insert_vertical('restaurants', 'food_truck', 'food-truck', 'Food Truck', 'Food Truck', 'Cocina móvil sobre ruedas', 'Truck', 'FoodTruckPos', 'foodtruck', 80, 21, 'Cliente', 'Clientes', 'Platillo', 'Platillos', 'Orden', 'Órdenes', ARRAY['pos', 'inventory', 'reports'], ARRAY['digital_menu', 'queue_management'], ARRAY[]::TEXT[]);
SELECT temp_insert_vertical('restaurants', 'restaurante_fusion', 'restaurante-fusion', 'Restaurante Fusión', 'Fusion Restaurant', 'Cocina de fusión internacional', 'Sparkles', 'FusionPos', 'fusion', 65, 22);
SELECT temp_insert_vertical('restaurants', 'gelateria', 'gelateria', 'Gelatería', 'Gelato Shop', 'Gelato italiano artesanal', 'IceCream', 'GelateriaPos', 'gelateria', 70, 23);
SELECT temp_insert_vertical('restaurants', 'chocolateria', 'chocolateria', 'Chocolatería Gourmet', 'Chocolate Shop', 'Chocolates artesanales y postres', 'Cookie', 'ChocolateriaPos', 'chocolateria', 65, 24);
SELECT temp_insert_vertical('restaurants', 'creperia', 'creperia', 'Crepería', 'Creperie', 'Crepas dulces y saladas', 'Circle', 'CreperiaPos', 'creperia', 70, 25);
SELECT temp_insert_vertical('restaurants', 'waffles', 'waffles', 'Waffles Shop', 'Waffle Shop', 'Waffles y toppings', 'Grid', 'WafflesPos', 'waffles', 65, 26);
SELECT temp_insert_vertical('restaurants', 'rotisserie', 'rotisserie', 'Rotisserie', 'Rotisserie', 'Pollo rostizado y preparados', 'Flame', 'RotisseriePos', 'rotisserie', 70, 27);
SELECT temp_insert_vertical('restaurants', 'pupuseria', 'pupuseria', 'Pupusería', 'Pupuseria', 'Pupusas salvadoreñas', 'Circle', 'PupuseriaPos', 'pupuseria', 50, 28);
SELECT temp_insert_vertical('restaurants', 'areperia', 'areperia', 'Arepería', 'Arepa Shop', 'Arepas venezolanas', 'Circle', 'AreperiaPos', 'areperia', 50, 29);
SELECT temp_insert_vertical('restaurants', 'tamaleria', 'tamaleria', 'Tamalería', 'Tamale Shop', 'Tamales tradicionales', 'Package', 'TamaleriaPos', 'tamaleria', 60, 30);
SELECT temp_insert_vertical('restaurants', 'gorditas', 'gorditas', 'Gorditas Shop', 'Gorditas Shop', 'Gorditas y antojitos', 'Circle', 'GorditasPos', 'gorditas', 55, 31);
SELECT temp_insert_vertical('restaurants', 'antojitos', 'antojitos', 'Antojitos Mexicanos', 'Mexican Snacks', 'Antojitos y comida típica', 'Star', 'AntojitosPos', 'antojitos', 70, 32);
SELECT temp_insert_vertical('restaurants', 'bar_tapas', 'bar-tapas', 'Bar de Tapas', 'Tapas Bar', 'Tapas españolas y vinos', 'Wine', 'TapasPos', 'tapas', 60, 33);
SELECT temp_insert_vertical('restaurants', 'panaderia_cafeteria', 'panaderia-cafeteria', 'Panadería-Cafetería', 'Bakery Cafe', 'Panadería con servicio de café', 'Croissant', 'BakeryCafePos', 'bakerycafe', 80, 34);

-- ============================================
-- 4. MODA Y ACCESORIOS (22 giros)
-- ============================================
SELECT temp_insert_vertical('fashion', 'boutique_mujer', 'boutique-mujer', 'Boutique de Mujer', 'Women Boutique', 'Ropa y accesorios para dama', 'Shirt', 'BoutiqueMujerPos', 'boutiquemujer', 90, 1, 'Clienta', 'Clientas', 'Prenda', 'Prendas', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['product_variants', 'loyalty_program'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('fashion', 'boutique_hombre', 'boutique-hombre', 'Boutique de Hombre', 'Men Boutique', 'Ropa y accesorios para caballero', 'Shirt', 'BoutiqueHombrePos', 'boutiquehombre', 85, 2);
SELECT temp_insert_vertical('fashion', 'ropa_bebes', 'ropa-bebes', 'Ropa para Bebés', 'Baby Clothes', 'Ropa y accesorios infantiles', 'Baby', 'RopaBebesPos', 'ropabebes', 75, 3);
SELECT temp_insert_vertical('fashion', 'ropa_infantil', 'ropa-infantil', 'Ropa Infantil', 'Kids Clothing', 'Moda para niños y niñas', 'Shirt', 'RopaKidsPos', 'ropakids', 80, 4);
SELECT temp_insert_vertical('fashion', 'ropa_juvenil', 'ropa-juvenil', 'Ropa Juvenil', 'Teen Fashion', 'Moda para adolescentes', 'Shirt', 'RopaJuvenilPos', 'ropajuvenil', 75, 5);
SELECT temp_insert_vertical('fashion', 'ropa_urbana', 'ropa-urbana', 'Ropa Urbana', 'Urban Wear', 'Streetwear y moda urbana', 'Shirt', 'UrbanWearPos', 'urbanwear', 80, 6);
SELECT temp_insert_vertical('fashion', 'ropa_deportiva', 'ropa-deportiva', 'Ropa Deportiva', 'Sportswear', 'Ropa y accesorios deportivos', 'Shirt', 'SportwearPos', 'sportwear', 85, 7);
SELECT temp_insert_vertical('fashion', 'trajes', 'trajes', 'Tienda de Trajes', 'Suit Shop', 'Trajes formales y sastrería', 'Shirt', 'TrajesPos', 'trajes', 65, 8, 'Cliente', 'Clientes', 'Traje', 'Trajes', 'Venta', 'Ventas');
SELECT temp_insert_vertical('fashion', 'vestidos_noche', 'vestidos-noche', 'Vestidos de Noche', 'Evening Dresses', 'Vestidos de gala y ocasiones especiales', 'Sparkle', 'VestidosPos', 'vestidos', 60, 9);
SELECT temp_insert_vertical('fashion', 'boutique_novias', 'boutique-novias', 'Boutique de Novias', 'Bridal Shop', 'Vestidos de novia y accesorios', 'Heart', 'NoviasPos', 'novias', 55, 10, 'Novia', 'Novias', 'Vestido', 'Vestidos', 'Pedido', 'Pedidos', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'reservations'], ARRAY[]::TEXT[]);
SELECT temp_insert_vertical('fashion', 'xv_anos', 'xv-anos', 'Boutique XV Años', 'Quinceañera Shop', 'Vestidos y accesorios para XV años', 'Crown', 'XVPos', 'xvanos', 60, 11);
SELECT temp_insert_vertical('fashion', 'trajes_tipicos', 'trajes-tipicos', 'Trajes Típicos', 'Traditional Clothing', 'Ropa tradicional y regional', 'Shirt', 'TipicoPos', 'trajetipico', 45, 12);
SELECT temp_insert_vertical('fashion', 'ropa_interior', 'ropa-interior', 'Ropa Interior', 'Underwear', 'Ropa interior masculina y femenina', 'Shirt', 'InteriorPos', 'ropainterior', 70, 13);
SELECT temp_insert_vertical('fashion', 'lenceria', 'lenceria', 'Lencería', 'Lingerie', 'Lencería fina y ropa de dormir', 'Heart', 'LenceriaPos', 'lenceria', 65, 14);
SELECT temp_insert_vertical('fashion', 'calcetines_medias', 'calcetines-medias', 'Calcetas y Medias', 'Socks & Hosiery', 'Calcetines, medias y accesorios', 'Footprints', 'CalcetasPos', 'calcetas', 50, 15);
SELECT temp_insert_vertical('fashion', 'second_hand', 'second-hand', 'Ropa Usada', 'Second Hand', 'Boutique de ropa de segunda mano', 'Recycle', 'SecondHandPos', 'secondhand', 65, 16);
SELECT temp_insert_vertical('fashion', 'vintage', 'vintage', 'Vintage Store', 'Vintage Store', 'Ropa y accesorios vintage', 'Clock', 'VintagePos', 'vintage', 60, 17);
SELECT temp_insert_vertical('fashion', 'zapateria', 'zapateria', 'Zapatería', 'Shoe Store', 'Calzado para toda la familia', 'Footprints', 'ZapateriaPos', 'zapateria', 85, 18, 'Cliente', 'Clientes', 'Par', 'Pares', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['product_variants'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('fashion', 'bolsos_carteras', 'bolsos-carteras', 'Bolsos y Carteras', 'Bags & Wallets', 'Bolsos, carteras y maletines', 'ShoppingBag', 'BolsosPos', 'bolsos', 70, 19);
SELECT temp_insert_vertical('fashion', 'accesorios_moda', 'accesorios-moda', 'Accesorios de Moda', 'Fashion Accessories', 'Joyería, bisutería y accesorios', 'Gem', 'AccesoriosPos', 'accesoriosmoda', 75, 20);
SELECT temp_insert_vertical('fashion', 'sombreros_gorras', 'sombreros-gorras', 'Sombreros y Gorras', 'Hats & Caps', 'Bufandas, gorras y sombreros', 'Crown', 'SombrerosPos', 'sombreros', 55, 21);
SELECT temp_insert_vertical('fashion', 'lentes_sol', 'lentes-sol', 'Lentes de Sol', 'Sunglasses', 'Lentes de sol y óptica fashion', 'Sun', 'LentesPos', 'lentessol', 65, 22);

-- ============================================
-- 5. TECNOLOGÍA Y ELECTRÓNICA (15 giros)
-- ============================================
SELECT temp_insert_vertical('technology', 'celulares', 'celulares', 'Tienda de Celulares', 'Cell Phone Store', 'Venta de smartphones y accesorios', 'Smartphone', 'CelularesPos', 'celulares', 95, 1, 'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['serial_numbers', 'product_variants'], ARRAY['appointments']);
SELECT temp_insert_vertical('technology', 'accesorios_celular', 'accesorios-celular', 'Accesorios para Celular', 'Phone Accessories', 'Fundas, cargadores y accesorios', 'Cable', 'AccesoriosCelPos', 'accesorioscel', 85, 2);
SELECT temp_insert_vertical('technology', 'reparacion_celulares', 'reparacion-celulares', 'Reparación de Celulares', 'Phone Repair', 'Servicio técnico de celulares', 'Wrench', 'ReparacionCelPos', 'reparacioncel', 80, 3, 'Cliente', 'Clientes', 'Reparación', 'Reparaciones', 'Servicio', 'Servicios', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'serial_numbers'], ARRAY[]::TEXT[]);
SELECT temp_insert_vertical('technology', 'electronica', 'electronica', 'Tienda de Electrónica', 'Electronics Store', 'Electrónica y gadgets', 'Cpu', 'ElectronicaPos', 'electronica', 85, 4);
SELECT temp_insert_vertical('technology', 'electrodomesticos', 'electrodomesticos', 'Electrodomésticos', 'Appliances', 'Línea blanca y electrodomésticos', 'Refrigerator', 'ElectrodomesticosPos', 'electrodomesticos', 80, 5);
SELECT temp_insert_vertical('technology', 'computadoras', 'computadoras', 'Computadoras', 'Computer Store', 'Computadoras, laptops y componentes', 'Laptop', 'ComputadorasPos', 'computadoras', 85, 6);
SELECT temp_insert_vertical('technology', 'gamer', 'gamer', 'Accesorios Gamer', 'Gaming Gear', 'Equipo y accesorios para gamers', 'Gamepad2', 'GamerPos', 'gamer', 80, 7);
SELECT temp_insert_vertical('technology', 'videojuegos', 'videojuegos', 'Videojuegos', 'Video Games', 'Juegos, consolas y accesorios', 'Gamepad', 'VideojuegosPos', 'videojuegos', 85, 8);
SELECT temp_insert_vertical('technology', 'consolas', 'consolas', 'Consolas y Controles', 'Gaming Consoles', 'Consolas y controles de videojuegos', 'Gamepad', 'ConsolasPos', 'consolas', 75, 9);
SELECT temp_insert_vertical('technology', 'realidad_virtual', 'realidad-virtual', 'Realidad Virtual', 'VR Shop', 'Equipos de realidad virtual', 'Glasses', 'VRPos', 'vr', 55, 10);
SELECT temp_insert_vertical('technology', 'drones', 'drones', 'Tienda de Drones', 'Drone Shop', 'Drones y accesorios', 'Plane', 'DronesPos', 'drones', 60, 11);
SELECT temp_insert_vertical('technology', 'camaras', 'camaras', 'Cámaras Fotográficas', 'Camera Shop', 'Cámaras, lentes y accesorios', 'Camera', 'CamarasPos', 'camaras', 70, 12);
SELECT temp_insert_vertical('technology', 'iluminacion_estudio', 'iluminacion-estudio', 'Iluminación y Estudio', 'Lighting Equipment', 'Equipo de iluminación profesional', 'Lightbulb', 'IluminacionPos', 'iluminacion', 50, 13);
SELECT temp_insert_vertical('technology', 'audio_profesional', 'audio-profesional', 'Audio Profesional', 'Pro Audio', 'Equipo de audio y sonido', 'Headphones', 'AudioPos', 'audiopro', 60, 14);
SELECT temp_insert_vertical('technology', 'seguridad_cctv', 'seguridad-cctv', 'Seguridad y CCTV', 'Security Systems', 'Cámaras de seguridad y monitoreo', 'Camera', 'CCTVPos', 'cctv', 70, 15);

-- ============================================
-- 6. HOGAR Y DECORACIÓN (11 giros)
-- ============================================
SELECT temp_insert_vertical('home', 'muebleria', 'muebleria', 'Mueblería', 'Furniture Store', 'Muebles para hogar y oficina', 'Armchair', 'MuebleriaPos', 'muebleria', 85, 1, 'Cliente', 'Clientes', 'Mueble', 'Muebles', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['delivery', 'quotes'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('home', 'decoracion', 'decoracion', 'Decoración', 'Home Decor', 'Artículos de decoración', 'Lamp', 'DecoracionPos', 'decoracion', 80, 2);
SELECT temp_insert_vertical('home', 'blancos', 'blancos', 'Blancos', 'Linens', 'Sábanas, toallas y blancos', 'Bed', 'BlancosPos', 'blancos', 75, 3);
SELECT temp_insert_vertical('home', 'colchoneria', 'colchoneria', 'Colchonería', 'Mattress Store', 'Colchones y bases', 'Bed', 'ColchoneriaPos', 'colchoneria', 70, 4);
SELECT temp_insert_vertical('home', 'cocinas_integrales', 'cocinas-integrales', 'Cocinas Integrales', 'Kitchen Design', 'Cocinas y muebles de cocina', 'UtensilsCrossed', 'CocinasPos', 'cocinas', 65, 5);
SELECT temp_insert_vertical('home', 'utensilios_cocina', 'utensilios-cocina', 'Utensilios de Cocina', 'Kitchenware', 'Artículos para cocina', 'ChefHat', 'UtensiliosPos', 'utensilios', 70, 6);
SELECT temp_insert_vertical('home', 'decoracion_vintage', 'decoracion-vintage', 'Decoración Vintage', 'Vintage Decor', 'Decoración estilo vintage', 'Clock', 'VintageDecorPos', 'vintagedecor', 55, 7);
SELECT temp_insert_vertical('home', 'cuadros_arte', 'cuadros-arte', 'Cuadros y Arte', 'Art Gallery', 'Cuadros, pinturas y arte', 'Image', 'ArtePos', 'arte', 60, 8);
SELECT temp_insert_vertical('home', 'espejos_cristales', 'espejos-cristales', 'Espejos y Cristales', 'Mirrors & Glass', 'Espejos decorativos y cristalería', 'Square', 'EspejosPos', 'espejos', 55, 9);
SELECT temp_insert_vertical('home', 'persianas_cortinas', 'persianas-cortinas', 'Persianas y Cortinas', 'Blinds & Curtains', 'Persianas, cortinas y decoración ventanas', 'Blinds', 'PersianasPos', 'persianas', 60, 10);
SELECT temp_insert_vertical('home', 'iluminacion_decorativa', 'iluminacion-decorativa', 'Iluminación Decorativa', 'Decorative Lighting', 'Lámparas y luminarias decorativas', 'Lamp', 'LamparasPos', 'lamparas', 65, 11);

-- ============================================
-- 7. FERRETERÍA Y CONSTRUCCIÓN (12 giros)
-- ============================================
SELECT temp_insert_vertical('hardware', 'ferreteria', 'ferreteria', 'Ferretería', 'Hardware Store', 'Herramientas y materiales', 'Hammer', 'FerreteriaPos', 'ferreteria', 90, 1, 'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['barcode_scanning', 'suppliers'], ARRAY['delivery']);
SELECT temp_insert_vertical('hardware', 'tlapaleria', 'tlapaleria', 'Tlapalería', 'General Hardware', 'Artículos de tlapalería', 'Wrench', 'TlapaPleriaPos', 'tlapaleria', 85, 2);
SELECT temp_insert_vertical('hardware', 'materiales_construccion', 'materiales-construccion', 'Materiales de Construcción', 'Building Materials', 'Materiales para obra', 'Brick', 'MaterialesPos', 'materiales', 80, 3);
SELECT temp_insert_vertical('hardware', 'cemento_agregados', 'cemento-agregados', 'Cemento y Agregados', 'Cement & Aggregates', 'Cemento, grava y arena', 'HardDrive', 'CementoPos', 'cemento', 70, 4);
SELECT temp_insert_vertical('hardware', 'pinturas', 'pinturas', 'Pinturas y Recubrimientos', 'Paint Store', 'Pinturas, barnices y acabados', 'Palette', 'PinturasPos', 'pinturas', 80, 5);
SELECT temp_insert_vertical('hardware', 'carpinteria', 'carpinteria', 'Carpintería', 'Woodworking', 'Madera y artículos de carpintería', 'Trees', 'CarpinteriaPos', 'carpinteria', 65, 6);
SELECT temp_insert_vertical('hardware', 'herramientas_electricas', 'herramientas-electricas', 'Herramientas Eléctricas', 'Power Tools', 'Herramientas eléctricas y accesorios', 'Zap', 'HerramientasPos', 'herramientas', 75, 7);
SELECT temp_insert_vertical('hardware', 'plomeria', 'plomeria', 'Plomería', 'Plumbing', 'Artículos de plomería', 'Droplet', 'PlomeriaPos', 'plomeria', 70, 8);
SELECT temp_insert_vertical('hardware', 'electricidad', 'electricidad', 'Electricidad', 'Electrical', 'Material eléctrico', 'Zap', 'ElectricidadPos', 'electricidad', 75, 9);
SELECT temp_insert_vertical('hardware', 'cerrajeria', 'cerrajeria', 'Cerrajería', 'Locksmith', 'Cerraduras, llaves y seguridad', 'Key', 'CerrajeriaPos', 'cerrajeria', 70, 10, 'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Orden', 'Órdenes');
SELECT temp_insert_vertical('hardware', 'pisos_azulejos', 'pisos-azulejos', 'Pisos y Azulejos', 'Tiles & Flooring', 'Pisos, azulejos y acabados', 'Grid', 'PisosPos', 'pisos', 70, 11);
SELECT temp_insert_vertical('hardware', 'vidrieria', 'vidrieria', 'Vidriería', 'Glass Shop', 'Vidrios, cristales y espejos', 'Square', 'VidrieriaPos', 'vidrieria', 60, 12);

-- ============================================
-- 8. MASCOTAS (7 giros)
-- ============================================
SELECT temp_insert_vertical('pets', 'pet_shop', 'pet-shop', 'Pet Shop', 'Pet Shop', 'Tienda de mascotas completa', 'PawPrint', 'PetShopPos', 'petshop', 90, 1, 'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['loyalty_program', 'appointments'], ARRAY['delivery']);
SELECT temp_insert_vertical('pets', 'alimento_mascotas', 'alimento-mascotas', 'Alimento para Mascotas', 'Pet Food', 'Alimentos y nutrición animal', 'Bone', 'AlimentoMascotasPos', 'alimentomascotas', 85, 2);
SELECT temp_insert_vertical('pets', 'accesorios_mascotas', 'accesorios-mascotas', 'Accesorios de Mascotas', 'Pet Accessories', 'Juguetes y accesorios', 'Heart', 'AccesoriosMascotasPos', 'accesoriosmascotas', 80, 3);
SELECT temp_insert_vertical('pets', 'acuario', 'acuario', 'Acuario', 'Aquarium Shop', 'Peces, peceras y accesorios', 'Fish', 'AcuarioPos', 'acuario', 65, 4);
SELECT temp_insert_vertical('pets', 'reptiles_exoticos', 'reptiles-exoticos', 'Reptiles y Exóticos', 'Exotic Pets', 'Mascotas exóticas y reptiles', 'Turtle', 'ExoticosPos', 'exoticos', 50, 5);
SELECT temp_insert_vertical('pets', 'boutique_mascotas', 'boutique-mascotas', 'Boutique de Mascotas', 'Pet Boutique', 'Ropa y accesorios premium para mascotas', 'Crown', 'BoutiqueMascotasPos', 'boutiquemascotas', 55, 6);
SELECT temp_insert_vertical('pets', 'peluqueria_mascotas', 'peluqueria-mascotas', 'Peluquería para Mascotas', 'Pet Grooming', 'Estética canina y felina', 'Scissors', 'GroomingPos', 'grooming', 75, 7, 'Cliente', 'Clientes', 'Mascota', 'Mascotas', 'Servicio', 'Servicios', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'staff_management'], ARRAY[]::TEXT[]);

-- ============================================
-- 9. AUTOMOTRIZ (9 giros)
-- ============================================
SELECT temp_insert_vertical('automotive', 'refaccionaria', 'refaccionaria', 'Refaccionaria', 'Auto Parts', 'Refacciones automotrices', 'Car', 'RefaccionariaPos', 'refaccionaria', 90, 1, 'Cliente', 'Clientes', 'Refacción', 'Refacciones', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['barcode_scanning', 'serial_numbers'], ARRAY['suppliers', 'delivery']);
SELECT temp_insert_vertical('automotive', 'autopartes', 'autopartes', 'Autopartes', 'Auto Parts Store', 'Partes y accesorios automotrices', 'Wrench', 'AutopartesPos', 'autopartes', 85, 2);
SELECT temp_insert_vertical('automotive', 'llantas', 'llantas', 'Tienda de Llantas', 'Tire Shop', 'Llantas, rines y accesorios', 'Circle', 'LlantasPos', 'llantas', 80, 3);
SELECT temp_insert_vertical('automotive', 'accesorios_auto', 'accesorios-auto', 'Accesorios Automotrices', 'Car Accessories', 'Accesorios y equipamiento', 'Car', 'AccesoriosAutoPos', 'accesoriosauto', 75, 4);
SELECT temp_insert_vertical('automotive', 'car_audio', 'car-audio', 'Car Audio', 'Car Audio', 'Sistemas de sonido automotriz', 'Music', 'CarAudioPos', 'caraudio', 70, 5);
SELECT temp_insert_vertical('automotive', 'detailing', 'detailing', 'Detailing Profesional', 'Auto Detailing', 'Limpieza y detallado profesional', 'Sparkles', 'DetailingPos', 'detailing', 65, 6, 'Cliente', 'Clientes', 'Vehículo', 'Vehículos', 'Servicio', 'Servicios');
SELECT temp_insert_vertical('automotive', 'limpieza_auto', 'limpieza-auto', 'Productos Limpieza Auto', 'Car Care Products', 'Productos de limpieza automotriz', 'Droplet', 'LimpiezaAutoPos', 'limpiezaauto', 55, 7);
SELECT temp_insert_vertical('automotive', 'boutique_4x4', 'boutique-4x4', 'Boutique 4x4', '4x4 Shop', 'Accesorios para vehículos 4x4', 'Truck', 'Boutique4x4Pos', '4x4', 50, 8);
SELECT temp_insert_vertical('automotive', 'lubricantes', 'lubricantes', 'Venta de Lubricantes', 'Lubricants', 'Aceites y lubricantes automotrices', 'Droplet', 'LubricantesPos', 'lubricantes', 70, 9);

-- ============================================
-- 10. PAPELERÍA Y OFICINA (10 giros)
-- ============================================
SELECT temp_insert_vertical('office', 'papeleria', 'papeleria', 'Papelería', 'Stationery Store', 'Artículos de papelería', 'FileText', 'PapeleriaPos', 'papeleria', 90, 1, 'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['barcode_scanning'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('office', 'libreria', 'libreria', 'Librería', 'Bookstore', 'Libros y publicaciones', 'BookOpen', 'LibreriaPos', 'libreria', 85, 2, 'Lector', 'Lectores', 'Libro', 'Libros', 'Venta', 'Ventas');
SELECT temp_insert_vertical('office', 'copias_impresiones', 'copias-impresiones', 'Copias e Impresiones', 'Copy Center', 'Servicios de copiado e impresión', 'Printer', 'CopiasPos', 'copias', 80, 3);
SELECT temp_insert_vertical('office', 'utiles_escolares', 'utiles-escolares', 'Útiles Escolares', 'School Supplies', 'Material escolar', 'Pencil', 'UtilesPos', 'utiles', 85, 4);
SELECT temp_insert_vertical('office', 'arte_dibujo', 'arte-dibujo', 'Arte y Dibujo', 'Art Supplies', 'Materiales para artistas', 'Palette', 'ArtePos', 'artedibujo', 65, 5);
SELECT temp_insert_vertical('office', 'material_didactico', 'material-didactico', 'Material Didáctico', 'Educational Materials', 'Material educativo', 'GraduationCap', 'DidacticoPos', 'didactico', 60, 6);
SELECT temp_insert_vertical('office', 'jugueteria_educativa', 'jugueteria-educativa', 'Juguetería Educativa', 'Educational Toys', 'Juguetes educativos y didácticos', 'Puzzle', 'JugueteriaEduPos', 'jugueteriaedu', 55, 7);
SELECT temp_insert_vertical('office', 'regalos_detalles', 'regalos-detalles', 'Regalos y Detalles', 'Gift Shop', 'Regalos y artículos especiales', 'Gift', 'RegalosPos', 'regalos', 70, 8);
SELECT temp_insert_vertical('office', 'souvenirs', 'souvenirs', 'Souvenirs', 'Souvenirs', 'Recuerdos y artículos turísticos', 'Bookmark', 'SouvenirsPos', 'souvenirs', 55, 9);
SELECT temp_insert_vertical('office', 'agendas_calendarios', 'agendas-calendarios', 'Calendarios y Agendas', 'Calendars & Planners', 'Agendas, calendarios y organizadores', 'Calendar', 'AgendasPos', 'agendas', 50, 10);

-- ============================================
-- 11. BELLEZA Y ESTÉTICA (10 giros)
-- ============================================
SELECT temp_insert_vertical('beauty', 'cosmeticos', 'cosmeticos', 'Tienda de Cosméticos', 'Cosmetics Store', 'Cosméticos y maquillaje', 'Sparkle', 'CosmeticosPos', 'cosmeticos', 90, 1, 'Clienta', 'Clientas', 'Producto', 'Productos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['loyalty_program', 'product_variants'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('beauty', 'perfumeria', 'perfumeria', 'Perfumería', 'Perfume Shop', 'Perfumes y fragancias', 'Sparkles', 'PerfumeriaPos', 'perfumeria', 85, 2);
SELECT temp_insert_vertical('beauty', 'barberia', 'barberia', 'Barbería', 'Barbershop', 'Barbería con venta de productos', 'Scissors', 'BarberiaPos', 'barberia', 90, 3, 'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Corte', 'Cortes', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'staff_management', 'loyalty_program'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('beauty', 'estetica', 'estetica', 'Estética', 'Beauty Salon', 'Salón de belleza integral', 'Sparkle', 'EsteticaPos', 'estetica', 88, 4, 'Clienta', 'Clientas', 'Servicio', 'Servicios', 'Cita', 'Citas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'staff_management'], ARRAY['loyalty_program']);
SELECT temp_insert_vertical('beauty', 'esmaltes', 'esmaltes', 'Venta de Esmaltes', 'Nail Polish Shop', 'Esmaltes y accesorios de uñas', 'Paintbrush', 'EsmaltesPos', 'esmaltes', 65, 5);
SELECT temp_insert_vertical('beauty', 'maquillaje_profesional', 'maquillaje-profesional', 'Maquillaje Profesional', 'Pro Makeup', 'Maquillaje y productos profesionales', 'Palette', 'MaquillajeProPos', 'maquillajeprofe', 70, 6);
SELECT temp_insert_vertical('beauty', 'extensiones_pelucas', 'extensiones-pelucas', 'Extensiones y Pelucas', 'Wigs & Extensions', 'Extensiones de cabello y pelucas', 'Scissors', 'ExtensionesPos', 'extensiones', 55, 7);
SELECT temp_insert_vertical('beauty', 'suministros_unas', 'suministros-unas', 'Suministros para Uñas', 'Nail Supplies', 'Productos para uñas profesionales', 'Paintbrush', 'SuministrosUnasPos', 'suministrosunas', 60, 8);
SELECT temp_insert_vertical('beauty', 'spa_retail', 'spa-retail', 'Spa Retail', 'Spa Retail', 'Productos de spa y bienestar', 'Droplet', 'SpaRetailPos', 'sparetail', 65, 9, 'Cliente', 'Clientes', 'Tratamiento', 'Tratamientos', 'Sesión', 'Sesiones');
SELECT temp_insert_vertical('beauty', 'aceites_esenciales', 'aceites-esenciales', 'Aceites Esenciales', 'Essential Oils', 'Aceites esenciales y aromaterapia', 'Droplet', 'AceitesPos', 'aceites', 55, 10);

-- ============================================
-- 12. DEPORTES Y AIRE LIBRE (8 giros)
-- ============================================
SELECT temp_insert_vertical('sports', 'deportes', 'deportes', 'Tienda de Deportes', 'Sports Store', 'Artículos deportivos generales', 'Dumbbell', 'DeportesPos', 'deportes', 85, 1, 'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['product_variants'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('sports', 'bicicletas', 'bicicletas', 'Bicicletería', 'Bike Shop', 'Bicicletas y accesorios', 'Bike', 'BicicletasPos', 'bicicletas', 80, 2, 'Cliente', 'Clientes', 'Bicicleta', 'Bicicletas', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'serial_numbers'], ARRAY['delivery']);
SELECT temp_insert_vertical('sports', 'pesca', 'pesca', 'Pesca Deportiva', 'Fishing Shop', 'Equipo de pesca deportiva', 'Fish', 'PescaPos', 'pesca', 55, 3);
SELECT temp_insert_vertical('sports', 'campismo', 'campismo', 'Tienda de Campismo', 'Camping Store', 'Equipo de camping y outdoor', 'Tent', 'CampismoPos', 'campismo', 60, 4);
SELECT temp_insert_vertical('sports', 'airsoft_paintball', 'airsoft-paintball', 'Airsoft y Paintball', 'Airsoft & Paintball', 'Equipo de airsoft y paintball', 'Target', 'AirsoftPos', 'airsoft', 50, 5);
SELECT temp_insert_vertical('sports', 'extremos', 'extremos', 'Deportes Extremos', 'Extreme Sports', 'Skate, snowboard y más', 'Snowflake', 'ExtremosPos', 'extremos', 55, 6);
SELECT temp_insert_vertical('sports', 'artes_marciales', 'artes-marciales', 'Artes Marciales', 'Martial Arts', 'Equipo de artes marciales', 'Swords', 'ArtesMarcPos', 'artesmarciales', 45, 7);
SELECT temp_insert_vertical('sports', 'yoga', 'yoga', 'Tienda de Yoga', 'Yoga Shop', 'Accesorios y ropa de yoga', 'Activity', 'YogaPos', 'yoga', 55, 8);

-- ============================================
-- 13. NIÑOS Y BEBÉS (6 giros)
-- ============================================
SELECT temp_insert_vertical('kids', 'jugueteria', 'jugueteria', 'Juguetería', 'Toy Store', 'Juguetes para todas las edades', 'Puzzle', 'JugueteriaPos', 'jugueteria', 90, 1, 'Cliente', 'Clientes', 'Juguete', 'Juguetes', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['barcode_scanning', 'loyalty_program'], ARRAY['online_ordering', 'delivery']);
SELECT temp_insert_vertical('kids', 'tienda_bebes', 'tienda-bebes', 'Tienda de Bebés', 'Baby Store', 'Artículos para bebés', 'Baby', 'BebesPos', 'tiendabebes', 85, 2);
SELECT temp_insert_vertical('kids', 'ropa_bebe', 'ropa-bebe', 'Ropa de Bebé', 'Baby Clothing', 'Ropa para recién nacidos', 'Baby', 'RopaBebePos', 'ropabebe', 80, 3);
SELECT temp_insert_vertical('kids', 'carriolas', 'carriolas', 'Carriolas y Accesorios', 'Strollers', 'Carriolas y accesorios de bebé', 'ShoppingCart', 'CarriolasPos', 'carriolas', 70, 4);
SELECT temp_insert_vertical('kids', 'montessori', 'montessori', 'Tienda Montessori', 'Montessori Store', 'Materiales y juguetes Montessori', 'Puzzle', 'MontessoriPos', 'montessori', 55, 5);
SELECT temp_insert_vertical('kids', 'aprendizaje', 'aprendizaje', 'Tienda de Aprendizaje', 'Learning Store', 'Productos educativos para niños', 'GraduationCap', 'AprendizajePos', 'aprendizaje', 50, 6);

-- ============================================
-- 14. TIENDAS ESPECIALIZADAS (25 giros)
-- ============================================
SELECT temp_insert_vertical('specialty', 'floreria', 'floreria', 'Florería', 'Flower Shop', 'Flores y arreglos florales', 'Flower', 'FloreriaPos', 'floreria', 85, 1, 'Cliente', 'Clientes', 'Arreglo', 'Arreglos', 'Pedido', 'Pedidos', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['reservations', 'delivery'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('specialty', 'tienda_regalos', 'tienda-regalos', 'Tienda de Regalos', 'Gift Shop', 'Regalos para toda ocasión', 'Gift', 'RegalosPos', 'tiendaregalos', 75, 2);
SELECT temp_insert_vertical('specialty', 'velas', 'velas', 'Tienda de Velas', 'Candle Shop', 'Velas artesanales y decorativas', 'Flame', 'VelasPos', 'velas', 55, 3);
SELECT temp_insert_vertical('specialty', 'aromaterapia', 'aromaterapia', 'Tienda de Aromaterapia', 'Aromatherapy Shop', 'Productos de aromaterapia', 'Droplet', 'AromaterapiaPos', 'aromaterapia', 50, 4);
SELECT temp_insert_vertical('specialty', 'articulos_religiosos', 'articulos-religiosos', 'Artículos Religiosos', 'Religious Items', 'Artículos religiosos y devocionales', 'Star', 'ReligiososPos', 'religiosos', 60, 5);
SELECT temp_insert_vertical('specialty', 'antiguedades', 'antiguedades', 'Tienda de Antigüedades', 'Antique Shop', 'Antigüedades y coleccionables', 'Clock', 'AntiguedadesPos', 'antiguedades', 50, 6);
SELECT temp_insert_vertical('specialty', 'coleccionables', 'coleccionables', 'Coleccionables', 'Collectibles', 'Artículos de colección', 'Trophy', 'ColeccionablesPos', 'coleccionables', 55, 7);
SELECT temp_insert_vertical('specialty', 'comics', 'comics', 'Comics Shop', 'Comics Shop', 'Comics, manga y cultura geek', 'BookOpen', 'ComicsPos', 'comics', 65, 8);
SELECT temp_insert_vertical('specialty', 'sex_shop', 'sex-shop', 'Sex Shop', 'Adult Store', 'Productos para adultos', 'Heart', 'AdultPos', 'adultshop', 55, 9);
SELECT temp_insert_vertical('specialty', 'casa_empeno', 'casa-empeno', 'Casa de Empeño', 'Pawn Shop', 'Empeños y préstamos', 'DollarSign', 'EmpenoPos', 'empeno', 70, 10, 'Cliente', 'Clientes', 'Prenda', 'Prendas', 'Contrato', 'Contratos');
SELECT temp_insert_vertical('specialty', 'instrumentos_musicales', 'instrumentos-musicales', 'Instrumentos Musicales', 'Music Store', 'Instrumentos y accesorios', 'Music', 'MusicaPos', 'instrumentos', 70, 11);
SELECT temp_insert_vertical('specialty', 'uniformes', 'uniformes', 'Tienda de Uniformes', 'Uniform Shop', 'Uniformes escolares e industriales', 'Shirt', 'UniformesPos', 'uniformes', 70, 12);
SELECT temp_insert_vertical('specialty', 'merceria', 'merceria', 'Mercería', 'Notions Store', 'Hilos, botones y accesorios de costura', 'Scissors', 'MerceriaPos', 'merceria', 65, 13);
SELECT temp_insert_vertical('specialty', 'pinateria', 'pinateria', 'Piñatería', 'Pinata Shop', 'Piñatas y artículos de fiesta', 'Star', 'PinateriaPos', 'pinateria', 60, 14);
SELECT temp_insert_vertical('specialty', 'manualidades', 'manualidades', 'Manualidades', 'Crafts Store', 'Materiales para manualidades', 'Palette', 'ManualidadesPos', 'manualidades', 70, 15);
SELECT temp_insert_vertical('specialty', 'globos', 'globos', 'Tienda de Globos', 'Balloon Shop', 'Globos y decoración de fiestas', 'Circle', 'GlobosPos', 'globos', 55, 16);
SELECT temp_insert_vertical('specialty', 'fiestas', 'fiestas', 'Artículos para Fiestas', 'Party Supplies', 'Todo para fiestas y eventos', 'PartyPopper', 'FiestasPos', 'fiestas', 75, 17);
SELECT temp_insert_vertical('specialty', 'energia_solar', 'energia-solar', 'Energías Solares', 'Solar Energy', 'Paneles y equipo solar', 'Sun', 'SolarPos', 'solar', 50, 18);
SELECT temp_insert_vertical('specialty', 'baterias', 'baterias', 'Tienda de Baterías', 'Battery Shop', 'Baterías y energía portátil', 'Battery', 'BateriasPos', 'baterias', 55, 19);
SELECT temp_insert_vertical('specialty', 'personalizados', 'personalizados', 'Regalos Personalizados', 'Custom Gifts', 'Productos personalizados', 'Pen', 'PersonalizadosPos', 'personalizados', 60, 20);
SELECT temp_insert_vertical('specialty', 'joyeria', 'joyeria', 'Joyería', 'Jewelry Store', 'Joyería fina y accesorios', 'Gem', 'JoyeriaPos', 'joyeria', 80, 21, 'Cliente', 'Clientes', 'Pieza', 'Piezas', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['serial_numbers', 'product_variants'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('specialty', 'relojeria', 'relojeria', 'Relojería', 'Watch Shop', 'Relojes y reparación', 'Clock', 'RelojeriaPos', 'relojeria', 70, 22, 'Cliente', 'Clientes', 'Reloj', 'Relojes', 'Servicio', 'Servicios');
SELECT temp_insert_vertical('specialty', 'bisuteria', 'bisuteria', 'Bisutería', 'Costume Jewelry', 'Bisutería y accesorios', 'Gem', 'BisuteriaPos', 'bisuteria', 65, 23);
SELECT temp_insert_vertical('specialty', 'tabaqueria', 'tabaqueria', 'Tabaquería', 'Tobacco Shop', 'Tabaco y accesorios para fumador', 'Flame', 'TabaqueriaPos', 'tabaqueria', 55, 24);
SELECT temp_insert_vertical('specialty', 'loteria', 'loteria', 'Expendio de Lotería', 'Lottery Shop', 'Venta de billetes de lotería', 'Ticket', 'LoteriaPos', 'loteria', 50, 25);

-- ============================================
-- 15. SERVICIOS (10 giros)
-- ============================================
SELECT temp_insert_vertical('services', 'lavanderia', 'lavanderia', 'Lavandería', 'Laundry', 'Servicio de lavado y planchado', 'Droplet', 'LavanderiaPos', 'lavanderia', 80, 1, 'Cliente', 'Clientes', 'Prenda', 'Prendas', 'Orden', 'Órdenes', ARRAY['pos', 'customers', 'reports'], ARRAY['delivery'], ARRAY[]::TEXT[]);
SELECT temp_insert_vertical('services', 'tintoreria', 'tintoreria', 'Tintorería', 'Dry Cleaning', 'Limpieza en seco profesional', 'Shirt', 'TintoreriaPos', 'tintoreria', 75, 2);
SELECT temp_insert_vertical('services', 'sastreria', 'sastreria', 'Sastrería', 'Tailor Shop', 'Confección y arreglos de ropa', 'Scissors', 'SastreriaPos', 'sastreria', 65, 3, 'Cliente', 'Clientes', 'Prenda', 'Prendas', 'Servicio', 'Servicios');
SELECT temp_insert_vertical('services', 'estudio_foto', 'estudio-foto', 'Estudio Fotográfico', 'Photo Studio', 'Fotografía profesional', 'Camera', 'FotoEstudioPos', 'fotoestudio', 70, 4);
SELECT temp_insert_vertical('services', 'imprenta', 'imprenta', 'Imprenta', 'Print Shop', 'Impresión y diseño gráfico', 'Printer', 'ImprentaPos', 'imprenta', 70, 5);
SELECT temp_insert_vertical('services', 'bordados', 'bordados', 'Bordados y Serigrafia', 'Embroidery', 'Bordados personalizados', 'Shirt', 'BordadosPos', 'bordados', 60, 6);
SELECT temp_insert_vertical('services', 'reparacion_electronica', 'reparacion-electronica', 'Reparación Electrónica', 'Electronics Repair', 'Reparación de aparatos electrónicos', 'Wrench', 'ReparacionElecPos', 'reparacionelec', 70, 7, 'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Servicio', 'Servicios');
SELECT temp_insert_vertical('services', 'cibercafe', 'cibercafe', 'Cibercafé', 'Internet Cafe', 'Servicios de internet y cómputo', 'Laptop', 'CibercafePos', 'cibercafe', 55, 8);
SELECT temp_insert_vertical('services', 'envios_paqueteria', 'envios-paqueteria', 'Envíos y Paquetería', 'Shipping', 'Servicios de mensajería', 'Package', 'EnviosPos', 'envios', 70, 9);
SELECT temp_insert_vertical('services', 'recarga_celular', 'recarga-celular', 'Recargas y Pagos', 'Phone Recharge', 'Recargas telefónicas y pagos', 'Smartphone', 'RecargasPos', 'recargas', 75, 10);

-- ============================================
-- 16. SALUD Y BIENESTAR (10 giros)
-- ============================================
SELECT temp_insert_vertical('health', 'farmacia', 'farmacia', 'Farmacia', 'Pharmacy', 'Farmacia y productos de salud', 'Pill', 'FarmaciaPos', 'farmacia', 95, 1, 'Cliente', 'Clientes', 'Medicamento', 'Medicamentos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['barcode_scanning', 'expiry_tracking', 'batch_tracking'], ARRAY['delivery', 'online_ordering']);
SELECT temp_insert_vertical('health', 'clinica_dental', 'clinica-dental', 'Clínica Dental', 'Dental Clinic', 'Consultorio y clínica dental', 'Smile', 'DentalPos', 'dental', 80, 2, 'Paciente', 'Pacientes', 'Tratamiento', 'Tratamientos', 'Cita', 'Citas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'staff_management'], ARRAY['whatsapp_integration']);
SELECT temp_insert_vertical('health', 'optica', 'optica', 'Óptica', 'Optical Shop', 'Lentes y servicios ópticos', 'Eye', 'OpticaPos', 'optica', 80, 3, 'Paciente', 'Pacientes', 'Lentes', 'Lentes', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'product_variants'], ARRAY[]::TEXT[]);
SELECT temp_insert_vertical('health', 'consultorio_medico', 'consultorio-medico', 'Consultorio Médico', 'Medical Office', 'Consultorio médico general', 'Stethoscope', 'ConsultorioPos', 'consultorio', 75, 4, 'Paciente', 'Pacientes', 'Consulta', 'Consultas', 'Cita', 'Citas', ARRAY['pos', 'customers', 'reports'], ARRAY['appointments', 'staff_management'], ARRAY[]::TEXT[]);
SELECT temp_insert_vertical('health', 'laboratorio', 'laboratorio', 'Laboratorio Clínico', 'Clinical Lab', 'Análisis clínicos', 'TestTube', 'LaboratorioPos', 'laboratorio', 70, 5, 'Paciente', 'Pacientes', 'Estudio', 'Estudios', 'Orden', 'Órdenes');
SELECT temp_insert_vertical('health', 'spa', 'spa', 'Spa', 'Spa', 'Centro de relajación y bienestar', 'Flower', 'SpaPos', 'spa', 75, 6, 'Cliente', 'Clientes', 'Tratamiento', 'Tratamientos', 'Sesión', 'Sesiones', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'staff_management', 'loyalty_program'], ARRAY[]::TEXT[]);
SELECT temp_insert_vertical('health', 'gimnasio', 'gimnasio', 'Gimnasio', 'Gym', 'Centro de acondicionamiento físico', 'Dumbbell', 'GimnasioPos', 'gimnasio', 80, 7, 'Miembro', 'Miembros', 'Membresía', 'Membresías', 'Pago', 'Pagos', ARRAY['pos', 'customers', 'reports'], ARRAY['staff_management', 'loyalty_program'], ARRAY['appointments']);
SELECT temp_insert_vertical('health', 'nutriologo', 'nutriologo', 'Consultorio Nutriólogo', 'Nutritionist', 'Consultas de nutrición', 'Apple', 'NutriologoPos', 'nutriologo', 55, 8, 'Paciente', 'Pacientes', 'Consulta', 'Consultas', 'Cita', 'Citas');
SELECT temp_insert_vertical('health', 'fisioterapia', 'fisioterapia', 'Fisioterapia', 'Physical Therapy', 'Centro de fisioterapia', 'Activity', 'FisioterapiaPos', 'fisioterapia', 60, 9, 'Paciente', 'Pacientes', 'Sesión', 'Sesiones', 'Terapia', 'Terapias');
SELECT temp_insert_vertical('health', 'veterinaria', 'veterinaria', 'Veterinaria', 'Veterinary Clinic', 'Clínica veterinaria', 'PawPrint', 'VeterinariaPos', 'veterinaria', 75, 10, 'Cliente', 'Clientes', 'Mascota', 'Mascotas', 'Consulta', 'Consultas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments'], ARRAY['delivery']);

-- ============================================
-- CLEANUP
-- ============================================
DROP FUNCTION IF EXISTS temp_insert_vertical(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[]);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM verticals;
  RAISE NOTICE 'Successfully inserted % business verticals!', v_count;
END $$;
