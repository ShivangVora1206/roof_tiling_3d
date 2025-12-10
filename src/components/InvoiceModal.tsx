import React from 'react';
import { X, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfDoc: jsPDF | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, pdfDoc }) => {
    if (!isOpen || !pdfDoc) return null;

    const pdfBlobUrl = pdfDoc.output('bloburl').toString();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 rounded-t-2xl">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                        <FileText className="text-blue-400" />
                        Invoice Preview
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 bg-slate-800 p-1">
                    <iframe 
                        src={pdfBlobUrl} 
                        className="w-full h-full rounded-lg bg-white"
                        title="Invoice Preview"
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-slate-900 rounded-b-2xl">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Close
                    </button>
                    <button 
                        onClick={() => {
                            pdfDoc.save(`invoice_${Date.now()}.pdf`);
                            onClose();
                        }}
                        className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                    >
                        <Download size={16} />
                        Download Invoice
                    </button>
                </div>
            </div>
        </div>
    );
};
