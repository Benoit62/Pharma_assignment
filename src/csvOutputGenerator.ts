import fs from 'fs';
import path from 'path';
import { Assignment, CityStats } from './types';

export class CsvOutputGenerator {
    private readonly statsPath: string;
    private readonly summaryPath: string;
    private existingStatsData: Map<string, Map<number, CityStats>>;
    private existingSummaryData: Map<number, {total: number, remaining: number, percentage: number}>;

    constructor() {
        this.statsPath = path.join(__dirname, '../output', 'statistiques_par_ville.csv');
        this.summaryPath = path.join(__dirname, '../output', 'resume_global.csv');
        this.existingStatsData = new Map();
        this.existingSummaryData = new Map();
        this.loadExistingData();
    }

    private loadExistingData(): void {
        // Load stats data
        if (fs.existsSync(this.statsPath)) {
            const content = fs.readFileSync(this.statsPath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            
            const headers = lines[0].split(',');
            const years = headers.slice(1).map(year => parseInt(year.trim()));

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                const city = values[0].trim();
                const cityData = new Map();

                years.forEach((year, index) => {
                    const [remaining, total] = values[index + 1].split('/').map(v => parseInt(v));
                    const percentage = (remaining / total) * 100;
                    cityData.set(year, { remaining, total, percentage });
                });

                this.existingStatsData.set(city, cityData);
            }
        }

        // Load summary data
        if (fs.existsSync(this.summaryPath)) {
            const content = fs.readFileSync(this.summaryPath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());

            for (let i = 1; i < lines.length; i++) {
                const [year, total, remaining, percentage] = lines[i].split(',').map(v => v.trim());
                this.existingSummaryData.set(parseInt(year), {
                    total: parseInt(total),
                    remaining: parseInt(remaining),
                    percentage: parseFloat(percentage)
                });
            }
        }
    }

    private getAllYears(): number[] {
        const yearsSet = new Set<number>();
        
        // Add years from existing data
        for (const cityData of this.existingStatsData.values()) {
            for (const year of cityData.keys()) {
                yearsSet.add(year);
            }
        }

        return Array.from(yearsSet).sort((a, b) => a - b);
    }

    private getAllCities(): string[] {
        const cities = Array.from(this.existingStatsData.keys());
        return cities.sort((a, b) => a.localeCompare(b, 'fr'));
    }

    private generateStatsOutput(
        year: number,
        newCityStats: Map<string, CityStats>
    ): void {
        // Update existing data with new data
        for (const [city, stats] of newCityStats) {
            if (!this.existingStatsData.has(city)) {
                this.existingStatsData.set(city, new Map());
            }
            this.existingStatsData.get(city)!.set(year, stats);
        }

        // Generate CSV content
        const years = this.getAllYears();
        const cities = this.getAllCities();

        let csvContent = ['Ville,' + years.join(',')];

        for (const city of cities) {
            const cityData = this.existingStatsData.get(city)!;
            const row = [city];

            for (const year of years) {
                const stats = cityData.get(year);
                row.push(stats ? `${stats.remaining}/${stats.total}` : '-');
            }

            csvContent.push(row.join(','));
        }

        fs.writeFileSync(this.statsPath, csvContent.join('\n'));
    }

    private generateSummaryOutput(
        year: number,
        assignments: Assignment[],
        fromRank: number
    ): void {
        const totalAssignments = assignments.length;
        const remainingAssignments = assignments.filter(a => a.rank >= fromRank).length;
        const percentage = (remainingAssignments / totalAssignments) * 100;

        // Update existing data
        this.existingSummaryData.set(year, {
            total: totalAssignments,
            remaining: remainingAssignments,
            percentage
        });

        // Generate CSV content
        let csvContent = ['Année,Total Places,Places Restantes,Pourcentage Restant'];
        
        const years = Array.from(this.existingSummaryData.keys()).sort((a, b) => a - b);
        for (const year of years) {
            const data = this.existingSummaryData.get(year)!;
            csvContent.push(`${year},${data.total},${data.remaining},${data.percentage.toFixed(1)}`);
        }

        fs.writeFileSync(this.summaryPath, csvContent.join('\n'));
    }

    public async generateOutput(
        year: number,
        assignments: Assignment[],
        cityStats: Map<string, CityStats>,
        fromRank: number
    ): Promise<void> {
        this.generateStatsOutput(year, cityStats);
        this.generateSummaryOutput(year, assignments, fromRank);
    }
}