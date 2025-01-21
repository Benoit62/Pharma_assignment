import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { Assignment } from './types';

export class PdfParser {
    // Liste prédéfinie des villes
    private readonly cities = [
        'Paris',
        'Montpellier',
        'Toulouse',
        'Lyon',
        'Marseille',
        'Lille',
        'Bordeaux',
        'Strasbourg',
        'Nantes',
        'Rennes',
        'Rouen',
        'Nancy',
        'Reims',
        'Dijon',
        'Poitiers',
        'Clermont-Ferrand',
        'Besançon',
        'Amiens',
        'Grenoble',
        'Tours',
        'Angers',
        'Saint-Étienne',
        'Caen',
        'Limoges',
        'Nice',
        'Brest'
    ];

    constructor(private year: number) {}

    private async readPdfFile(): Promise<Buffer> {
        const filePath = path.join(__dirname, '../input', `affectations_${this.year}.pdf`);
        try {
            return fs.readFileSync(filePath);
        } catch (error) {
            throw new Error(`Impossible de lire le fichier PDF pour l'année ${this.year}`);
        }
    }

    private preprocessText(text: string): string[] {
        const lines = text.split('\n').map(line => line.trim());
        const mergedLines: string[] = [];
        let currentLine = '';

        // Une ligne commence par un nombre
        const startsWithNumber = (str: string) => /^\d+\.?\s+/.test(str);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (startsWithNumber(line)) {
                if (currentLine) {
                    mergedLines.push(currentLine);
                }
                currentLine = line;
            } else if (currentLine && line) {
                const separator = currentLine.endsWith(' ') ? '' : ' ';
                currentLine += separator + line;
            }

            // Si la ligne se termine par un point, on la sauvegarde
            if (currentLine && currentLine.endsWith('.')) {
                mergedLines.push(currentLine);
                currentLine = '';
            }
        }

        if (currentLine) {
            mergedLines.push(currentLine);
        }

        return mergedLines;
    }

    private findCity(text: string): string | null {
        // Gestion spéciale pour Paris (AP-HP)
        if (text.includes('Assistance publique-hôpitaux de Paris')) {
            return 'Paris';
        }

        // Recherche des autres villes
        for (const city of this.cities) {
            if (text.includes(city)) {
                return city;
            }
        }

        return null;
    }

    private parseLine(line: string): Assignment | null {
        // Vérifie si la ligne commence par un nombre et se termine par un point
        const numberMatch = line.match(/^\d+\.?\s+/);
        if (!numberMatch || !line.endsWith('.')) {
            return null;
        }

        const rank = parseInt(numberMatch.toString());
        
        // Détermination de la spécialité
        const specialty = line.includes('biologie médicale') ? 'biologie médicale' : 
                         line.includes('pharmacie hospitalière') ? 'pharmacie hospitalière' : 
                         null;
                         
        if (!specialty) {
            return null;
        }

        // Recherche de la ville
        const city = this.findCity(line);
        if (!city) {
            console.log(`Attention: Ville non trouvée dans la ligne: ${line}`);
            return null;
        }

        return {
            rank,
            specialty,
            city
        };
    }

    public async parseAssignments(): Promise<Assignment[]> {
        const dataBuffer = await this.readPdfFile();
        const data = await pdf(dataBuffer);
        
        const processedLines = this.preprocessText(data.text);
        const assignments: Assignment[] = [];

        for (const line of processedLines) {
            const assignment = this.parseLine(line);
            if (assignment) {
                assignments.push(assignment);
            }
        }

        // Statistiques de parsing
        console.log(`Nombre total de lignes traitées: ${processedLines.length}`);
        console.log(`Nombre d'affectations trouvées: ${assignments.length}`);

        return assignments;
    }

    // Méthode pour ajouter de nouvelles villes si nécessaire
    public addCity(city: string): void {
        if (!this.cities.includes(city)) {
            this.cities.push(city);
        }
    }
}