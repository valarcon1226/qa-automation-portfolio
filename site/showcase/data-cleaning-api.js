window.SHOWCASE = {
  headline:
    "Cleaned a 5-row messy client spreadsheet into 3 deduplicated, trimmed records with filled blanks—and caught an invalid negative age during rule validation.",
  source: "demo-output/showcase-run.txt",
  blocks: [
    {
      type: "stats",
      title: "Cleaning & validation run",
      caption:
        "Processed messy_clients.csv and checked customer records against built-in quality rules.",
      items: [
        {
          label: "Raw input rows",
          value: 5,
          note: "Included empty line & duplicate entry",
          tone: "info",
        },
        {
          label: "Clean rows output",
          value: 3,
          note: "Whitespace trimmed & missing values filled",
          tone: "good",
        },
        {
          label: "Junk rows removed",
          value: 2,
          note: "1 blank row + 1 duplicate dropped",
          tone: "warn",
        },
        {
          label: "Rule errors caught",
          value: 1,
          note: "Flagged age = -5 as invalid",
          tone: "bad",
        },
      ],
    },
    {
      type: "before_after",
      title: "Messy spreadsheet input vs. cleaned data",
      caption:
        "Removed extra spaces, dropped repeated and empty rows, and replaced blank ages with 0.",
      before: {
        "Row 1 (spaces)": "\"  Ana Garcia  \" · Bogota · age 30",
        "Row 2 (blank)": "Empty row (,,,,)",
        "Row 3 (duplicate)": "Exact repeat of Ana Garcia",
        "Row 4 (missing age)": "\"  Luis Perez \" · Medellin · age blank",
      },
      after: {
        "Row 1 (clean)": "Ana Garcia · Bogota · age 30",
        "Blank row": "Removed automatically",
        "Duplicate row": "Deduplicated (1 record kept)",
        "Row 4 (filled)": "Luis Perez · Medellin · age 0",
      },
    },
    {
      type: "table",
      title: "Cleaned records & validation check results",
      columns: ["Client ID", "Full Name", "City", "Age", "Quality Check"],
      rows: [
        ["1", "Ana Garcia", "Bogota", "30", "Clean & valid"],
        ["2", "Luis Perez", "Medellin", "0 (filled)", "Clean & valid"],
        ["3", "Maria Lopez", "Cali", "25", "Clean & valid"],
        ["2 (validation test)", "Luis Perez", "—", "-5", "Flagged: age below 0"],
      ],
      tones: {
        "Clean & valid": "good",
        "Flagged: age below 0": "bad",
      },
    },
  ],
};
