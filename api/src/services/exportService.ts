import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';

export const exportToCSV = (data: any[], fields: string[]) => {
    const json2csvParser = new Parser({ fields });
    return json2csvParser.parse(data);
};

export const exportToExcel = async (data: any[], worksheetName: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(worksheetName);

    if (data.length > 0) {
        const columns = Object.keys(data[0]).map((key) => ({
            header: key.charAt(0).toUpperCase() + key.slice(1),
            key: key,
            width: 20,
        }));
        worksheet.columns = columns;
        worksheet.addRows(data);
    }

    return await workbook.xlsx.writeBuffer();
};
