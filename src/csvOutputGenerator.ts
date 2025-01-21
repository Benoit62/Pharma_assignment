import fs from 'fs';
import path from 'path';
import { Assignment, CityStats } from './types';

export class CsvOutputGenerator {
    private readonly statsPath: string;
    private readonly summaryPath: string;
    private existingStatsData: Map<string, Map<number, CityStats>>;
    private existingSummaryData: Map<number, {total: number, remaining: number, percentage: number, lastRankPosition: number}>;
    private readonly evolutionColumns = [
        'Evolution moyenne (%/an)',
        'Tendance sur 3 ans (%)',
        'Min places restantes',
        'Max places restantes',
        'Volatilité',
        'Score stabilité'
    ];

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
            
            if (lines.length === 0) return;

            const headers = lines[0].split(',');
            // Find where evolution columns start
            const firstEvolutionColumnIndex = headers.findIndex(header => 
                this.evolutionColumns.includes(header.trim())
            );
            
            // If no evolution columns found, use all columns after 'Ville'
            const lastYearColumnIndex = firstEvolutionColumnIndex === -1 ? 
                headers.length : 
                firstEvolutionColumnIndex;

            // Extract only year columns (skip 'Ville' and evolution columns)
            const years = headers.slice(1, lastYearColumnIndex)
                .map(year => parseInt(year.trim()))
                .filter(year => !isNaN(year));

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                const city = values[0].trim();
                const cityData = new Map();

                years.forEach((year, index) => {
                    const statsValue = values[index + 1];
                    if (statsValue && statsValue !== '-') {
                        const [remaining, total] = statsValue?.split('/').map(v => parseInt(v));
                        if (!isNaN(remaining) && !isNaN(total)) {
                            const percentage = (remaining / total) * 100;
                            cityData.set(year, { remaining, total, percentage });
                        }
                    }
                });

                if (cityData.size > 0) {
                    this.existingStatsData.set(city, cityData);
                }
            }
        }

        // Load summary data (remains unchanged)
        if (fs.existsSync(this.summaryPath)) {
            const content = fs.readFileSync(this.summaryPath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());

            for (let i = 1; i < lines.length; i++) {
                const [year, total, remaining, percentage, lastRankPosition] = lines[i].split(',').map(v => v.trim());
                this.existingSummaryData.set(parseInt(year), {
                    total: parseInt(total),
                    remaining: parseInt(remaining),
                    percentage: parseFloat(percentage),
                    lastRankPosition: parseInt(lastRankPosition)
                });
            }
        }
    }

    private getAllYears(): number[] {
        const yearsSet = new Set<number>();
        
        // Get years from existing data
        this.existingStatsData.forEach(cityData => {
            cityData.forEach((_, year) => {
                if (!isNaN(year)) {
                    yearsSet.add(year);
                }
            });
        });

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

        // Headers with evolution metrics
        let csvContent = [
            'Ville,' + 
            years.join(',') + 
            ',' + 
            this.evolutionColumns.join(',')
        ];

        const evolutionData = this.generateEvolutionOutput();

        for (const city of cities) {
            const cityData = this.existingStatsData.get(city)!;
            const row = [city];

            // Add year data
            for (const year of years) {
                const stats = cityData.get(year);
                row.push(stats ? `${stats.remaining}/${stats.total}` : '-');
            }

            // Add evolution metrics
            const cityEvolution = evolutionData.get(city);
            if (cityEvolution) {
                row.push(
                    cityEvolution.averageEvolution.toFixed(1),
                    cityEvolution.recentTrend.toFixed(1),
                    cityEvolution.minRemaining.toString(),
                    cityEvolution.maxRemaining.toString(),
                    cityEvolution.volatility.toFixed(2),
                    cityEvolution.stabilityScore.toFixed(1)
                );
            } else {
                // Add empty evolution metrics if not enough data
                row.push(...Array(this.evolutionColumns.length).fill('-'));
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
            percentage,
            lastRankPosition: assignments[assignments.length - 1].rank
        });

        // Generate CSV content
        let csvContent = ['Année,Total Places,Places Restantes,Pourcentage Restant,Dernier Rang'];
        
        const years = Array.from(this.existingSummaryData.keys()).sort((a, b) => a - b);
        for (const year of years) {
            const data = this.existingSummaryData.get(year)!;
            csvContent.push(`${year},${data.total},${data.remaining},${data.percentage.toFixed(1)},${data.lastRankPosition}`);
        }

        fs.writeFileSync(this.summaryPath, csvContent.join('\n'));
    }

    private generateEvolutionOutput(): Map<string, {
        averageEvolution: number;
        recentTrend: number;
        minRemaining: number;
        maxRemaining: number;
        volatility: number;
        stabilityScore: number;
    }> {
        const evolutionData = new Map();
        const years = this.getAllYears();
        const cities = this.getAllCities();

        for (const city of cities) {
            const cityData = this.existingStatsData.get(city)!;
            const percentages: number[] = [];
            const remainingPlaces: number[] = [];
            const yearlyChanges: number[] = [];

            // Collect data for analysis
            for (const year of years) {
                const stats = cityData.get(year);
                if (stats) {
                    percentages.push(stats.percentage);
                    remainingPlaces.push(stats.remaining);
                }
            }

            // Skip cities with insufficient data
            if (percentages.length < 2) continue;

            // Calculate yearly changes
            for (let i = 1; i < percentages.length; i++) {
                yearlyChanges.push(percentages[i] - percentages[i - 1]);
            }

            // Calculate metrics
            const averageEvolution = yearlyChanges.reduce((a, b) => a + b, 0) / yearlyChanges.length;
            
            // Recent trend (last 3 years or all available if less than 3)
            const recentPercentages = percentages.slice(-3);
            const recentTrend = recentPercentages.length > 1 
                ? recentPercentages[recentPercentages.length - 1] - recentPercentages[0]
                : 0;

            // Min and max remaining places
            const minRemaining = Math.min(...remainingPlaces);
            const maxRemaining = Math.max(...remainingPlaces);

            // Volatility (standard deviation of yearly changes)
            // Lower volatility is better
            const avgChange = yearlyChanges.reduce((a, b) => a + b, 0) / yearlyChanges.length;
            const volatility = Math.sqrt(
                yearlyChanges.reduce((acc, val) => acc + Math.pow(val - avgChange, 2), 0) / yearlyChanges.length
            );

            // Stability score (higher is better)
            // Factors: low volatility, consistent trend, reasonable remaining places
            const stabilityScore = 100 - (
                (volatility * 10) + // Lower volatility is better
                (Math.abs(averageEvolution) * 2) + // Smaller changes are better
                (Math.abs(maxRemaining - minRemaining) / maxRemaining * 20) // Consistent remaining places is better
            );

            evolutionData.set(city, {
                averageEvolution,
                recentTrend,
                minRemaining,
                maxRemaining,
                volatility,
                stabilityScore
            });
        }

        return evolutionData;
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