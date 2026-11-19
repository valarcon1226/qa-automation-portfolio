"""
Script para generar archivos Excel de prueba desordenados con datos ficticios
de siniestros y bienes asegurados.
Incluye:
  - Varias hojas (portada/instrucciones, hoja de datos, auditoria/firmas)
  - Encabezados combinados en dos filas
  - Filas de titulo antes del encabezado
  - Filas de subtotales y totales
  - Filas vacias intercaladas
  - Fechas y montos en formatos mezclados
"""
from datetime import date, datetime
from pathlib import Path
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment


def create_siniestros_excel(filepath: Path) -> Path:
    wb = openpyxl.Workbook()

    # Hoja 1: Portada y Control (Metadatos que no deben elegirse como hoja de datos)
    ws_cover = wb.active
    ws_cover.title = "Portada y Control"
    ws_cover["A1"] = "COMPAÑÍA DE SEGUROS LA CONFIANZA S.A. - REGISTRO DE SINIESTROS"
    ws_cover["A1"].font = Font(size=14, bold=True)
    ws_cover["A3"] = "Versión de reporte: 2.1"
    ws_cover["A4"] = "Fecha de emisión: 12/11/2026"
    ws_cover["A5"] = "Instrucciones: El detalle operativo se encuentra en la hoja 'Siniestros Autos y Hogar'."

    # Hoja 2: Siniestros Autos y Hogar (Hoja principal con datos tabulares desordenados)
    ws_data = wb.create_sheet(title="Siniestros Autos y Hogar")

    # Filas de titulo antes del encabezado
    ws_data["A1"] = "SISTEMA INTEGRAL DE SINIESTROS - LISTADO OPERATIVO NACIONAL"
    ws_data["A1"].font = Font(size=13, bold=True)
    ws_data["A2"] = "Reporte mensual consolidado para auditoría interna y liquidaciones"
    ws_data["A2"].font = Font(size=10, italic=True)
    # Fila 3 vacia intercalada

    # Encabezados combinados en dos filas (Filas 4 y 5)
    # Fila 4: Nivel superior
    ws_data["A4"] = "Datos del Asegurado"
    ws_data["B4"] = None
    ws_data.merge_cells("A4:B4")

    ws_data["C4"] = "Canales de Contacto"
    ws_data["D4"] = None
    ws_data.merge_cells("C4:D4")

    ws_data["E4"] = "Aseguradora"
    ws_data["F4"] = "Póliza / Siniestro"
    ws_data["G4"] = "Ocurrencia"
    ws_data["H4"] = "Liquidación"

    # Fila 5: Nivel secundario
    ws_data["A5"] = "Nombre"
    ws_data["B5"] = "Apellido"
    ws_data["C5"] = "Correo Electrónico"
    ws_data["D5"] = "Teléfono"
    ws_data["E5"] = "Compañía"
    ws_data["F5"] = "Número Referencia"
    ws_data["G5"] = "Fecha Siniestro"
    ws_data["H5"] = "Monto Reclamado"

    # Estilos de encabezado
    header_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    for row in ws_data["A4:H5"]:
        for cell in row:
            cell.fill = header_fill
            cell.font = Font(bold=True)
            cell.alignment = Alignment(horizontal="center", vertical="center")

    # Filas de datos (mezcla de limpio, ambiguo, fallido, vacias, subtotales, totales)
    # Formatos mezclados de fechas y montos
    data_rows = [
        # Fila 6: Limpio (fecha ISO, monto formato $ ...)
        ("Carlos", "Mendez", "carlos.mendez@example.com", "+1-555-0198", "Acme Corp", "SIN-001", "2026-02-14", "$ 1,500.00"),
        # Fila 7: Ambiguo (falta compañia, dominio email sin punto, fecha DD/MM/YYYY, monto USD ...)
        ("Ana", "Smith", "ana.smith@smith", "555-0199", "", "SIN-002", "15/03/2026", "USD 2.300,50"),
        # Fila 8: Fallido (sin nombres, email invalido, fecha YYYY/MM/DD, monto float numérico)
        ("", "", "invalid-email", "", "Seguros Alfa", "SIN-003", "2026/04/01", 850.0),
        # Fila 9: Fila vacia intercalada
        (None, None, None, None, None, None, None, None),
        # Fila 10: Limpio (fecha objeto date, monto int puro)
        ("Maria", "Lopez", "maria.lopez@example.com", "+1-555-0211", "Global Logistics", "SIN-004", date(2026, 5, 5), 4500),
        # Fila 11: Subtotal
        ("SUBTOTAL RAMO AUTOMOTOR", "", "", "", "", "", "", "$ 9,150.50"),
        # Fila 12: Fila vacia intercalada
        (None, None, None, None, None, None, None, None),
        # Fila 13: Limpio (fecha datetime con hora, monto float)
        ("Roberto", "Gomez", "roberto.gomez@empresa.org", "555-0322", "Apex Retail", "SIN-005", datetime(2026, 6, 18, 10, 30), 12000.75),
        # Fila 14: Ambiguo (email sin punto en dominio, fecha YYYY-MM-DD, monto $ ...)
        ("Laura", "Fernandez", "laura@fernandez", "+1-555-0433", "Orion Tech", "SIN-006", "2026-07-22", "$ 3.200"),
        # Fila 15: Total General
        ("TOTAL GENERAL SINIESTROS", "", "", "", "", "", "", "$ 24,351.25"),
    ]

    for row_idx, row_values in enumerate(data_rows, start=6):
        for col_idx, val in enumerate(row_values, start=1):
            ws_data.cell(row=row_idx, column=col_idx, value=val)

    # Hoja 3: Resumen Auditoria
    ws_audit = wb.create_sheet(title="Resumen Auditoría")
    ws_audit["A1"] = "RESUMEN ESTADÍSTICO DE SINIESTROS"
    ws_audit["A3"] = "Total siniestros reportados: 5"
    ws_audit["A4"] = "Estado: En revisión de liquidaciones"

    wb.save(filepath)
    return filepath


