let currentBill = null;

let people = [];

let assignments = {};


/* =========================
   INITIALIZE
   ========================= */

document.addEventListener("DOMContentLoaded", () => {

    const billImage =
        document.getElementById("billImage");

    if (billImage) {
        billImage.addEventListener(
            "change",
            handleFileSelection
        );
    }

    // Connect all ID-based buttons from index.html.
    const chooseImageButton =
        document.getElementById("chooseImageButton");

    if (chooseImageButton && billImage) {
        chooseImageButton.addEventListener(
            "click",
            () => billImage.click()
        );
    }

    const extractButton =
        document.getElementById("extractButton");

    if (extractButton) {
        extractButton.addEventListener(
            "click",
            extractBill
        );
    }

    const addItemButton =
        document.getElementById("addItemButton");

    if (addItemButton) {
        addItemButton.addEventListener(
            "click",
            addItem
        );
    }

    const resetButton =
        document.getElementById("resetButton");

    if (resetButton) {
        resetButton.addEventListener(
            "click",
            resetApp
        );
    }

    const continueButton =
        document.getElementById("continueButton");

    if (continueButton) {
        continueButton.addEventListener(
            "click",
            continueToSplit
        );
    }

});


/* =========================
   FILE SELECTION
   ========================= */

function handleFileSelection() {

    const fileInput =
        document.getElementById("billImage");

    const selectedFile =
        document.getElementById("selectedFile");

    const extractButton =
        document.getElementById("extractButton");

    const file = fileInput.files[0];

    if (!file) {

        selectedFile.textContent = "";

        extractButton.classList.add("hidden");

        return;
    }

    selectedFile.textContent =
        `Selected: ${file.name}`;

    extractButton.classList.remove("hidden");
}


/* =========================
   EXTRACT BILL
   ========================= */

async function extractBill() {

    const fileInput =
        document.getElementById("billImage");

    const status =
        document.getElementById("uploadStatus");

    const button =
        document.getElementById("extractButton");

    if (!fileInput.files.length) {

        status.textContent =
            "Please select a bill image.";

        status.className =
            "status-error";

        return;
    }

    const formData = new FormData();

    formData.append(
        "file",
        fileInput.files[0]
    );

    status.textContent =
        "AI is reading your bill...";

    status.className =
        "status-loading";

    button.disabled = true;

    button.textContent =
        "Extracting...";

    try {

        const response = await fetch(
            "/extract",
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );
        }

        const data =
            await response.json();

        if (!data.success || !data.bill) {

            throw new Error(
                data.message ||
                "Bill extraction failed."
            );
        }

        currentBill = data.bill;

        renderBill(currentBill);

        document
            .getElementById("uploadSection")
            .classList.add("hidden");

        document
            .getElementById("reviewSection")
            .classList.remove("hidden");

        status.textContent = "";

    } catch (error) {

        console.error(
            "Extraction error:",
            error
        );

        status.textContent =
            `Extraction failed: ${error.message}`;

        status.className =
            "status-error";

    } finally {

        button.disabled = false;

        button.textContent =
            "Extract Bill";
    }
}


/* =========================
   RENDER BILL
   ========================= */

function renderBill(bill) {

    const tbody =
        document.getElementById(
            "itemsTableBody"
        );

    tbody.innerHTML = "";

    bill.items.forEach(item => {

        addItemRow(item);

    });

    updateItemCount();

    document.getElementById(
        "subtotal"
    ).value = bill.subtotal;

    document.getElementById(
        "discount"
    ).value = bill.discount;

    document.getElementById(
        "tax"
    ).value = bill.tax;

    document.getElementById(
        "serviceCharge"
    ).value = bill.service_charge;

    document.getElementById(
        "total"
    ).value = bill.total;

    renderTotalVerification(bill);
}


/* =========================
   TOTAL VERIFICATION
   ========================= */

