"use strict";

/* =====================================
   LAUNDRY QUEUE MANAGEMENT SYSTEM
   ===================================== */

// Find the HTML elements used by the application.

const orderForm = document.getElementById("orderForm");

const customerNameInput = document.getElementById("customerName");
const phoneInput = document.getElementById("phone");
const serviceTypeInput = document.getElementById("serviceType");
const itemCountInput = document.getElementById("itemCount");
const collectionDateInput = document.getElementById("collectionDate");
const notesInput = document.getElementById("notes");

const totalOrdersElement = document.getElementById("totalOrders");
const waitingOrdersElement = document.getElementById("waitingOrders");
const completedOrdersElement = document.getElementById("completedOrders");

const queueList = document.getElementById("queueList");
const queueCount = document.getElementById("queueCount");
const nextOrderText = document.getElementById("nextOrderText");

const completedTable = document.getElementById("completedTable");

const processButton = document.getElementById("processButton");
const clearHistoryButton = document.getElementById("clearHistoryButton");

const notification = document.getElementById("notification");


// =====================================
// APPLICATION DATA
// =====================================

// The waitingQueue stores orders waiting to be processed.
// The completedOrders array stores orders already processed.

let waitingQueue = [];
let completedOrders = [];

let nextOrderNumber = 1;
let notificationTimer;


// =====================================
// DATE SETUP
// =====================================

function getLocalDateString() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

const today = getLocalDateString();

collectionDateInput.min = today;


// =====================================
// SAVE AND LOAD DATA
// =====================================

function saveData() {
    try {
        const data = {
            waitingQueue: waitingQueue,
            completedOrders: completedOrders,
            nextOrderNumber: nextOrderNumber
        };

        localStorage.setItem(
            "laundryCareData",
            JSON.stringify(data)
        );

        return true;

    } catch (error) {
        console.error("Could not save application data:", error);
        return false;
    }
}


function loadData() {
    try {
        const savedData = localStorage.getItem("laundryCareData");

        if (!savedData) {
            return;
        }

        const data = JSON.parse(savedData);

        if (
            !data ||
            !Array.isArray(data.waitingQueue) ||
            !Array.isArray(data.completedOrders)
        ) {
            throw new Error("Saved data has an invalid format.");
        }

        waitingQueue = data.waitingQueue;
        completedOrders = data.completedOrders;

        const savedNextNumber = Number(data.nextOrderNumber);

        const highestExistingNumber = waitingQueue
            .concat(completedOrders)
            .reduce(function (highest, order) {
                const match = String(order.id || "").match(/(\d+)$/);

                if (match) {
                    return Math.max(highest, Number(match[1]));
                }

                return highest;
            }, 0);

        nextOrderNumber = Math.max(
            Number.isInteger(savedNextNumber) ? savedNextNumber : 1,
            highestExistingNumber + 1,
            1
        );

    } catch (error) {
        console.error("Could not load saved data:", error);

        waitingQueue = [];
        completedOrders = [];
        nextOrderNumber = 1;
    }
}


// =====================================
// NOTIFICATION MESSAGE
// =====================================

function showNotification(message, isError = false) {
    notification.textContent = message;

    notification.classList.toggle("error", isError);

    notification.hidden = false;

    clearTimeout(notificationTimer);

    notificationTimer = setTimeout(function () {
        notification.hidden = true;
    }, 4000);
}


// =====================================
// GENERATE ORDER ID
// =====================================

function generateOrderID() {
    const orderID = "LND-" +
        String(nextOrderNumber).padStart(4, "0");

    nextOrderNumber++;

    return orderID;
}


// =====================================
// ESCAPE TEXT BEFORE DISPLAYING IT
// =====================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return replacements[character];
    });
}


// =====================================
// REGISTER A NEW ORDER
// =====================================

orderForm.addEventListener("submit", function (event) {

    // Prevent the browser from reloading the page.
    event.preventDefault();

    const customerName = customerNameInput.value.trim();
    const phone = phoneInput.value.trim();
    const serviceType = serviceTypeInput.value;
    const itemCount = Number(itemCountInput.value);
    const collectionDate = collectionDateInput.value;
    const notes = notesInput.value.trim();


    // Check the customer's name.
    if (customerName === "") {
        showNotification(
            "Please enter the customer's name.",
            true
        );

        customerNameInput.focus();
        return;
    }


    // Check the service type.
    if (serviceType === "") {
        showNotification(
            "Please select a laundry service.",
            true
        );

        serviceTypeInput.focus();
        return;
    }


    // Check the number of items.
    if (
        itemCountInput.value.trim() === "" ||
        !Number.isInteger(itemCount) ||
        itemCount < 1 ||
        itemCount > 500
    ) {
        showNotification(
            "Enter a whole number of items between 1 and 500.",
            true
        );

        itemCountInput.focus();
        return;
    }


    // Check the collection date.
    if (!collectionDate) {
        showNotification(
            "Please select a collection date.",
            true
        );

        collectionDateInput.focus();
        return;
    }

    if (collectionDate < getLocalDateString()) {
        showNotification(
            "The collection date cannot be in the past.",
            true
        );

        collectionDateInput.focus();
        return;
    }


    // Create the new order.
    const order = {
        id: generateOrderID(),
        customerName: customerName,
        phone: phone,
        serviceType: serviceType,
        itemCount: itemCount,
        collectionDate: collectionDate,
        notes: notes,
        createdAt: new Date().toLocaleString()
    };


    // ENQUEUE:
    // Add the new order to the end of the waiting queue.
    waitingQueue.push(order);


    // Save and refresh the display.
    const saved = saveData();

    updateApplication();


    // Clear the form only after the order has been added.
    orderForm.reset();

    collectionDateInput.min = getLocalDateString();

    customerNameInput.focus();


    // Inform the user.
    if (saved) {
        showNotification(
            order.id + " has been added to the waiting queue."
        );
    } else {
        showNotification(
            order.id +
            " was added, but the browser could not save the data.",
            true
        );
    }

});


