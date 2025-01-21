import { PdfParser } from './pdfParser';
import { OutputGenerator } from './outputGenerator';
import { CityStats } from './types';
import { ExcelOutputGenerator } from './excelOutputGenerator';

async function main() {
    // Récupération des arguments
    const year = parseInt(process.argv[2]);
    const fromRank = parseInt(process.argv[3]);

    if (!year || !fromRank) {
        console.error('Usage: npm start -- <année> <rang>');
        process.exit(1);
    }

    try {
        // Parse du PDF
        const parser = new PdfParser(year);
        const allAssignments = await parser.parseAssignments();
        
        // Filtrage des affectations en biologie médicale
        const biologyAssignments = allAssignments.filter(
            a => a.specialty === 'biologie médicale'
        );

        // Calcul des statistiques
        const cityStats = new Map<string, CityStats>();
        biologyAssignments.forEach(assignment => {
            const current = cityStats.get(assignment.city) || 
                { total: 0, remaining: 0, percentage: 0 };
            current.total += 1;
            if (assignment.rank >= fromRank) {
                current.remaining += 1;
            }
            current.percentage = (current.remaining / current.total) * 100;
            cityStats.set(assignment.city, current);
        });

        // Génération du fichier texte de sortie
        const generator = new OutputGenerator(year);
        generator.generateOutput(biologyAssignments, cityStats, fromRank);

        // Génération du fichier Excel de sortie
        const excelGenerator = new ExcelOutputGenerator();
        await excelGenerator.generateOutput(year, biologyAssignments, cityStats, fromRank);

        console.log(`Analyse terminée. Résultats disponibles dans output/resultats_${year}.txt`);

    } catch (error) {
        console.error('Erreur lors du traitement :', error);
        process.exit(1);
    }
}

main();