def create_bienes_asegurados_excel(filepath: Path) -> Path:
    wb = openpyxl.Workbook()

    # Hoja 1: Instrucciones
    ws_inst = wb.active
    ws_inst.title = "Instrucciones"
    ws_inst["A1"] = "GUÍA DE CARGA DE BIENES ASEGURADOS"
    ws_inst["A3"] = "Para consultar el inventario patrimonial activo, dirigirse a la hoja 'Bienes Asegurados'."

    # Hoja 2: Bienes Asegurados (Hoja principal)
    ws_data = wb.create_sheet(title="Bienes Asegurados")

    # Filas de titulo antes del encabezado
    ws_data["A1"] = "PADRÓN GENERAL DE BIENES PATRIMONIALES ASEGURADOS"
    ws_data["A1"].font = Font(size=13, bold=True)
    ws_data["A2"] = "Ejercicio Fiscal 2026 - Pólizas de Transporte y Propiedad"
    ws_data["A2"].font = Font(size=10, italic=True)
    # Fila 3 vacia intercalada

    # Encabezados combinados en dos filas (Filas 4 y 5)
    ws_data["A4"] = "Titular del Activo"
    ws_data["B4"] = None
    ws_data.merge_cells("A4:B4")

    ws_data["C4"] = "Contacto Directo"
    ws_data["D4"] = None
    ws_data.merge_cells("C4:D4")

    ws_data["E4"] = "Corporación"
    ws_data["F4"] = "Identificación"
    ws_data["G4"] = "Vigencia"
    ws_data["H4"] = "Valoración"

    ws_data["A5"] = "Primer Nombre"
    ws_data["B5"] = "Primer Apellido"
    ws_data["C5"] = "Email"
    ws_data["D5"] = "Teléfono"
    ws_data["E5"] = "Empresa"
    ws_data["F5"] = "Descripción Bien"
    ws_data["G5"] = "Fecha Alta"
    ws_data["H5"] = "Valor Asegurado"

    header_fill = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
    for row in ws_data["A4:H5"]:
        for cell in row:
            cell.fill = header_fill
            cell.font = Font(bold=True)
            cell.alignment = Alignment(horizontal="center", vertical="center")

    # Datos ficticios de bienes asegurados
    data_rows = [
        # Fila 6: Limpio
        ("Diego", "Morales", "diego.morales@example.com", "+1-555-0555", "Andes Mining", "Camión Minero Caterpillar 797F", "2026-01-10", "$ 85,000.00"),
        # Fila 7: Ambiguo (falta empresa, email sin punto)
        ("Sofia", "Castro", "sofia@castro", "555-0666", "", "Generador Diésel Cummins 500kVA", "28/02/2026", "USD 120.000,00"),
        # Fila 8: Fallido (sin nombres, email invalido)
        ("", "", "correo-invalido", "", "Soluciones Industriales", "Transformador Eléctrico 25MVA", "2026-03-12", 15000.0),
        # Fila 9: Vacia intercalada
        (None, None, None, None, None, None, None, None),
        # Fila 10: Limpio
        ("Javier", "Ruiz", "javier.ruiz@example.com", "+1-555-0777", "Transportes Norte", "Semirremolque Frigorífico", date(2026, 4, 15), 350000.5),
        # Fila 11: Subtotal
        ("SUBTOTAL FLOTA PESADA", "", "", "", "", "", "", "$ 570,000.50"),
        # Fila 12: Vacia intercalada
        (None, None, None, None, None, None, None, None),
        # Fila 13: Limpio
        ("Elena", "Vega", "elena.vega@example.com", "+1-555-0888", "Farmacéutica Sur", "Línea de Envasado Automatizada", "2026-05-20", "$ 95,000.00"),
        # Fila 14: Total
        ("TOTAL GENERAL BIENES", "", "", "", "", "", "", "$ 665,000.50"),
    ]

    for row_idx, row_values in enumerate(data_rows, start=6):
        for col_idx, val in enumerate(row_values, start=1):
            ws_data.cell(row=row_idx, column=col_idx, value=val)

    # Hoja 3: Firmas y Responsables
    ws_signatures = wb.create_sheet(title="Firmas y Responsables")
    ws_signatures["A1"] = "Aprobado por Dirección de Activos y Finanzas"

    wb.save(filepath)
    return filepath


def main():
    base_dir = Path(__file__).resolve().parent
    siniestros_path = base_dir / "listado_siniestros_desordenado.xlsx"
    bienes_path = base_dir / "bienes_asegurados_desordenado.xlsx"

    create_siniestros_excel(siniestros_path)
    print(f"Generado exitosamente: {siniestros_path}")

    create_bienes_asegurados_excel(bienes_path)
    print(f"Generado exitosamente: {bienes_path}")


if __name__ == "__main__":
    main()
