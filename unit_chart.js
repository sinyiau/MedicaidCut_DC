// Data
const data = [
    { group: "Childless adults, parents and caretaker (138% - 200% FPL)", risk: "healthydc", count: 25000 },
    { group: "Childless adults, parent & caretaker (>200% FPL)", risk: "local_cut", count: 3000 },
    { group: "Childless adults, parent & caretaker (<138% FPL)", risk: "federal_work", count: 66656 },
    { group: "Childless adults, parent & caretaker (<138% FPL)", risk: "federal_uninsured", count: 32000 },
    { group: "Children (Children's Health Insurance Program)", risk: "federal_low", count: 73725 },
    { group: "Children (non-CHIP)", risk: "federal_low", count: 17486 },
    { group: "Aged, disabled and others", risk: "federal_low", count: 54382 },
];

const UNIT_SIZE = 500;
const colorByRisk = {
    healthydc: "#ffc107",       
    local_cut: "#ff0000",      
    federal_work: "#ff8a8a",
    federal_uninsured: "#750000",
    federal_low: "#008000"
};

// Flatten dataset into units
const units = [];
data.forEach(d => {
    const n = Math.round(d.count / UNIT_SIZE);
    for (let i = 0; i < n; i++) {
        units.push({ group: d.group, risk: d.risk });
    }
});

const container = document.getElementById("unitChart");

function getNumCols(containerWidth) {
    if (containerWidth < 420) return 16;
    if (containerWidth < 640) return 20;
    if (containerWidth < 900) return 40;
    return 45;
}

let svg;
let currentStep = "intro_allblue"; 

function renderChart() {
    d3.select("#unitChart").selectAll("*").remove();

    const containerWidth = container.clientWidth || window.innerWidth;
    const numCols = getNumCols(containerWidth);
    const cell = 10;
    const r = 3.2;
    const margin = { top: 8, right: 8, bottom: 12, left: 8 };

    const numRows = Math.ceil(units.length / numCols);
    const vbWidth = numCols * cell + margin.left + margin.right;
    const vbHeight = numRows * cell + margin.top + margin.bottom;

    svg = d3.select("#unitChart")
        .append("svg")
        .attr("viewBox", `0 0 ${vbWidth} ${vbHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "auto")
        .attr("role", "img")
        .attr("aria-label", "Unit chart grid");

    svg.selectAll("circle.unit")
        .data(units)
        .enter()
        .append("circle")
        .attr("class", "unit")
        .attr("cx", (d, i) => margin.left + (i % numCols) * cell + cell / 2)
        .attr("cy", (d, i) => margin.top + Math.floor(i / numCols) * cell + cell / 2)
        .attr("r", r)
        .attr("fill", "#ccc")
        .attr("opacity", 0.9)
        .on("mousemove", (event, d) => {
            showTooltip(event.pageX, event.pageY, `<strong>${d.group}</strong><br/>Risk: ${readableRisk(d.risk)}`);
        })
        .on("mouseleave", hideTooltip);

    // Apply current highlight after rendering
    updateHighlight(currentStep);
}

// Tooltip logic
function showTooltip(x, y, html) {
    let t = d3.select(".tooltip");
    if (t.empty()) {
        t = d3.select("body").append("div").attr("class", "tooltip");
    }
    t.html(html)
        .style("left", (x + 10) + "px")
        .style("top", (y + 10) + "px")
        .style("opacity", 1);
}
function hideTooltip() {
    d3.select(".tooltip").style("opacity", 0);
}

function readableRisk(key) {
    if (key === "healthydc") return "Moved to Healthy DC plan: 25,000";
    if (key === "local_cut") return "Removed from subsidized coverage: 3,000";
    if (key === "federal_work") return "Subject to federal work requirements: 98,656";
    if (key === "federal_uninsured") return "Maybe uninsured in the next decade: 32,000";
    if (key === "federal_low") return "Statutorily exempted from Medicaid cuts: 145,593 ";
    return key;
}

// -----------------------------
// Highlight logic
// -----------------------------
function updateHighlight(stepKey) {
    currentStep = stepKey; // save state
    const circles = svg.selectAll("circle.unit");

    if (stepKey === "intro_allblue") { 
        circles
            .transition()
            .duration(600)
            .attr("fill", "#cccccc");
        d3.select("#annotation").text("Total enrollment in D.C. Medicaid: 272,249");
    }

    else if (stepKey === "all") {
        circles.attr("fill", d => colorByRisk[d.risk]);
        d3.select("#annotation").text("All groups");
    }
    else if (stepKey === "federal_combined") {
        circles.attr("fill", d => 
            (d.risk === "federal_work" || d.risk === "federal_uninsured") 
                ? "#ff8a8a" 
                : "#ccc"
        );
        d3.select("#annotation").text("Subject to federal work requirements: 98,656");
    }
    else if (stepKey === "federal_split") {
        const uninsuredIndexes = [];
        units.forEach((u, idx) => {
            if (u.risk === "federal_uninsured") uninsuredIndexes.push(idx);
        });
        const last72 = uninsuredIndexes.slice(-72);

        circles.attr("fill", (d, i) => {
            if (d.risk === "federal_work") return "#ff8a8a";
            if (d.risk === "federal_uninsured") {
                return last72.includes(i) ? "#750000" : "#ff8a8a";
            }
            return "#ccc";
        });
        d3.select("#annotation").text("Maybe uninsured in the next decade: 36,000");
    }

    else {
        circles.attr("fill", d => d.risk === stepKey ? colorByRisk[d.risk] : "#ccc");
        d3.select("#annotation").text(readableRisk(stepKey));
    }
}

// Init chart
renderChart();

// Scrollama setup
const scroller = scrollama();
scroller
    .setup({
        step: ".steps section",
        offset: 0.3,
        debug: false
    })
    .onStepEnter(res => {
        document.querySelectorAll(".steps section").forEach(s => s.classList.remove("is-active"));
        res.element.classList.add("is-active");
        const stepKey = res.element.getAttribute("data-step");
        updateHighlight(stepKey);
    });

// Handle resize
let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        renderChart();
        scroller.resize();
    }, 180);
});
