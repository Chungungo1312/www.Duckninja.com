import React from 'react';

interface ExportButtonProps {
  onExport?: () => void;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onExport }) => {
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      alert('Función de exportación no implementada');
    }
  };

  return (
    <button 
      onClick={handleExport}
      style={{
        padding: '10px 20px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px'
      }}
    >
      Exportar Video
    </button>
  );
};

export default ExportButton;
