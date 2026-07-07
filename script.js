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

const formatCurrencyValue = (value) => currency.format(value || 0);

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
    fillCostFormatted: formatCurrencyValue(fillCost),
    markupTotal,
    markupTotalFormatted: formatCurrencyValue(markupTotal),
    freight,
    freightFormatted: formatCurrencyValue(freight),
    taxTotal,
    taxTotalFormatted: formatCurrencyValue(taxTotal),
    total: subtotal,
    totalFormatted: formatCurrencyValue(subtotal),
    range: `${currency.format(lowRange)} - ${currency.format(highRange)}`,
    bundles: bundleCount,
  };
}

async function captureLead() {
  if (!estimateForm) return;
  const estimate = calculateEstimate();
  const data = new FormData(estimateForm);
  const lead = {
    createdAt: new Date().toISOString(),
    website: data.get("website") || "",
    contactName: data.get("contactName") || "",
    company: data.get("company") || "",
    email: data.get("leadEmail") || "",
    phone: data.get("leadPhone") || "",
    jobLocation: data.get("jobLocation") || "",
    projectName: data.get("projectName") || "",
    productType: data.get("productType") || "",
    length: data.get("length") || "",
    height: data.get("height") || "",
    openings: data.get("openings") || "",
    blockSize: data.get("blockSize") || "",
    coreThickness: data.get("coreThickness") || "",
  };

  const status = estimateForm.querySelector(".lead-status");
  const button = estimateForm.querySelector(".quote-submit");
  if (status) {
    status.textContent = "Sending your quote request...";
  }
  if (button) {
    button.disabled = true;
  }

  try {
    const response = await fetch("./quote-request.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lead, estimate }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.message || "Unable to send the quote request right now.");
    }

    try {
      const leads = JSON.parse(window.localStorage?.getItem("legacyBlockLeads") || "[]");
      leads.unshift({ ...lead, estimate });
      window.localStorage?.setItem("legacyBlockLeads", JSON.stringify(leads.slice(0, 25)));
    } catch {
      // Email delivery is the source of truth; local storage is only a visitor-side convenience.
    }

    if (status) {
      status.textContent =
        result.message || "Thanks. Your quote request has been sent to Legacy Block.";
    }
    estimateForm.reset();
    calculateEstimate();
  } catch {
    if (status) {
      status.textContent =
        "Sorry, your request could not be sent. Please call Legacy Block or try again in a moment.";
    }
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

if (estimateForm) {
  estimateForm.addEventListener("input", calculateEstimate);
  estimateForm.addEventListener("change", calculateEstimate);
  estimateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    captureLead();
  });
  calculateEstimate();
}
