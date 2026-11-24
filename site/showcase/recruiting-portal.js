window.SHOWCASE = {
  headline:
    "A recruiter opens a vacancy and sees its 3 applicants already ranked by how well they fit (sample data, not the client's).",
  blocks: [
    {
      type: "flow",
      title: "From vacancy to interview",
      steps: [
        { label: "Publish the vacancy", detail: "One form with the fields job boards require; salary and client name can be hidden." },
        { label: "Candidates apply", detail: "On the public job board, filtered by sector, city and level." },
        { label: "Applicants are ranked", detail: "Each one gets a fit score from weighted criteria." },
        { label: "Interview scheduled", detail: "Video call link and reminder from the same screen." }
      ]
    },
    {
      type: "table",
      title: "Open vacancies in the demo",
      columns: ["Role", "City", "Work mode", "Applicants"],
      rows: [
        ["Senior Financial Analyst", "Medellín", "Remote", "0"],
        ["Nursing Assistant", "Cali", "On-site", "0"],
        ["Logistics Coordinator", "Bogotá", "Hybrid", "3"]
      ]
    },
    {
      type: "bars",
      title: "How the fit score is weighted",
      caption: "The top applicant for Logistics Coordinator met every criterion: 100% fit.",
      unit: "%",
      items: [
        { label: "Experience", value: 45, tone: "info" },
        { label: "Education level", value: 25, tone: "info" },
        { label: "Salary match", value: 15, tone: "info" },
        { label: "Required skill (Excel)", value: 10, tone: "info" },
        { label: "Work mode", value: 5, tone: "info" }
      ]
    }
  ]
};