function renderTotalVerification(bill) {

    const container =
        document.getElementById(
            "totalVerification"
        );

    if (!container) {
        return;
    }

    const subtotal =
        Number(bill.subtotal) || 0;

    const discount =
        Number(bill.discount) || 0;

    const tax =
        Number(bill.tax) || 0;

    const serviceCharge =
        Number(bill.service_charge) || 0;

    const printedTotal =
        Number(bill.total) || 0;

    const calculatedTotal =
        subtotal -
        discount +
        tax +
        serviceCharge;

    const difference =
        calculatedTotal -
        printedTotal;

    if (Math.abs(difference) > 0.01) {

        container.innerHTML = `
            <div class="warning-box">
                <strong>⚠️ Total discrepancy detected</strong>

                <div>
                    Printed total:
                    ₹${printedTotal.toFixed(2)}
                </div>

                <div>
                    Calculated total:
                    ₹${calculatedTotal.toFixed(2)}
                </div>

                <div>
                    Difference:
                    ₹${Math.abs(difference).toFixed(2)}
                </div>

                <small>
                    Please verify the printed bill before splitting.
                </small>
            </div>
        `;

    } else {

        container.innerHTML = `
            <div class="success-box">
                <strong>✓ Bill total verified</strong>
                <div>
                    Calculated total:
                    ₹${calculatedTotal.toFixed(2)}
                </div>
            </div>
        `;
    }
}


/* =========================
   ADD ITEM ROW
   ========================= */

function addItemRow(item = {}) {

    const tbody =
        document.getElementById(
            "itemsTableBody"
        );

    const row =
        document.createElement("tr");

    const name = item.name || "";

    const quantity =
        item.quantity ?? 1;

    const unitPrice =
        item.unit_price ?? 0;

    const totalPrice =
        item.total_price ?? 0;

    const confidence =
        Math.min(
            item.name_confidence ?? 0,
            item.quantity_confidence ?? 0,
            item.price_confidence ?? 0
        );

    row.innerHTML = `
        <td>
            <input
                type="text"
                class="item-name"
                value="${escapeHtml(name)}"
            >
        </td>

        <td>
            <input
                type="number"
                class="item-quantity"
                value="${quantity}"
                min="0"
                step="0.01"
            >
        </td>

        <td>
            <input
                type="number"
                class="item-price"
                value="${unitPrice}"
                min="0"
                step="0.01"
            >
        </td>

        <td>
            <input
                type="number"
                class="item-total"
                value="${totalPrice}"
                min="0"
                step="0.01"
            >
        </td>

        <td>
            ${confidenceBadge(confidence)}
        </td>

        <td>
            <button
                type="button"
                class="delete-button"
                title="Remove item"
            >
                ✕
            </button>
        </td>
    `;

    const deleteButton =
        row.querySelector(
            ".delete-button"
        );

    deleteButton.addEventListener(
        "click",
        () => {

            row.remove();

            updateItemCount();
        }
    );

    tbody.appendChild(row);
}


/* =========================
   ADD ITEM
   ========================= */

function addItem() {

    addItemRow({
        name: "",
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        name_confidence: 0,
        quantity_confidence: 0,
        price_confidence: 0
    });

    updateItemCount();
}


/* =========================
   ITEM COUNT
   ========================= */

function updateItemCount() {

    const count =
        document.querySelectorAll(
            "#itemsTableBody tr"
        ).length;

    document.getElementById(
        "itemCount"
    ).textContent =
        `${count} ${
            count === 1
                ? "item"
                : "items"
        }`;
}


/* =========================
   CONFIDENCE
   ========================= */

function confidenceBadge(value) {

    const percentage =
        Math.round(value * 100);

    let className =
        "confidence-high";

    if (percentage < 70) {

        className =
            "confidence-low";

    } else if (percentage < 90) {

        className =
            "confidence-medium";
    }

    return `
        <span class="confidence ${className}">
            ${percentage}%
        </span>
    `;
}


/* =========================
   COLLECT REVIEWED BILL
   ========================= */

