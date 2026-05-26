"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportToExcel = exports.exportToCSV = void 0;
const json2csv_1 = require("json2csv");
const exceljs_1 = __importDefault(require("exceljs"));
const exportToCSV = (data, fields) => {
    const json2csvParser = new json2csv_1.Parser({ fields });
    return json2csvParser.parse(data);
};
exports.exportToCSV = exportToCSV;
const exportToExcel = async (data, worksheetName) => {
    const workbook = new exceljs_1.default.Workbook();
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
exports.exportToExcel = exportToExcel;
