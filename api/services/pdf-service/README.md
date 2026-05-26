# Invoice PDF Generation Microservice

A dedicated, production-ready microservice built with Express.js and `pdfmake` to generate professional-grade invoice PDFs.

## ✨ Features

- **Professional Design**: Zebra-striped rows, bold headers, and clean typography.
- **Auto-Calculations**: Taxes and totals are automatically calculated if not provided.
- **Validation**: Strict schema enforcement using `Joi`.
- **Dynamic Filenames**: Generated PDFs follow the pattern `Invoice_[Number]_[Date].pdf`.
- **CORS Enabled**: Ready to be consumed by any modern frontend (React/Vue/Angular).

## 🚀 Quick Start

### 1. Installation

```bash
cd services/pdf-service
npm install
```

### 2. Run the Service
```bash
# Start in production mode
npm start

# Start in development mode (nodemon)
npm run dev
```
The service will be available at `http://localhost:5001`.

## 📡 API Reference

### Health Check
`GET /api/health`
- **Response**: `200 OK`
```json
{ "status": "success", "message": "PDF Service is healthy" }
```

### Create PDF
`POST /api/invoice/pdf`
- **Payload**: See `sample-invoice-data.json`
- **Response**: Streamed PDF file.

## 🛠 Integration Examples

### cURL
```bash
curl -X POST http://localhost:5001/api/invoice/pdf \
-H "Content-Type: application/json" \
-d @sample-invoice-data.json --output invoice.pdf
```

### JavaScript/Axios (Frontend)
```javascript
const generatePDF = async (invoiceData) => {
  const response = await axios.post('http://localhost:5001/api/invoice/pdf', invoiceData, {
    responseType: 'blob'
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Invoice_${invoiceData.invoice.number}.pdf`);
  document.body.appendChild(link);
  link.click();
};
```

---
*Built for Modern Invoice Managers*