function collectBillFromUI() {

    const rows =
        document.querySelectorAll(
            "#itemsTableBody tr"
        );

    const items = [];

    for (const row of rows) {

        const name =
            row.querySelector(
                ".item-name"
            ).value.trim();

        const quantity =
            parseFloat(
                row.querySelector(
                    ".item-quantity"
                ).value
            );

        const unitPrice =
            parseFloat(
                row.querySelector(
                    ".item-price"
                ).value
            );

        const totalPrice =
            parseFloat(
                row.querySelector(
                    ".item-total"
                ).value
            );

        if (!name) {

            alert(
                "Every item must have a name."
            );

            return null;
        }

        if (
            isNaN(quantity) ||
            quantity <= 0
        ) {

            alert(
                `Invalid quantity for "${name}".`
            );

            return null;
        }

        if (
            isNaN(unitPrice) ||
            unitPrice < 0
        ) {

            alert(
                `Invalid unit price for "${name}".`
            );

            return null;
        }

        if (
            isNaN(totalPrice) ||
            totalPrice < 0
        ) {

            alert(
                `Invalid total price for "${name}".`
            );

            return null;
        }

        items.push({
            name,
            quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            name_confidence: 1,
            quantity_confidence: 1,
            price_confidence: 1
        });
    }

    if (items.length === 0) {

        alert(
            "Please add at least one item."
        );

        return null;
    }

    return {

        items,

        subtotal: parseFloat(
            document.getElementById(
                "subtotal"
            ).value
        ) || 0,

        discount: parseFloat(
            document.getElementById(
                "discount"
            ).value
        ) || 0,

        tax: parseFloat(
            document.getElementById(
                "tax"
            ).value
        ) || 0,

        service_charge: parseFloat(
            document.getElementById(
                "serviceCharge"
            ).value
        ) || 0,

        total: parseFloat(
            document.getElementById(
                "total"
            ).value
        ) || 0
    };
}


/* =========================
   CONTINUE TO SPLIT
   ========================= */

function continueToSplit() {

    const bill =
        collectBillFromUI();

    if (!bill) {
        return;
    }

    currentBill = bill;

    people = [];

    assignments = {};

    document.getElementById(
        "peopleList"
    ).innerHTML = "";

    document.getElementById(
        "personName"
    ).value = "";

    document
        .getElementById("reviewSection")
        .classList.add("hidden");

    document
        .getElementById("assignmentSection")
        .classList.remove("hidden");

    renderAssignments();
}


/* =========================
   ADD PERSON
   ========================= */

function addPerson() {

    const input =
        document.getElementById(
            "personName"
        );

    const name =
        input.value.trim();

    if (!name) {

        alert(
            "Please enter a person's name."
        );

        return;
    }

    if (
        people.some(
            person =>
                person.toLowerCase() ===
                name.toLowerCase()
        )
    ) {

        alert(
            "That person has already been added."
        );

        return;
    }

    people.push(name);

    input.value = "";

    renderPeople();

    renderAssignments();
}


/* =========================
   RENDER PEOPLE
   ========================= */

function renderPeople() {

    const container =
        document.getElementById(
            "peopleList"
        );

    container.innerHTML = "";

    people.forEach(
        (person, index) => {

            const chip =
                document.createElement(
                    "div"
                );

            chip.className =
                "person-chip";

            chip.innerHTML = `
                <span>
                    ${escapeHtml(person)}
                </span>

                <button
                    type="button"
                    class="remove-person"
                    title="Remove person"
                >
                    ✕
                </button>
            `;

            chip
                .querySelector(
                    ".remove-person"
                )
                .addEventListener(
                    "click",
                    () => {

                        people.splice(
                            index,
                            1
                        );

                        assignments = {};

                        renderPeople();

                        renderAssignments();
                    }
                );

            container.appendChild(
                chip
            );
        }
    );

    document.getElementById(
        "peopleCount"
    ).textContent =
        `${people.length} ${
            people.length === 1
                ? "person"
                : "people"
        }`;
}


/* =========================
   RENDER ASSIGNMENTS
   ========================= */

