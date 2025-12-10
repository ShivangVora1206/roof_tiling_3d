import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AppState } from '../store';
import { calculateEstimates } from './calculations';

export const generateInvoice = (state: AppState) => {
    const doc = new jsPDF();
    const estimates = calculateEstimates(
        state.points,
        state.obstacles,
        state.materialCostPerSqMeter,
        state.roofHeight,
        state.tileSize
    );

    // -- Header --
    doc.setFontSize(22);
    doc.setTextColor(33, 33, 33);
    doc.text('ROOF PLANNER', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Invoice & Estimate', 14, 28);
    
    // -- Date --
    const dateStr = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.text(`Date: ${dateStr}`, 160, 20);

    // -- Line --
    doc.setDrawColor(200);
    doc.line(14, 32, 196, 32);

    // -- Project Details --
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Project Summaries', 14, 42);

    const tableData = [
        ['Total Roof Area', `${estimates.totalArea.toFixed(2)} m²`],
        ['Roof Height', `${state.roofHeight} m`],
        ['Tile Size', `${state.tileSize} m`],
        ['Wall Thickness', `${state.wallThickness} m`],
        ['Material Cost', `$${state.materialCostPerSqMeter} / m²`],
        ['Tiles Needed', `${estimates.tileCount.toLocaleString()}`],
    ];

    autoTable(doc, {
        startY: 48,
        head: [['Description', 'Value']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] },
        styles: { fontSize: 10 },
    });

    // -- Total Cost Highlight --
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Estimated Cost', 14, finalY);
    
    doc.setFontSize(16);
    doc.setTextColor(34, 197, 94); // Green-ish
    doc.text(`$${estimates.totalCost.toLocaleString()}`, 196, finalY, { align: 'right' });

    // -- Footer --
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('Thank you for using Roof Planner Pro.', 105, 280, { align: 'center' });

    return doc;
};
