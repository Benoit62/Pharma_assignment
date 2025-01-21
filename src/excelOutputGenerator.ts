import ExcelJS from 'exceljs';
import path from 'path';
import { Assignment, CityStats } from './types';

export class ExcelOutputGenerator {
    private readonly workbook: ExcelJS.Workbook;
    private readonly statsSheet: ExcelJS.Worksheet;
    private readonly summarySheet: ExcelJS.Worksheet;
    private citiesOrder: string[] = []; // To maintain consistent city order

    constructor() {
        this.workbook = new ExcelJS.Workbook();
        this.statsSheet = this.workbook.addWorksheet('Statistiques par ville');
        this.summarySheet = this.workbook.addWorksheet('Résumé global');
        this.initializeWorkbook();
    }

    private initializeWorkbook(): void {
        // Configuration du style des en-têtes
        const headerStyle = {
            font: { bold: true },
            fill: {
                type: 'pattern' as const,
                pattern: 'solid' as const,
                fgColor: { argb: 'FFD3D3D3' }
            },
            alignment: { horizontal: 'center' as const }
        };

        // En-têtes pour la feuille de statistiques
        this.statsSheet.getRow(1).getCell(1).value = 'Ville';
        this.statsSheet.getRow(1).font = { bold: true };
        this.statsSheet.getColumn(1).width = 20;

        // En-têtes pour la feuille de résumé
        this.summarySheet.columns = [
            { header: 'Année', key: 'year', width: 10 },
            { header: 'Total Places', key: 'total', width: 15 },
            { header: 'Places Restantes', key: 'remaining', width: 15 },
            { header: 'Pourcentage Restant', key: 'percentage', width: 20 }
        ];

        // Appliquer le style aux en-têtes
        this.statsSheet.getRow(1).eachCell(cell => {
            Object.assign(cell, headerStyle);
        });
        this.summarySheet.getRow(1).eachCell(cell => {
            Object.assign(cell, headerStyle);
        });
    }

    private updateCitiesOrder(cities: string[]): void {
        // Get new cities not in the current order
        const newCities = cities.filter(city => !this.citiesOrder.includes(city));
        
        // Add new cities to the order
        if (newCities.length > 0) {
            this.citiesOrder = [...this.citiesOrder, ...newCities];
            // Sort the complete list alphabetically
            this.citiesOrder.sort((a, b) => a.localeCompare(b, 'fr'));
        }
    }

    private async updateYearColumn(
        year: number,
        cityStats: Map<string, CityStats>,
        fromRank: number
    ): Promise<void> {
        const yearColumn = this.findOrCreateYearColumn(year);
        
        // Update cities order with any new cities
        this.updateCitiesOrder(Array.from(cityStats.keys()));

        // Update statistics for each city in the sorted order
        this.citiesOrder.forEach((city, index) => {
            const rowIndex = index + 2;
            const stats = cityStats.get(city);
            
            // Add city in the first column if it's a new row
            this.statsSheet.getCell(rowIndex, 1).value = city;
            
            // Add statistics if available for this city
            if (stats) {
                const cellValue = `${stats.remaining}/${stats.total}\n(${stats.percentage.toFixed(1)}%)`;
                const cell = this.statsSheet.getCell(rowIndex, yearColumn);
                cell.value = cellValue;
                cell.alignment = { 
                    wrapText: true, 
                    vertical: 'middle', 
                    horizontal: 'center' 
                };
            } else {
                // Clear cell if no data for this city/year combination
                this.statsSheet.getCell(rowIndex, yearColumn).value = '-';
            }
        });

        // Adjust column width
        this.statsSheet.getColumn(yearColumn).width = 15;
    }

    private findOrCreateYearColumn(year: number): number {
        const headerRow = this.statsSheet.getRow(1);
        let yearColumn = 2; // First column after "Ville"
        
        while (headerRow.getCell(yearColumn).value !== null) {
            if (headerRow.getCell(yearColumn).value === year.toString()) {
                return yearColumn;
            }
            yearColumn++;
        }
        
        return yearColumn;
    }

    private updateSummary(
        year: number,
        assignments: Assignment[],
        fromRank: number
    ): void {
        const totalAssignments = assignments.length;
        const remainingAssignments = assignments.filter(a => a.rank >= fromRank).length;
        const percentage = (remainingAssignments / totalAssignments) * 100;

        // Find existing row for this year or create new one
        let rowIndex = 2;
        while (rowIndex <= this.summarySheet.rowCount) {
            const yearCell = this.summarySheet.getRow(rowIndex).getCell(1);
            if (yearCell.value === year) {
                break;
            }
            if (yearCell.value === null) {
                break;
            }
            rowIndex++;
        }

        // Update or add row
        const row = this.summarySheet.getRow(rowIndex);
        row.getCell(1).value = year;
        row.getCell(2).value = totalAssignments;
        row.getCell(3).value = remainingAssignments;
        row.getCell(4).value = `${percentage.toFixed(1)}%`;

        // Sort summary rows by year
        const summaryData = [];
        for (let i = 2; i <= this.summarySheet.rowCount; i++) {
            const row = this.summarySheet.getRow(i);
            if (row.getCell(1).value) {
                summaryData.push({
                    year: row.getCell(1).value,
                    total: row.getCell(2).value,
                    remaining: row.getCell(3).value,
                    percentage: row.getCell(4).value
                });
            }
        }

        // Sort and rewrite summary data
        summaryData.sort((a, b) => Number(a.year) - Number(b.year));
        summaryData.forEach((data, index) => {
            const row = this.summarySheet.getRow(index + 2);
            row.getCell(1).value = data.year;
            row.getCell(2).value = data.total;
            row.getCell(3).value = data.remaining;
            row.getCell(4).value = data.percentage;
        });
    }

    public async generateOutput(
        year: number,
        assignments: Assignment[],
        cityStats: Map<string, CityStats>,
        fromRank: number
    ): Promise<void> {
        await this.updateYearColumn(year, cityStats, fromRank);
        this.updateSummary(year, assignments, fromRank);

        const outputPath = path.join(__dirname, '../output', 'statistiques_internat.xlsx');
        await this.workbook.xlsx.writeFile(outputPath);
    }
}