function renderAssignments() {

    const container =
        document.getElementById(
            "assignmentList"
        );

    container.innerHTML = "";

    if (people.length === 0) {

        container.innerHTML = `
            <p class="muted">
                Add at least one person to
                start assigning items.
            </p>
        `;

        return;
    }

    currentBill.items.forEach(
        (item, itemIndex) => {

            const itemBox =
                document.createElement("div");

            itemBox.className =
                "assignment-item";

            itemBox.dataset.itemIndex =
                itemIndex;

            itemBox.innerHTML = `

                <div class="assignment-item-header">

                    <div>
                        <div class="assignment-item-name">
                            ${escapeHtml(item.name)}
                        </div>

                        <div class="muted small-text">
                            ${item.quantity} unit(s) available
                        </div>
                    </div>

                    <span class="assignment-item-price">
                        ₹${Number(
                            item.total_price
                        ).toFixed(2)}
                    </span>

                </div>

                <div class="assignment-people">
                </div>

                <button
                    type="button"
                    class="secondary-button equal-split-button"
                >
                    Equal Split
                </button>

                <div class="assignment-total invalid">
                    Consumed: 0 / ${item.quantity}
                </div>
            `;

            const peopleContainer =
                itemBox.querySelector(
                    ".assignment-people"
                );

            people.forEach(
                person => {

                    const row =
                        document.createElement(
                            "div"
                        );

                    row.className =
                        "assignment-person";

                    row.innerHTML = `

                        <span class="assignment-person-name">
                            ${escapeHtml(person)}
                        </span>

                        <div class="quantity-control">

                            <button
                                type="button"
                                class="quantity-button minus"
                            >
                                −
                            </button>

                            <input
                                type="number"
                                class="quantity-value"
                                value="0"
                                min="0"
                                max="${item.quantity}"
                                step="0.01"
                            >

                            <button
                                type="button"
                                class="quantity-button plus"
                            >
                                +
                            </button>

                        </div>

                        <span class="quantity-amount">
                            ₹0.00
                        </span>
                    `;

                    const minusButton =
                        row.querySelector(
                            ".minus"
                        );

                    const plusButton =
                        row.querySelector(
                            ".plus"
                        );

                    const quantityInput =
                        row.querySelector(
                            ".quantity-value"
                        );

                    minusButton.addEventListener(
                        "click",
                        () => {

                            changeQuantity(
                                quantityInput,
                                -0.5,
                                item.quantity
                            );

                            updateAssignmentTotal(
                                itemBox,
                                item
                            );
                        }
                    );

                    plusButton.addEventListener(
                        "click",
                        () => {

                            changeQuantity(
                                quantityInput,
                                0.5,
                                item.quantity
                            );

                            updateAssignmentTotal(
                                itemBox,
                                item
                            );
                        }
                    );

                    quantityInput.addEventListener(
                        "input",
                        () => {

                            let value =
                                parseFloat(
                                    quantityInput.value
                                ) || 0;

                            value = Math.max(
                                0,
                                Math.min(
                                    item.quantity,
                                    value
                                )
                            );

                            quantityInput.value =
                                value;

                            updateAssignmentTotal(
                                itemBox,
                                item
                            );
                        }
                    );

                    peopleContainer.appendChild(
                        row
                    );
                }
            );

            const equalButton =
                itemBox.querySelector(
                    ".equal-split-button"
                );

            equalButton.addEventListener(
                "click",
                () => {

                    equalSplitItem(
                        itemBox,
                        item
                    );
                }
            );

            container.appendChild(
                itemBox
            );
        }
    );
}


function changeQuantity(
    input,
    change,
    maxQuantity
) {

    let value =
        parseFloat(input.value) || 0;

    value += change;

    value = Math.max(
        0,
        Math.min(
            maxQuantity,
            value
        )
    );

    input.value =
        Number(value.toFixed(2));
}


function equalSplitItem(
    itemBox,
    item
) {

    const inputs =
        itemBox.querySelectorAll(
            ".quantity-value"
        );

    const personCount =
        inputs.length;

    if (personCount === 0) {
        return;
    }

    /*
     * Split in hundredths so the displayed quantities
     * always add up exactly to the item's quantity.
     *
     * Example:
     * 1 item / 3 people
     * -> 0.33 + 0.33 + 0.34 = 1.00
     */

    const totalHundredths =
        Math.round(
            Number(item.quantity) * 100
        );

    const baseHundredths =
        Math.floor(
            totalHundredths / personCount
        );

    let remainder =
        totalHundredths % personCount;

    inputs.forEach(
        input => {

            let quantity =
                baseHundredths;

            if (remainder > 0) {
                quantity += 1;
                remainder -= 1;
            }

            input.value =
                (quantity / 100).toFixed(2);
        }
    );

    updateAssignmentTotal(
        itemBox,
        item
    );
}


