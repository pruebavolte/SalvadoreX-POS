import { Language } from "@/contexts/language-context";
import { useMemo } from "react";

export interface CustomerMenuTranslations {
  // Search and Filters
  searchPlaceholder: string;
  all: string;
  bestSellers: string;
  noProductsFound: string;
  noBestSellers: string;
  noBestSellersDescription: string;

  // Product Actions
  addToCart: string;
  addedToCart: string;
  inCart: string;
  viewOrder: string;

  // Cart
  shoppingCart: string;
  itemsInCart: string;
  item: string;
  items: string;
  emptyCart: string;
  emptyCartSubtext: string;
  subtotal: string;
  taxes: string;
  total: string;
  continueShopping: string;
  placeOrder: string;

  // Checkout
  confirmOrder: string;
  reviewOrder: string;
  additionalNotes: string;
  notesPlaceholder: string;
  cancel: string;
  confirmOrderButton: string;
  processing: string;

  // Success
  orderPlaced: string;
  orderSuccess: string;
  orderSuccessDescription: string;

  // Errors
  loadMenuError: string;
  createOrderError: string;
}

export const customerMenuTranslations: Record<Language, CustomerMenuTranslations> = {
  es: {
    searchPlaceholder: "Buscar productos...",
    all: "Todos",
    bestSellers: "Los más vendidos",
    noProductsFound: "No se encontraron productos",
    noBestSellers: "Aún no hay ventas registradas",
    noBestSellersDescription: "Los productos más vendidos aparecerán aquí conforme se realicen ventas",
    addToCart: "Agregar",
    addedToCart: "agregado al carrito",
    inCart: "En el ticket",
    viewOrder: "Ver pedido",
    shoppingCart: "Resumen de Pedido",
    itemsInCart: "en tu carrito",
    item: "artículo",
    items: "artículos",
    emptyCart: "Tu carrito está vacío",
    emptyCartSubtext: "Agrega productos para comenzar",
    subtotal: "Subtotal:",
    taxes: "Impuestos:",
    total: "Total:",
    continueShopping: "Seguir comprando",
    placeOrder: "Realizar pedido",
    confirmOrder: "Confirmar Pedido",
    reviewOrder: "Revisa tu pedido antes de confirmar",
    additionalNotes: "Notas adicionales (opcional)",
    notesPlaceholder: "Ej: Sin cebolla, extra picante...",
    cancel: "Cancelar",
    confirmOrderButton: "Confirmar Pedido",
    processing: "Procesando...",
    orderPlaced: "¡Pedido realizado!",
    orderSuccess: "¡Pedido realizado!",
    orderSuccessDescription: "Tu pedido ha sido enviado a la cocina. Te notificaremos cuando esté listo.",
    loadMenuError: "Error al cargar el menú",
    createOrderError: "Error al crear la orden",
  },
  en: {
    searchPlaceholder: "Search products...",
    all: "All",
    bestSellers: "Best Sellers",
    noProductsFound: "No products found",
    noBestSellers: "No sales recorded yet",
    noBestSellersDescription: "Best-selling products will appear here as sales are made",
    addToCart: "Add",
    addedToCart: "added to cart",
    inCart: "In cart",
    viewOrder: "View order",
    shoppingCart: "Order Summary",
    itemsInCart: "in your cart",
    item: "item",
    items: "items",
    emptyCart: "Your cart is empty",
    emptyCartSubtext: "Add products to get started",
    subtotal: "Subtotal:",
    taxes: "Taxes:",
    total: "Total:",
    continueShopping: "Continue shopping",
    placeOrder: "Place order",
    confirmOrder: "Confirm Order",
    reviewOrder: "Review your order before confirming",
    additionalNotes: "Additional notes (optional)",
    notesPlaceholder: "E.g.: No onions, extra spicy...",
    cancel: "Cancel",
    confirmOrderButton: "Confirm Order",
    processing: "Processing...",
    orderPlaced: "Order placed!",
    orderSuccess: "Order placed!",
    orderSuccessDescription: "Your order has been sent to the kitchen. We'll notify you when it's ready.",
    loadMenuError: "Error loading menu",
    createOrderError: "Error creating order",
  },
  pt: {
    searchPlaceholder: "Pesquisar produtos...",
    all: "Todos",
    bestSellers: "Mais Vendidos",
    noProductsFound: "Nenhum produto encontrado",
    noBestSellers: "Ainda não há vendas registradas",
    noBestSellersDescription: "Os produtos mais vendidos aparecerão aqui conforme as vendas forem realizadas",
    addToCart: "Adicionar",
    addedToCart: "adicionado ao carrinho",
    inCart: "No carrinho",
    viewOrder: "Ver pedido",
    shoppingCart: "Resumo do Pedido",
    itemsInCart: "no seu carrinho",
    item: "item",
    items: "itens",
    emptyCart: "Seu carrinho está vazio",
    emptyCartSubtext: "Adicione produtos para começar",
    subtotal: "Subtotal:",
    taxes: "Impostos:",
    total: "Total:",
    continueShopping: "Continuar comprando",
    placeOrder: "Fazer pedido",
    confirmOrder: "Confirmar Pedido",
    reviewOrder: "Revise seu pedido antes de confirmar",
    additionalNotes: "Notas adicionais (opcional)",
    notesPlaceholder: "Ex: Sem cebola, extra picante...",
    cancel: "Cancelar",
    confirmOrderButton: "Confirmar Pedido",
    processing: "Processando...",
    orderPlaced: "Pedido realizado!",
    orderSuccess: "Pedido realizado!",
    orderSuccessDescription: "Seu pedido foi enviado para a cozinha. Notificaremos quando estiver pronto.",
    loadMenuError: "Erro ao carregar o menu",
    createOrderError: "Erro ao criar o pedido",
  },
  de: {
    searchPlaceholder: "Produkte suchen...",
    all: "Alle",
    bestSellers: "Bestseller",
    noProductsFound: "Keine Produkte gefunden",
    noBestSellers: "Noch keine Verkäufe registriert",
    noBestSellersDescription: "Die meistverkauften Produkte werden hier angezeigt, sobald Verkäufe getätigt werden",
    addToCart: "Hinzufügen",
    addedToCart: "zum Warenkorb hinzugefügt",
    inCart: "Im Warenkorb",
    viewOrder: "Bestellung ansehen",
    shoppingCart: "Bestellübersicht",
    itemsInCart: "in Ihrem Warenkorb",
    item: "Artikel",
    items: "Artikel",
    emptyCart: "Ihr Warenkorb ist leer",
    emptyCartSubtext: "Fügen Sie Produkte hinzu, um zu beginnen",
    subtotal: "Zwischensumme:",
    taxes: "Steuern:",
    total: "Gesamt:",
    continueShopping: "Weiter einkaufen",
    placeOrder: "Bestellung aufgeben",
    confirmOrder: "Bestellung Bestätigen",
    reviewOrder: "Überprüfen Sie Ihre Bestellung vor der Bestätigung",
    additionalNotes: "Zusätzliche Notizen (optional)",
    notesPlaceholder: "Z.B.: Ohne Zwiebeln, extra scharf...",
    cancel: "Abbrechen",
    confirmOrderButton: "Bestellung Bestätigen",
    processing: "Verarbeitung läuft...",
    orderPlaced: "Bestellung aufgegeben!",
    orderSuccess: "Bestellung aufgegeben!",
    orderSuccessDescription: "Ihre Bestellung wurde an die Küche gesendet. Wir benachrichtigen Sie, wenn sie fertig ist.",
    loadMenuError: "Fehler beim Laden des Menüs",
    createOrderError: "Fehler beim Erstellen der Bestellung",
  },
  ja: {
    searchPlaceholder: "商品を検索...",
    all: "すべて",
    bestSellers: "ベストセラー",
    noProductsFound: "商品が見つかりません",
    noBestSellers: "まだ売上が記録されていません",
    noBestSellersDescription: "売上が発生すると、最も売れている商品がここに表示されます",
    addToCart: "追加",
    addedToCart: "カートに追加されました",
    inCart: "カート内",
    viewOrder: "注文を見る",
    shoppingCart: "注文概要",
    itemsInCart: "カート内",
    item: "アイテム",
    items: "アイテム",
    emptyCart: "カートは空です",
    emptyCartSubtext: "商品を追加して始めましょう",
    subtotal: "小計：",
    taxes: "税金：",
    total: "合計：",
    continueShopping: "買い物を続ける",
    placeOrder: "注文する",
    confirmOrder: "注文を確認",
    reviewOrder: "確認前に注文内容を確認してください",
    additionalNotes: "追加メモ（オプション）",
    notesPlaceholder: "例：玉ねぎ抜き、extra辛口...",
    cancel: "キャンセル",
    confirmOrderButton: "注文を確認",
    processing: "処理中...",
    orderPlaced: "注文完了！",
    orderSuccess: "注文完了！",
    orderSuccessDescription: "ご注文がキッチンに送られました。準備ができ次第お知らせします。",
    loadMenuError: "メニューの読み込みエラー",
    createOrderError: "注文作成エラー",
  },
  fr: {
    searchPlaceholder: "Rechercher des produits...",
    all: "Tous",
    bestSellers: "Meilleures Ventes",
    noProductsFound: "Aucun produit trouvé",
    noBestSellers: "Aucune vente enregistrée pour le moment",
    noBestSellersDescription: "Les produits les plus vendus apparaîtront ici au fur et à mesure des ventes",
    addToCart: "Ajouter",
    addedToCart: "ajouté au panier",
    inCart: "Dans le panier",
    viewOrder: "Voir la commande",
    shoppingCart: "Résumé de la Commande",
    itemsInCart: "dans votre panier",
    item: "article",
    items: "articles",
    emptyCart: "Votre panier est vide",
    emptyCartSubtext: "Ajoutez des produits pour commencer",
    subtotal: "Sous-total :",
    taxes: "Taxes :",
    total: "Total :",
    continueShopping: "Continuer les achats",
    placeOrder: "Passer la commande",
    confirmOrder: "Confirmer la Commande",
    reviewOrder: "Vérifiez votre commande avant de confirmer",
    additionalNotes: "Notes supplémentaires (optionnel)",
    notesPlaceholder: "Ex : Sans oignons, extra épicé...",
    cancel: "Annuler",
    confirmOrderButton: "Confirmer la Commande",
    processing: "Traitement en cours...",
    orderPlaced: "Commande passée !",
    orderSuccess: "Commande passée !",
    orderSuccessDescription: "Votre commande a été envoyée à la cuisine. Nous vous informerons quand elle sera prête.",
    loadMenuError: "Erreur de chargement du menu",
    createOrderError: "Erreur lors de la création de la commande",
  },
};

export function useCustomerMenuTranslations(language: Language): CustomerMenuTranslations {
  return useMemo(() => customerMenuTranslations[language], [language]);
}
