// File: netlify/functions/read-leads.js
// Lee el Excel BRAVEN_TOP_50_LEADS_READY_TO_LAUNCH.xlsx y lo devuelve como JSON

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Esta función puede ser llamada internamente o como endpoint
exports.handler = async (event) => {
  try {
    // Ruta del Excel (debe estar en `/public` o una ruta accesible)
    const excelPath = path.join(process.env.PWD, 'public', 'BRAVEN_TOP_50_LEADS_READY_TO_LAUNCH.xlsx');
    
    if (!fs.existsSync(excelPath)) {
      // Si no está en public, buscar en assets o descargar desde URL
      console.warn('Excel no encontrado en:', excelPath);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Excel file not found' })
      };
    }
    
    // Leer el Excel
    const workbook = xlsx.readFile(excelPath);
    const sheetName = 'Leads para Email'; // Nombre de la hoja
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Sheet "${sheetName}" not found` })
      };
    }
    
    // Convertir a JSON
    const leads = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`✅ ${leads.length} leads leídos del Excel`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        leadsCount: leads.length,
        leads: leads
      })
    };
  } catch (error) {
    console.error('Error reading Excel:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Export función para uso interno
exports.readLeads = async () => {
  try {
    const excelPath = path.join(process.env.PWD, 'public', 'BRAVEN_TOP_50_LEADS_READY_TO_LAUNCH.xlsx');
    const workbook = xlsx.readFile(excelPath);
    const worksheet = workbook.Sheets['Leads para Email'];
    return xlsx.utils.sheet_to_json(worksheet);
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};