function updateAssignmentTotal(
    itemBox,
    item
) {

    const inputs =
        itemBox.querySelectorAll(
            ".quantity-value"
        );

    let consumed =
        0;

    inputs.forEach(
        input => {

            consumed +=
                parseFloat(
                    input.value
                ) || 0;
        }
    );

    consumed =
        Number(
            consumed.toFixed(2)
        );

    const amountPerUnit =
        Number(item.total_price)
        / Number(item.quantity);

    const amount =
        consumed * amountPerUnit;

    const totalElement =
        itemBox.querySelector(
            ".assignment-total"
        );

    const amountElements =
        itemBox.querySelectorAll(
            ".quantity-amount"
        );

    inputs.forEach(
        (input, index) => {

            const quantity =
                parseFloat(
                    input.value
                ) || 0;

            const personAmount =
                quantity * amountPerUnit;

            amountElements[index]
                .textContent =
                `₹${personAmount.toFixed(2)}`;
        }
    );

    totalElement.innerHTML = `
        <span>
            Consumed:
            ${consumed} / ${item.quantity}
        </span>

        <span>
            ₹${amount.toFixed(2)}
        </span>
    `;

    if (
        Math.abs(
            consumed -
            Number(item.quantity)
        ) < 0.01
    ) {

        totalElement.className =
            "assignment-total valid";

    } else {

        totalElement.className =
            "assignment-total invalid";
    }
}

/* =========================
   COLLECT ASSIGNMENTS
   ========================= */

function collectAssignments() {

    const itemBoxes =
        document.querySelectorAll(
            ".assignment-item"
        );

    const result = {};

    for (
        let itemIndex = 0;
        itemIndex < itemBoxes.length;
        itemIndex++
    ) {

        const item =
            currentBill.items[itemIndex];

        const itemBox =
            itemBoxes[itemIndex];

        const inputs =
            itemBox.querySelectorAll(
                ".quantity-value"
            );

        const assignment = {};

        let consumedTotal = 0;

        inputs.forEach(
            (input, personIndex) => {

                const quantity =
                    parseFloat(
                        input.value
                    ) || 0;

                if (quantity > 0) {

                    assignment[
                        people[personIndex]
                    ] = quantity;

                    consumedTotal +=
                        quantity;
                }
            }
        );

        consumedTotal =
            Number(
                consumedTotal.toFixed(2)
            );

        const requiredQuantity =
            Number(item.quantity);

        if (
            Math.abs(
                consumedTotal -
                requiredQuantity
            ) > 0.01
        ) {

            alert(
                `"${item.name}" requires ` +
                `${requiredQuantity} ` +
                `unit(s) to be allocated.\n\n` +
                `Currently allocated: ` +
                `${consumedTotal}`
            );

            return null;
        }

        if (
            Object.keys(
                assignment
            ).length === 0
        ) {

            alert(
                `Please assign "${item.name}" ` +
                `to at least one person.`
            );

            return null;
        }

        result[item.name] =
            assignment;
    }

    return result;
}


/* =========================
   CALCULATE SPLIT
   ========================= */

async function calculateSplit() {

    if (people.length === 0) {

        alert(
            "Please add at least one person."
        );

        return;
    }

    const collectedAssignments =
        collectAssignments();

    if (!collectedAssignments) {
        return;
    }

    assignments =
        collectedAssignments;

    try {

        const response =
            await fetch(
                "/split",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        bill: currentBill,
                        people: people,
                        assignments:
                            assignments
                    })
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to split bill."
            );
        }

        renderResults(
            data.results.people,
            data.results
        );

        document
            .getElementById(
                "assignmentSection"
            )
            .classList.add("hidden");

        document
            .getElementById(
                "resultsSection"
            )
            .classList.remove("hidden");

    } catch (error) {

        console.error(
            "Split error:",
            error
        );

        alert(
            `Split failed: ${error.message}`
        );
    }
}


/* =========================
   RENDER RESULTS
   ========================= */

