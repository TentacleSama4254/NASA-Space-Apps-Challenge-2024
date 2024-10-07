// src/utils/csvToJSON.ts
import Papa from 'papaparse';

export const csvToJson = async (filePath: string) => {
  const response = await fetch(filePath);
  const csvText = await response.text();
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('Parsed Results:', results); // Log parsed results for debugging
        resolve(results.data);
      },
      error: (error: any) => {
        console.error('Parsing Error:', error); // Log parsing errors
        reject(error);
      },
    });
  });
};