Software for analyzing the distribution of biology pharmacy internships in different cities in France.

It takes a assignment list file in entry, and will discredit biology based interships, to analyze their repartition around a precise rank.

## Installation

Clone this project
```bash
git clone https://github.com/Benoit62/Pharma_assignment.git
```

Install all dependencies
```bash
npm install
```

Build the project
```bash
npm run build
```

Create `output` file in main directory
```bash
mkdir output
```


## Usage

Add different files you want to analyze in `input` following this naming form `affectations_{year}.pdf`.
Make sure each line of the repartition list start with `1` or `3.`

Run the analyze with
```bash
npm run start -- {year} {rank}
```

See the result in `output folder` where files follow the same naming `resultats_{year}.txt`.