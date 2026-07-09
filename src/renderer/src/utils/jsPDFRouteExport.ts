import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export const exportRouteToPDF = (route: any) => {
    const doc = new jsPDF()

    // Configuracion
    const pageWidth = doc.internal.pageSize.getWidth()
    const primaryColor: [number, number, number] = [249, 115, 22] // naranja-500
    const darkColor: [number, number, number] = [15, 23, 42] // pizarra-900

    // Encabezados
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
    doc.text('BAMX Planner', 14, 25)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Hoja de ruta para conductor', 14, 32)

    // Caja de resumen de la ruta
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(250, 250, 250)
    doc.roundedRect(14, 40, pageWidth - 28, 40, 3, 3, 'FD')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
    doc.text('DATOS DE LA RUTA', 20, 50)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)
    doc.text(`Fecha: ${route.date}`, 20, 60)
    doc.text(`Ruta: #${route.id} (${route.type || 'Entrega'})`, 20, 67)
    
    const truckInfo = route.truck_name || (route.truck ? `${route.truck.brand} ${route.truck.model}` : `ID ${route.truck_id}`)
    const driverInfo = route.driver_name || (route.driver ? route.driver.name : `ID ${route.driver_id}`)
    
    doc.text(`Unidad: ${truckInfo}`, 100, 60)
    doc.text(`Chofer: ${driverInfo}`, 100, 67)

    // Preparar datos de la tabla
    let currentY = 90
    
    // AutoTable para las paradas (con CEDIS al inicio y final)
    const stopsData: any[] = []
    if (route.stops && route.stops.length > 0) {
        stopsData.push([
            '▶',
            'Almacén',
            'CEDIS BAMX (C. Iturbide 1407, San José, Nuevo Laredo)',
            'Inicio de Ruta',
            '-',
            ''
        ])
        route.stops.forEach((stop: any, idx: number) => {
            stopsData.push([
                idx + 1,
                stop.stop_type || stop.type,
                `${stop.stop_name || stop.name || `ID ${stop.stop_id}`}${stop.lat && stop.lng ? `\nMaps: https://www.google.com/maps?q=${stop.lat},${stop.lng}` : ''}`,
                stop.volume ? `${stop.volume} Unidades` : 'Por definir',
                stop.recovery_fee > 0 ? `$${stop.recovery_fee}` : '-',
                '' // Firma
            ])
        })
        stopsData.push([
            '■',
            'Almacén',
            'CEDIS BAMX (C. Iturbide 1407, San José, Nuevo Laredo)',
            'Fin de Ruta',
            '-',
            ''
        ])
    }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('Itinerario', 14, currentY - 5)

    autoTable(doc, {
        startY: currentY,
        head: [['Paso', 'Tipo', 'Destino / ubicación', 'Volumen', 'Cuota', 'Firma']],
        body: stopsData,
        theme: 'grid',
        headStyles: {
            fillColor: darkColor,
            textColor: 255,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // pizarra-50
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 30 },
            5: { cellWidth: 40 } // Caja de firma
        },
        styles: {
            fontSize: 9,
            cellPadding: 4
        }
    })

    // Pie de pagina
    // @ts-ignore
    const finalY = (doc as any).lastAutoTable.finalY + 20
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Documento de uso interno. Confirma cambios con la persona responsable de planeación.', 14, finalY)
    doc.text('Generado por BAMX Planner', 14, finalY + 5)

    // Guardar
    doc.save(`Ruta_BAMX_${route.date}_U${route.truck_id}.pdf`)
}

export const exportMonthlyPlanToPDF = (plan: any, monthName: string, year: number) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const darkColor: [number, number, number] = [15, 23, 42]

    // Pagina de titulo
    doc.setFontSize(30)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
    doc.text('BAMX Planner', pageWidth / 2, 80, { align: 'center' })
    
    doc.setFontSize(20)
    doc.setTextColor(249, 115, 22) // naranja-500
    doc.text(`Planeación mensual: ${monthName} ${year}`, pageWidth / 2, 95, { align: 'center' })
    
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    doc.text('Itinerario de rutas guardadas para el periodo seleccionado.', pageWidth / 2, 110, { align: 'center' })
    
    // Agregar pagina para cada dia con rutas
    plan.days.forEach((day: any, idx: number) => {
        const hasStops = day.truckA.stops.length > 0 || day.truckB.stops.length > 0
        if (!hasStops) return

        doc.addPage()
        
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
        doc.text(`Día ${idx + 1}: ${day.date}`, 14, 20)
        
        let currentY = 30

        // Camion A
        if (day.truckA.stops.length > 0) {
            doc.setFontSize(12)
            doc.setTextColor(249, 115, 22)
            doc.text(`RUTA A${day.truckA.driverName ? ` - ${day.truckA.driverName}` : ''}`, 14, currentY)
            
            const stopsA = [
                ['▶', 'Almacén', 'CEDIS BAMX (Salida)'],
                ...day.truckA.stops.map((s: any, i: number) => [i + 1, s.type, s.name]),
                ['■', 'Almacén', 'CEDIS BAMX (Llegada)']
            ]
            autoTable(doc, {
                startY: currentY + 5,
                head: [['#', 'Tipo', 'Destino']],
                body: stopsA,
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42] as [number, number, number] },
                styles: { fontSize: 8 }
            })
            // @ts-ignore
            currentY = (doc as any).lastAutoTable.finalY + 15
        }

        // Camion B
        if (day.truckB.stops.length > 0) {
            if (currentY > 250) {
                doc.addPage()
                currentY = 20
            }
            doc.setFontSize(12)
            doc.setTextColor(37, 99, 235) // azul-600
            doc.text(`RUTA B${day.truckB.driverName ? ` - ${day.truckB.driverName}` : ''}`, 14, currentY)
            
            const stopsB = [
                ['▶', 'Almacén', 'CEDIS BAMX (Salida)'],
                ...day.truckB.stops.map((s: any, i: number) => [i + 1, s.type, s.name]),
                ['■', 'Almacén', 'CEDIS BAMX (Llegada)']
            ]
            autoTable(doc, {
                startY: currentY + 5,
                head: [['#', 'Tipo', 'Destino']],
                body: stopsB,
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42] as [number, number, number] },
                styles: { fontSize: 8 }
            })
        }
    })

    doc.save(`Plan_BAMX_${monthName}_${year}.pdf`)
}
