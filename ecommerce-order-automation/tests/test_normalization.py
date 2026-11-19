"""Pruebas de normalización de pedidos dispares a modelo único Order."""

import json

from app.models import OrderSource, OrderStatus, PaymentStatus
from app.normalizers import (
    normalize_shopify_order,
    normalize_stripe_payment_intent,
    normalize_woocommerce_order,
)


def test_normalize_woocommerce(sample_payloads):
    """Verifica que un payload de WooCommerce se convierta a un objeto Order normalizado,

    validando cada campo del modelo unico segun docs/FIELD-MAPPING.md.
    """
    payload = json.loads(sample_payloads["wc_bytes"].decode("utf-8"))
    order = normalize_woocommerce_order(payload)

    # Identificadores y origen
    assert order.id == "ORD-WC-501"
    assert order.external_id == "501"
    assert order.source == OrderSource.WOOCOMMERCE
    assert order.status == OrderStatus.LISTO_PARA_DESPACHAR
    assert order.payment_status == PaymentStatus.PAID

    # Cliente y direccion de envio
    assert order.customer.name == "Ana Pérez"
    assert order.customer.email == "your-user@example.com"
    assert order.customer.phone == "+573001234567"
    assert order.customer.shipping_address.street == "Carrera 7 # 72-41 Oficina 802"
    assert order.customer.shipping_address.city == "Bogotá"
    assert order.customer.shipping_address.state == "Cundinamarca"
    assert order.customer.shipping_address.postal_code == "110221"
    assert order.customer.shipping_address.country == "CO"

    # Lineas de pedido
    assert len(order.items) == 2
    assert order.items[0].sku == "CF-HUI-250"
    assert order.items[0].title == "Café Huila Especial (250g)"
    assert order.items[0].quantity == 2
    assert order.items[0].unit_price == 28000.0
    assert order.items[0].total_price == 56000.0

    assert order.items[1].sku == "CF-NAR-250"
    assert order.items[1].title == "Café Nariño Supremo (250g)"
    assert order.items[1].quantity == 1
    assert order.items[1].unit_price == 30000.0
    assert order.items[1].total_price == 30000.0

    # Totales y moneda
    assert order.total_amount == 86000.0
    assert order.currency == "COP"

    # Historial y metadatos
    assert len(order.history) == 1
    assert order.history[0].from_status == "nuevo"
    assert order.history[0].to_status == "listo_para_despachar"
    assert order.metadata["raw_status"] == "processing"
    assert order.metadata["payment_method"] == "PSE / Transferencia Bancaria"


def test_normalize_shopify(sample_payloads):
    """Verifica que un payload de Shopify se convierta a un objeto Order normalizado,

    validando cada campo del modelo unico segun docs/FIELD-MAPPING.md.
    """
    payload = json.loads(sample_payloads["shopify_bytes"].decode("utf-8"))
    order = normalize_shopify_order(payload)

    # Identificadores y origen
    assert order.id == "ORD-SHP-1042"
    assert order.external_id == "1042"
    assert order.source == OrderSource.SHOPIFY
    assert order.status == OrderStatus.LISTO_PARA_DESPACHAR
    assert order.payment_status == PaymentStatus.PAID

    # Cliente y direccion de envio
    assert order.customer.name == "Carlos Mendoza"
    assert order.customer.email == "carlos.mendoza@example.com"
    assert order.customer.phone == "+573159876543"
    assert order.customer.shipping_address.street == "Calle 10 # 43E-12, Apto 502"
    assert order.customer.shipping_address.city == "Medellín"
    assert order.customer.shipping_address.state == "Antioquia"
    assert order.customer.shipping_address.postal_code == "050021"
    assert order.customer.shipping_address.country == "CO"

    # Lineas de pedido
    assert len(order.items) == 1
    assert order.items[0].sku == "CF-GEI-250"
    assert order.items[0].title == "Café Geisha Sierra Nevada (250g)"
    assert order.items[0].quantity == 1
    assert order.items[0].unit_price == 55000.0
    assert order.items[0].total_price == 55000.0

    # Totales y moneda
    assert order.total_amount == 55000.0
    assert order.currency == "COP"

    # Historial y metadatos
    assert len(order.history) == 1
    assert order.history[0].from_status == "nuevo"
    assert order.history[0].to_status == "listo_para_despachar"
    assert order.metadata["financial_status"] == "paid"
    assert order.metadata["fulfillment_status"] is None


def test_normalize_stripe(sample_payloads):
    """Verifica que un payment_intent.succeeded de Stripe se convierta a un Order normalizado,

    validando cada campo del modelo unico segun docs/FIELD-MAPPING.md.
    """
    payload = json.loads(sample_payloads["stripe_bytes"].decode("utf-8"))
    order = normalize_stripe_payment_intent(payload)

    # Identificadores y origen
    assert order.id == "ORD-STP-ABC999"
    assert order.external_id == "pi_3P8xYz2eZvKYlo2C0abc999"
    assert order.source == OrderSource.STRIPE
    assert order.status == OrderStatus.LISTO_PARA_DESPACHAR
    assert order.payment_status == PaymentStatus.PAID

    # Cliente y direccion desde metadata y shipping
    assert order.customer.name == "Andrea Gómez"
    assert order.customer.email == "andrea.gomez@example.com"
    assert order.customer.phone == "+573204567890"
    assert order.customer.shipping_address.street == "Avenida El Poblado # 5A-110"
    assert order.customer.shipping_address.city == "Medellín"
    assert order.customer.shipping_address.state == "Antioquia"
    assert order.customer.shipping_address.postal_code == "050022"
    assert order.customer.shipping_address.country == "CO"

    # Lineas de pedido desde metadata JSON
    assert len(order.items) == 1
    assert order.items[0].sku == "CF-HUI-250"
    assert order.items[0].title == "Café Huila Especial (250g)"
    assert order.items[0].quantity == 3
    assert order.items[0].unit_price == 28000.0
    assert order.items[0].total_price == 84000.0

    # Totales (centavos / 100) y moneda
    assert order.total_amount == 84000.0
    assert order.currency == "COP"

    # Historial y metadatos
    assert len(order.history) == 1
    assert order.history[0].from_status == "nuevo"
    assert order.history[0].to_status == "listo_para_despachar"
    assert order.metadata["payment_intent_id"] == "pi_3P8xYz2eZvKYlo2C0abc999"
    assert order.metadata["status"] == "succeeded"


def test_normalize_stripe_synthetic_item_fallback():
    """Verifica el fallback a item sintetico CF-STRIPE-PAY cuando no hay items en metadata."""
    minimal_stripe_event = {
        "id": "evt_minimal_001",
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_min_123456",
                "amount": 4500000,
                "currency": "cop",
                "status": "succeeded",
                "metadata": {
                    "customer_name": "Juan Perez",
                    "customer_email": "juan@example.com",
                    "product_title": "Bolsa de Cafe 500g",
                },
            }
        },
    }
    order = normalize_stripe_payment_intent(minimal_stripe_event)

    assert order.id == "ORD-STP-123456"
    assert order.external_id == "pi_min_123456"
    assert order.total_amount == 45000.0
    assert len(order.items) == 1
    assert order.items[0].sku == "CF-STRIPE-PAY"
    assert order.items[0].title == "Bolsa de Cafe 500g"
    assert order.items[0].quantity == 1
    assert order.items[0].unit_price == 45000.0
    assert order.items[0].total_price == 45000.0
