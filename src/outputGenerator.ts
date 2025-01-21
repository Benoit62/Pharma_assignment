import fs from 'fs';
import path from 'path';
import { Assignment, CityStats } from './types';

export class OutputGenerator {
    constructor(private year: number) {}

    public generateOutput(
        assignments: Assignment[],
        cityStats: Map<string, CityStats>,
        fromRank: number
    ): void {
        const outputPath = path.join(__dirname, '../output', `resultats_${this.year}.txt`);
        let output = '';

        // En-tête
        output += `Analyse des affectations en biologie médicale - Année ${this.year}\n`;
        output += `==========================================\n\n`;

        // Liste des affectations
        output += 'Liste des affectations :\n';
        output += '------------------------\n';
        assignments.forEach(assignment => {
            output += `${assignment.rank} - ${assignment.city}\n`;
        });
        output += '\n';

        // Statistiques Globales
        const totalAssignments = assignments.length;
        const remainingAssignments = assignments.filter(a => a.rank >= fromRank).length;
        const percentage = (remainingAssignments / totalAssignments) * 100;
        output += `Statistiques globales :\n`;
        output += '----------------------\n';
        output += `Total des places: ${totalAssignments}\n`;
        output += `Places restantes: ${remainingAssignments}\n`;
        output += `Pourcentage restant: ${percentage.toFixed(2)}%\n\n`;
        output += '----------------------------------------\n\n';
        output += '\n';

        // Statistiques par ville
        output += `Statistiques par ville à partir du rang ${fromRank} :\n`;
        output += '----------------------------------------\n';
        cityStats.forEach((stats, city) => {
            output += `${city}:\n`;
            output += `  Total des places: ${stats.total}\n`;
            output += `  Places restantes: ${stats.remaining} / ${stats.total}\n`;
            output += `  Pourcentage restant: ${stats.percentage.toFixed(2)}%\n\n`;
        });

        // Écriture dans le fichier
        fs.writeFileSync(outputPath, output, 'utf8');
    }
}