function renderResults(results, verification = {}) {

    const container =
        document.getElementById(
            "resultsList"
        );

    container.innerHTML = "";

    // =========================
    // FINAL VERIFICATION
    // =========================

    const calculated =
        Number(
            verification.calculated_bill_total || 0
        );

    const assigned =
        Number(
            verification.assigned_total || 0
        );

    const difference =
        Number(
            verification.difference || 0
        );

    const verificationBox =
        document.createElement("div");

    verificationBox.className =
        Math.abs(difference) <= 0.01
            ? "success-box"
            : "warning-box";

    verificationBox.innerHTML = `
        <strong>
            ${
                Math.abs(difference) <= 0.01
                    ? "✓ Split Verified"
                    : "⚠ Split Discrepancy"
            }
        </strong>

        <div>
            Calculated bill total:
            ₹${calculated.toFixed(2)}
        </div>

        <div>
            Total assigned:
            ₹${assigned.toFixed(2)}
        </div>

        ${
            Math.abs(difference) > 0.01
                ? `
                    <div>
                        Difference:
                        ₹${Math.abs(difference).toFixed(2)}
                    </div>
                `
                : ""
        }
    `;

    container.appendChild(
        verificationBox
    );


    // =========================
    // PERSON RESULTS
    // =========================

    Object.entries(results || {}).forEach(
        ([person, details]) => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "result-card";

            const items =
                Array.isArray(details.items)
                    ? details.items
                    : [];

            const itemsHtml =
                items.map(
                    item => `
                        <div class="result-item">

                            <span>
                                ${escapeHtml(
                                    item.name
                                )}
                                × ${Number(
                                    item.quantity
                                )}
                            </span>

                            <span>
                                ₹${Number(
                                    item.amount
                                ).toFixed(2)}
                            </span>

                        </div>
                    `
                ).join("");

            card.innerHTML = `
                <div class="result-person">
                    ${escapeHtml(person)}
                </div>

                <div class="result-items">
                    ${itemsHtml}
                </div>

                <div class="result-row">
                    <span>Subtotal</span>
                    <span>
                        ₹${Number(
                            details.subtotal
                        ).toFixed(2)}
                    </span>
                </div>

                <div class="result-row">
                    <span>Discount</span>
                    <span>
                        -₹${Number(
                            details.discount
                        ).toFixed(2)}
                    </span>
                </div>

                <div class="result-row">
                    <span>GST / Tax</span>
                    <span>
                        ₹${Number(
                            details.tax
                        ).toFixed(2)}
                    </span>
                </div>

                <div class="result-row">
                    <span>Service Charge</span>
                    <span>
                        ₹${Number(
                            details.service_charge
                        ).toFixed(2)}
                    </span>
                </div>

                <div class="result-total">
                    <span>Total</span>

                    <span>
                        ₹${Number(
                            details.total
                        ).toFixed(2)}
                    </span>
                </div>
            `;

            container.appendChild(card);
        }
    );
}


/* =========================
   BACK TO REVIEW
   ========================= */

function backToReview() {

    document
        .getElementById(
            "assignmentSection"
        )
        .classList.add("hidden");

    document
        .getElementById(
            "reviewSection"
        )
        .classList.remove("hidden");
}


/* =========================
   RESET
   ========================= */

function resetApp() {

    currentBill = null;

    people = [];

    assignments = {};

    document
        .getElementById(
            "reviewSection"
        )
        .classList.add("hidden");

    document
        .getElementById(
            "assignmentSection"
        )
        .classList.add("hidden");

    document
        .getElementById(
            "resultsSection"
        )
        .classList.add("hidden");

    document
        .getElementById(
            "uploadSection"
        )
        .classList.remove("hidden");

    document.getElementById(
        "billImage"
    ).value = "";

    document.getElementById(
        "selectedFile"
    ).textContent = "";

    document
        .getElementById(
            "extractButton"
        )
        .classList.add("hidden");

    document.getElementById(
        "uploadStatus"
    ).textContent = "";

    document.getElementById(
        "itemsTableBody"
    ).innerHTML = "";

    document.getElementById(
        "peopleList"
    ).innerHTML = "";

    document.getElementById(
        "assignmentList"
    ).innerHTML = "";

    document.getElementById(
        "resultsList"
    ).innerHTML = "";

    updateItemCount();
}


/* =========================
   HTML ESCAPE
   ========================= */

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}