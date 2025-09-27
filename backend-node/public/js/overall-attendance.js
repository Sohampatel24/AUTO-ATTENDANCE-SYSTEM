// ✅ Parse JSON injected by EJS
const subjects = JSON.parse(document.getElementById("subjects-data").textContent);
const studentStats = JSON.parse(document.getElementById("student-stats-data").textContent);
const totalLectures = JSON.parse(document.getElementById("lectures-data").textContent);

// ✅ Function to download table as Excel
function downloadExcel() {
  const table = document.getElementById("attendanceTable");
  const wb = XLSX.utils.table_to_book(table, { sheet: "Attendance", raw: true });

  const ws = wb.Sheets["Attendance"];
  Object.keys(ws).forEach(key => {
    if (key[0] === "!") return; 
    const cell = ws[key];
    if (typeof cell.v === "number") {
      cell.t = "n"; 
    } else {
      cell.t = "s"; 
    }
  });

  XLSX.writeFile(wb, "Student_Attendance.xlsx");
}

// ✅ Calculate subject-wise attendance
const attendedPercent = subjects.map(s => {
  const total = studentStats.length * (totalLectures[s] || 1);
  const attended = studentStats.reduce((sum, row) => sum + row.subjWise[s], 0);
  return total ? (attended / total) * 100 : 0;
});

const missedPercent = attendedPercent.map(p => 100 - p);

// ✅ Initialize bar chart
const ctxBar = document.getElementById("subjectBarChart").getContext("2d");
new Chart(ctxBar, {
  type: "bar",
  data: {
    labels: subjects,
    datasets: [
      { 
        label: "Attended (%)", 
        data: attendedPercent, 
        backgroundColor: "#4CAF50",
        borderColor: "#388E3C",
        borderWidth: 1
      },
      { 
        label: "Missed (%)", 
        data: missedPercent, 
        backgroundColor: "#E74C3C",
        borderColor: "#C0392B",
        borderWidth: 1
      }
    ]
  },
  options: {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.dataset.label + ": " + context.raw.toFixed(1) + "%";
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        beginAtZero: true,
        max: 100,
        ticks: { 
          callback: value => value + "%" 
        },
        title: { 
          display: true, 
          text: 'Attendance Percentage',
          font: { weight: 'bold' }
        }
      },
      y: {
        stacked: true,
        title: { 
          display: true, 
          text: 'Subjects',
          font: { weight: 'bold' }
        }
      }
    }
  }
});