// =====================================
// DISPLAY WAITING QUEUE
// =====================================

function displayWaitingQueue() {

    // Remove the previous display.
    queueList.replaceChildren();


    // Show a message if the queue is empty.
    if (waitingQueue.length === 0) {

        const emptyMessage = document.createElement("div");

        emptyMessage.className = "empty-message";

        emptyMessage.textContent =
            "No orders are waiting. Register a new order to begin.";

        queueList.appendChild(emptyMessage);

        queueCount.textContent = "0 orders";

        nextOrderText.textContent = "No orders are waiting.";

        processButton.disabled = true;

        return;
    }


    // Display each order in its queue position.
    waitingQueue.forEach(function (order, index) {

        const queueItem = document.createElement("div");

        queueItem.className = "queue-item";

        queueItem.innerHTML = `
            <div>
                <span class="order-id">
                    ${escapeHTML(order.id)}
                </span>

                <h3>
                    ${escapeHTML(order.customerName)}
                </h3>

                <p>
                    Service: ${escapeHTML(order.serviceType)}
                </p>

                <p>
                    Number of items: ${escapeHTML(order.itemCount)}
                </p>

                <p>
                    Collection date:
                    ${escapeHTML(order.collectionDate)}
                </p>
            </div>

            <span class="queue-position">
                Position ${index + 1}
            </span>
        `;

        queueList.appendChild(queueItem);

    });


    // Update the queue count.
    queueCount.textContent =
        waitingQueue.length +
        (waitingQueue.length === 1 ? " order" : " orders");


    // Identify the next order to process.
    const nextOrder = waitingQueue[0];

    nextOrderText.textContent =
        nextOrder.id + " - " + nextOrder.customerName;


    // Enable processing when orders are waiting.
    processButton.disabled = false;

}


// =====================================
// PROCESS THE NEXT ORDER
// =====================================

processButton.addEventListener("click", function () {

    // Do nothing if the queue is empty.
    if (waitingQueue.length === 0) {
        showNotification(
            "There are no orders waiting to be processed.",
            true
        );

        updateApplication();
        return;
    }


    // DEQUEUE:
    // Remove the first order from the waiting queue.
    const order = waitingQueue.shift();


    // Mark the order as completed.
    order.status = "Completed";

    order.completedAt = new Date().toLocaleString();


    // Add it to the completed orders list.
    completedOrders.unshift(order);


    // Save the updated data.
    saveData();


    // Refresh the display.
    updateApplication();


    // Show a success message.
    showNotification(
        order.id + " for " +
        order.customerName +
        " has been processed successfully."
    );

});


// =====================================
// DISPLAY COMPLETED ORDERS
// =====================================

function displayCompletedOrders() {

    // Clear the previous table rows.
    completedTable.replaceChildren();


    // Display a message if there are no completed orders.
    if (completedOrders.length === 0) {

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent = "No completed orders yet.";
        cell.style.textAlign = "center";
        cell.style.padding = "25px";

        row.appendChild(cell);
        completedTable.appendChild(row);

        return;
    }


    // Display every completed order.
    completedOrders.forEach(function (order) {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(order.id)}</td>

            <td>${escapeHTML(order.customerName)}</td>

            <td>${escapeHTML(order.serviceType)}</td>

            <td>${escapeHTML(order.itemCount)}</td>

            <td>${escapeHTML(order.collectionDate)}</td>

            <td>
                <span class="status-completed">
                    Completed
                </span>
            </td>
        `;

        completedTable.appendChild(row);

    });

}


// =====================================
// UPDATE STATISTICS
// =====================================

function updateStatistics() {

    const totalOrders =
        waitingQueue.length + completedOrders.length;

    totalOrdersElement.textContent = totalOrders;

    waitingOrdersElement.textContent = waitingQueue.length;

    completedOrdersElement.textContent = completedOrders.length;

}


// =====================================
// UPDATE THE ENTIRE APPLICATION
// =====================================

function updateApplication() {

    updateStatistics();

    displayWaitingQueue();

    displayCompletedOrders();

}


// =====================================
// CLEAR COMPLETED ORDER HISTORY
// =====================================

clearHistoryButton.addEventListener("click", function () {

    if (completedOrders.length === 0) {
        showNotification(
            "There are no completed orders to clear.",
            true
        );

        return;
    }


    const confirmed = window.confirm(
        "Are you sure you want to clear all completed order history? " +
        "Waiting orders will not be affected."
    );


    if (!confirmed) {
        return;
    }


    // Remove completed orders only.
    completedOrders = [];


    // Save and update the application.
    saveData();

    updateApplication();


    showNotification(
        "Completed order history has been cleared."
    );

});


// =====================================
// START THE APPLICATION
// =====================================

loadData();

updateApplication();