const form = document.querySelector(".demo-form");

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = form.querySelector(".form-status");
    const name = new FormData(form).get("firstName") || "there";

    status.textContent = `Thanks, ${name}. Add your project details below and Legacy Block can follow up with pricing.`;
    document.getElementById("legacy-estimator")?.scrollIntoView({ behavior: "smooth" });
    form.reset();
  });
}

const estimateForm = document.querySelector(".estimate-form");
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const getNumber = (data, key) => {
  const value = Number.parseFloat(data.get(key));
  return Number.isFinite(value) ? value : 0;
};

const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
};

function calculateEstimate() {
  if (!estimateForm) return;

  const data = new FormData(estimateForm);
  const productType = data.get("productType");
  document.querySelectorAll(".cmu-fields").forEach((element) => {
    element.hidden = productType !== "cmu";
  });
  document.querySelectorAll(".cicf-fields").forEach((element) => {
    element.hidden = productType !== "cicf";
  });
  const length = getNumber(data, "length");
  const height = getNumber(data, "height");
  const openings = getNumber(data, "openings");
  const waste = getNumber(data, "waste") / 100;
  const markupRate = getNumber(data, "markup") / 100;
  const taxRate = getNumber(data, "taxRate") / 100;
  const rangeRate = getNumber(data, "range") / 100;
  const unitPrice = getNumber(data, "unitPrice");
  const freight = getNumber(data, "freight");
  const grossArea = length * height;
  const netWallArea = Math.max(grossArea - openings, 0);
  const wasteMultiplier = 1 + waste;

  let primaryLabel = "CMU units";
  let supportLabel = "Mortar bags";
  let fillLabel = "Grout allowance";
  let primaryUnits = 0;
  let supportUnits = 0;
  let fillCost = 0;
  let productCost = 0;
  let supportCost = 0;
  let bundleCount = 0;
  let fillDescription = "";

  if (productType === "cicf") {
    const formArea = Math.max(getNumber(data, "formArea"), 1);
    const coreThicknessFeet = getNumber(data, "coreThickness") / 12;
    const concretePrice = getNumber(data, "concretePrice");
    const concreteYards = (netWallArea * coreThicknessFeet) / 27;
    const bracingAllowance = netWallArea * 0.38;

    primaryLabel = "CICF forms";
    supportLabel = "Concrete yd³";
    fillLabel = "Bracing allowance";
    primaryUnits = Math.ceil((netWallArea / formArea) * wasteMultiplier);
    supportUnits = Math.ceil(concreteYards * 10) / 10;
    fillCost = bracingAllowance;
    productCost = primaryUnits * unitPrice;
    supportCost = supportUnits * concretePrice;
    bundleCount = Math.ceil(primaryUnits / 24);
    fillDescription = currency.format(fillCost);
  } else {
    const blockFaceArea = data.get("blockSize") === "12x8x16" ? 0.889 : 0.889;
    const mortarPrice = getNumber(data, "mortarPrice");
    const groutRate = getNumber(data, "groutRate");

    primaryUnits = Math.ceil((netWallArea / blockFaceArea) * wasteMultiplier);
    supportUnits = Math.ceil(primaryUnits / 100);
    fillCost = netWallArea * groutRate;
    productCost = primaryUnits * unitPrice;
    supportCost = supportUnits * mortarPrice;
    bundleCount = Math.ceil(primaryUnits / 90);
    fillDescription = currency.format(fillCost);
  }

  const materialsSubtotal = productCost + supportCost + fillCost;
  const markupTotal = materialsSubtotal * markupRate;
  const taxableSubtotal = materialsSubtotal + markupTotal + freight;
  const taxTotal = taxableSubtotal * taxRate;
  const subtotal = taxableSubtotal + taxTotal;
  const lowRange = subtotal * (1 - rangeRate);
  const highRange = subtotal * (1 + rangeRate);

  setText("estimateTotal", currency.format(subtotal));
  setText("estimateRange", `Range: ${currency.format(lowRange)} - ${currency.format(highRange)}`);
  setText("primaryLabel", primaryLabel);
  setText("primaryUnits", whole.format(primaryUnits));
  setText("netArea", `${whole.format(netWallArea)} sq ft`);
  setText("supportLabel", supportLabel);
  setText("supportUnits", productType === "cicf" ? supportUnits.toFixed(1) : whole.format(supportUnits));
  setText("fillLabel", fillLabel);
  setText("fillUnits", fillDescription);
  setText("markupTotal", currency.format(markupTotal));
  setText("deliveryTotal", currency.format(freight));
  setText("taxTotal", currency.format(taxTotal));
  setText("pallets", whole.format(bundleCount));

  return {
    productType,
    netWallArea,
    primaryLabel,
    primaryUnits,
    supportLabel,
    supportUnits,
    fillLabel,
    fillCost,
    markupTotal,
    freight,
    taxTotal,
    total: subtotal,
    range: `${currency.format(lowRange)} - ${currency.format(highRange)}`,
    bundles: bundleCount,
  };
}

function captureLead() {
  if (!estimateForm) return;
  const estimate = calculateEstimate();
  const data = new FormData(estimateForm);
  const lead = {
    createdAt: new Date().toISOString(),
    contactName: data.get("contactName") || "",
    company: data.get("company") || "",
    email: data.get("leadEmail") || "",
    phone: data.get("leadPhone") || "",
    jobLocation: data.get("jobLocation") || "",
    projectName: data.get("projectName") || "",
    estimate,
  };
  try {
    const leads = JSON.parse(window.localStorage?.getItem("legacyBlockLeads") || "[]");
    leads.unshift(lead);
    window.localStorage?.setItem("legacyBlockLeads", JSON.stringify(leads.slice(0, 25)));
  } catch {
    // Some embedded browser contexts disable local storage; the visible confirmation still matters.
  }

  const status = estimateForm.querySelector(".lead-status");
  if (status) {
    status.textContent =
      "Thanks. Your quote request is ready for Legacy Block to review and follow up with final pricing.";
  }
}

if (estimateForm) {
  estimateForm.addEventListener("input", calculateEstimate);
  estimateForm.addEventListener("change", calculateEstimate);
  estimateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    captureLead();
  });
  estimateForm.querySelector(".quote-submit")?.addEventListener("click", captureLead);
  calculateEstimate();
}
